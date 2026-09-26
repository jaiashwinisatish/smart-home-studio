import type {
  AutomationRule,
  CommandHistoryEntry,
  DashboardSummary,
  Device,
  ParsedCommand,
  Room,
} from "@/types/smart-home";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const text = await res.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) throw new Error((json["error"] as string) ?? "Request failed.");
  return json as T;
}

export const api = {
  rooms: () => request<{ rooms: Room[] }>("/api/rooms").then((r) => r.rooms),
  devices: (room?: string) =>
    request<{ devices: Device[] }>(`/api/devices${room ? `?room=${room}` : ""}`).then(
      (r) => r.devices,
    ),
  device: (id: string) => request<{ device: Device }>(`/api/devices/${id}`).then((r) => r.device),
  toggle: (id: string) =>
    request<{ device: Device }>(`/api/devices/${id}/toggle`, { method: "POST" }).then(
      (r) => r.device,
    ),
  control: (id: string, action: string, value?: number) =>
    request<{ device: Device }>(`/api/devices/${id}/control`, {
      method: "POST",
      body: JSON.stringify({ action, value }),
    }).then((r) => r.device),
  summary: () => request<{ summary: DashboardSummary }>("/api/summary").then((r) => r.summary),
  rules: () => request<{ rules: AutomationRule[] }>("/api/automation").then((r) => r.rules),
  createRule: (rule: Partial<AutomationRule>) =>
    request<{ rule: AutomationRule }>("/api/automation", {
      method: "POST",
      body: JSON.stringify(rule),
    }).then((r) => r.rule),
  updateRule: (id: string, patch: Partial<AutomationRule>) =>
    request<{ rule: AutomationRule }>(`/api/automation/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }).then((r) => r.rule),
  deleteRule: (id: string) => request<{ ok: boolean }>(`/api/automation/${id}`, { method: "DELETE" }),
  runAutomations: () =>
    request<{ triggered: string[]; simulatedTemperature: number }>("/api/automation/run", {
      method: "POST",
    }),
  sendCommand: (command: string, source = "voice") =>
    request<{ parsed: ParsedCommand; result: string }>("/api/commands", {
      method: "POST",
      body: JSON.stringify({ command, source }),
    }),
  history: (limit = 50) =>
    request<{ history: CommandHistoryEntry[] }>(`/api/history?limit=${limit}`).then(
      (r) => r.history,
    ),
  analytics: () =>
    request<{
      todayKwh: number;
      weekKwh: number;
      currentPowerWatts: number;
      hourly: { hour: string; kwh: number }[];
      daily: { day: string; kwh: number }[];
      byRoom: { room: string; kwh: number }[];
      byDevice: { device: string; kwh: number }[];
      note: string;
    }>("/api/analytics"),
};
