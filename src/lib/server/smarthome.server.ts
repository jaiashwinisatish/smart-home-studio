import { getDb } from "./db.server";
import { devicePowerWatts, simulatedTemperature } from "@/lib/simulation";
import type {
  AutomationRule,
  Device,
  DashboardSummary,
  DeviceType,
  ParsedCommand,
} from "@/types/smart-home";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const DEVICE_SELECT = "*, room:rooms(id, name, slug)";

function withPower(d: Device): Device {
  return { ...d, power_watts: devicePowerWatts(d) };
}

export async function listRooms() {
  const db = getDb();
  const { data, error } = await db.from("rooms").select("*").order("created_at");
  if (error) throw new ApiError(error.message, 500);
  return data;
}

export async function listDevices(roomSlug?: string): Promise<Device[]> {
  const db = getDb();
  let query = db.from("devices").select(DEVICE_SELECT).order("created_at");
  const { data, error } = await query;
  if (error) throw new ApiError(error.message, 500);
  const devices = (data as unknown as Device[]).map(withPower);
  return roomSlug ? devices.filter((d) => d.room?.slug === roomSlug) : devices;
}

export async function getDevice(idOrSlug: string): Promise<Device> {
  const db = getDb();
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const { data, error } = await db
    .from("devices")
    .select(DEVICE_SELECT)
    .eq(isUuid ? "id" : "slug", idOrSlug)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError(`Unknown device: ${idOrSlug}`, 404);
  return withPower(data as unknown as Device);
}

export interface ControlInput {
  action: "ON" | "OFF" | "TOGGLE" | "SET_SPEED" | "SET_TEMP";
  value?: number;
}

export async function controlDevice(idOrSlug: string, input: ControlInput): Promise<Device> {
  const device = await getDevice(idOrSlug);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  switch (input.action) {
    case "ON":
      patch["status"] = true;
      break;
    case "OFF":
      patch["status"] = false;
      break;
    case "TOGGLE":
      patch["status"] = !device.status;
      break;
    case "SET_SPEED": {
      if (device.type !== "fan") throw new ApiError(`${device.name} has no fan speed.`);
      const speed = Number(input.value);
      if (!Number.isInteger(speed) || speed < 1 || speed > 5)
        throw new ApiError("Fan speed must be a whole number between 1 and 5.");
      patch["fan_speed"] = speed;
      patch["status"] = true;
      break;
    }
    case "SET_TEMP": {
      if (device.type !== "ac") throw new ApiError(`${device.name} has no temperature control.`);
      const temp = Number(input.value);
      if (!Number.isInteger(temp) || temp < 16 || temp > 30)
        throw new ApiError("Temperature must be between 16°C and 30°C.");
      patch["temperature"] = temp;
      patch["status"] = true;
      break;
    }
    default:
      throw new ApiError(`Unsupported action: ${String(input.action)}`);
  }

  const db = getDb();
  const { data, error } = await db
    .from("devices")
    .update(patch)
    .eq("id", device.id)
    .select(DEVICE_SELECT)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Could not update the device.", 500);

  const updated = withPower(data as unknown as Device);
  await db.from("device_states").insert({
    device_id: updated.id,
    status: updated.status,
    fan_speed: updated.fan_speed,
    temperature: updated.temperature,
    power_watts: updated.power_watts ?? 0,
  });
  return updated;
}

export async function logCommand(entry: {
  command: string;
  source?: string;
  parsed_action?: ParsedCommand | null;
  result: string;
  success: boolean;
}) {
  const db = getDb();
  await db.from("command_history").insert({
    command: entry.command,
    source: entry.source ?? "ui",
    parsed_action: (entry.parsed_action ?? null) as never,
    result: entry.result,
    success: entry.success,
  });
}

export async function listHistory(limit = 50) {
  const db = getDb();
  const { data, error } = await db
    .from("command_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new ApiError(error.message, 500);
  return data;
}

export async function listRules(): Promise<AutomationRule[]> {
  const db = getDb();
  const { data, error } = await db
    .from("automation_rules")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new ApiError(error.message, 500);
  return data as unknown as AutomationRule[];
}

export async function createRule(rule: Partial<AutomationRule>) {
  if (!rule.name || !rule.condition || !rule.action)
    throw new ApiError("A rule needs a name, a condition and an action.");
  const db = getDb();
  const { data, error } = await db
    .from("automation_rules")
    .insert({
      name: rule.name,
      condition: rule.condition as never,
      action: rule.action as never,
      enabled: rule.enabled ?? true,
    })
    .select("*")
    .maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  return data;
}

export async function updateRule(id: string, patch: Partial<AutomationRule>) {
  const db = getDb();
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body["name"] = patch.name;
  if (patch.condition !== undefined) body["condition"] = patch.condition;
  if (patch.action !== undefined) body["action"] = patch.action;
  if (patch.enabled !== undefined) body["enabled"] = patch.enabled;
  const { data, error } = await db
    .from("automation_rules")
    .update(body)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (!data) throw new ApiError("Rule not found.", 404);
  return data;
}

export async function deleteRule(id: string) {
  const db = getDb();
  const { error } = await db.from("automation_rules").delete().eq("id", id);
  if (error) throw new ApiError(error.message, 500);
  return { ok: true };
}

/** Apply a parsed command (used by voice / text commands and automations). */
export async function executeParsed(parsed: ParsedCommand): Promise<string> {
  if (parsed.intent === "CONTROL_GROUP" && parsed.scope) {
    const devices = await listDevices();
    const targets = devices.filter((d) =>
      parsed.scope === "all_lights"
        ? d.type === "light"
        : parsed.scope === "all_fans"
          ? d.type === "fan"
          : true,
    );
    if (targets.length === 0) throw new ApiError("No matching devices found.");
    for (const device of targets) {
      await controlDevice(device.id, {
        action: parsed.action === "OFF" ? "OFF" : "ON",
        ...(parsed.parameters?.value !== undefined
          ? { value: parsed.parameters.value }
          : {}),
      });
    }
    return `${targets.length} device(s) turned ${parsed.action === "OFF" ? "OFF" : "ON"}.`;
  }

  if (parsed.intent === "CONTROL_DEVICE" && parsed.device && parsed.action) {
    const device = await controlDevice(parsed.device, {
      action: parsed.action,
      ...(parsed.parameters?.value !== undefined ? { value: parsed.parameters.value } : {}),
    });
    if (parsed.action === "SET_SPEED")
      return `${device.room?.name} ${device.name} set to speed ${device.fan_speed}.`;
    if (parsed.action === "SET_TEMP")
      return `${device.room?.name} ${device.name} set to ${device.temperature}°C.`;
    return `${device.room?.name} ${device.name} turned ${device.status ? "ON" : "OFF"}.`;
  }

  throw new ApiError("Sorry, I couldn't understand that command.");
}

/** Automation engine tick: evaluate enabled rules and run matching ones. */
export async function runAutomations(now = new Date()) {
  const rules = await listRules();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const temp = simulatedTemperature(now);
  const triggered: string[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    const last = rule.last_triggered_at ? new Date(rule.last_triggered_at) : null;
    if (last && now.getTime() - last.getTime() < 5 * 60 * 1000) continue;

    let matches = false;
    if (rule.condition.type === "time") matches = String(rule.condition.value) === hhmm;
    if (rule.condition.type === "temperature") {
      const v = Number(rule.condition.value);
      matches =
        rule.condition.operator === "<"
          ? temp < v
          : rule.condition.operator === "="
            ? Math.round(temp) === v
            : temp > v;
    }
    if (!matches) continue;

    const parsed: ParsedCommand = {
      intent: rule.action.type === "device" ? "CONTROL_DEVICE" : "CONTROL_GROUP",
      ...(rule.action.target ? { device: rule.action.target } : {}),
      ...(rule.action.type !== "device"
        ? { scope: rule.action.type as "all_lights" | "all_devices" }
        : {}),
      action: rule.action.action,
      ...(rule.action.value !== undefined ? { parameters: { value: rule.action.value } } : {}),
      source: "deterministic",
    };
    try {
      const result = await executeParsed(parsed);
      await getDb()
        .from("automation_rules")
        .update({ last_triggered_at: now.toISOString() })
        .eq("id", rule.id);
      await logCommand({
        command: `Automation: ${rule.name}`,
        source: "automation",
        parsed_action: parsed,
        result,
        success: true,
      });
      triggered.push(rule.name);
    } catch (e) {
      await logCommand({
        command: `Automation: ${rule.name}`,
        source: "automation",
        parsed_action: parsed,
        result: (e as Error).message,
        success: false,
      });
    }
  }
  return { triggered, simulatedTemperature: temp };
}

export async function getSummary(): Promise<DashboardSummary> {
  const [devices, rules, analytics] = await Promise.all([
    listDevices(),
    listRules(),
    getAnalytics(),
  ]);
  const byType = { light: { total: 0, on: 0 }, fan: { total: 0, on: 0 }, ac: { total: 0, on: 0 }, plug: { total: 0, on: 0 } } as Record<DeviceType, { total: number; on: number }>;
  for (const d of devices) {
    byType[d.type].total += 1;
    if (d.status) byType[d.type].on += 1;
  }
  return {
    totalDevices: devices.length,
    devicesOn: devices.filter((d) => d.status).length,
    byType,
    currentPowerWatts: devices.reduce((sum, d) => sum + (d.power_watts ?? 0), 0),
    todayKwh: analytics.todayKwh,
    activeRules: rules.filter((r) => r.enabled).length,
    simulatedTemperature: simulatedTemperature(),
  };
}

export async function getAnalytics() {
  const db = getDb();
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await db
    .from("device_states")
    .select("power_watts, updated_at, device:devices(name, type, room:rooms(name))")
    .gte("updated_at", since)
    .order("updated_at");
  if (error) throw new ApiError(error.message, 500);

  type Row = {
    power_watts: number;
    updated_at: string;
    device: { name: string; type: string; room: { name: string } | null } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  // Each stored sample represents roughly one hour of draw (simulated).
  const hourly = new Map<string, number>();
  const daily = new Map<string, number>();
  const byRoom = new Map<string, number>();
  const byDevice = new Map<string, number>();

  for (const r of rows) {
    const kwh = Number(r.power_watts) / 1000;
    const d = new Date(r.updated_at);
    const hourKey = `${String(d.getHours()).padStart(2, "0")}:00`;
    const dayKey = d.toISOString().slice(0, 10);
    hourly.set(hourKey, (hourly.get(hourKey) ?? 0) + kwh);
    daily.set(dayKey, (daily.get(dayKey) ?? 0) + kwh);
    const roomName = r.device?.room?.name ?? "Other";
    byRoom.set(roomName, (byRoom.get(roomName) ?? 0) + kwh);
    const devName = r.device?.name ?? "Unknown";
    byDevice.set(devName, (byDevice.get(devName) ?? 0) + kwh);
  }

  const today = new Date().toISOString().slice(0, 10);
  const devices = await listDevices();
  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    todayKwh: round(daily.get(today) ?? 0),
    weekKwh: round([...daily.values()].reduce((a, b) => a + b, 0)),
    currentPowerWatts: devices.reduce((s, d) => s + (d.power_watts ?? 0), 0),
    hourly: [...hourly.entries()].sort().map(([hour, kwh]) => ({ hour, kwh: round(kwh) })),
    daily: [...daily.entries()].sort().map(([day, kwh]) => ({ day, kwh: round(kwh) })),
    byRoom: [...byRoom.entries()].map(([room, kwh]) => ({ room, kwh: round(kwh) })),
    byDevice: [...byDevice.entries()]
      .map(([device, kwh]) => ({ device, kwh: round(kwh) }))
      .sort((a, b) => b.kwh - a.kwh),
    note: "Simulated Energy Usage — software model, not a real electrical measurement.",
  };
}
