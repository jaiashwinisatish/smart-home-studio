import type { Device, ParsedCommand } from "@/types/smart-home";

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
};

/**
 * Deterministic natural-language parser. Runs first; the AI layer is only used
 * when this cannot confidently resolve the command.
 */
export function parseDeterministic(text: string, devices: Device[]): ParsedCommand | null {
  const t = text.toLowerCase().replace(/[^a-z0-9%°\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;

  const wantsOff = /\b(turn off|switch off|off|shut down|stop)\b/.test(t);
  const wantsOn = /\b(turn on|switch on|on|start|enable)\b/.test(t);

  // Group commands
  const everything = /\b(everything|all devices|all the devices)\b/.test(t);
  const allLights = /\ball (the )?lights\b/.test(t);
  const allFans = /\ball (the )?fans\b/.test(t);
  if (everything || allLights || allFans) {
    return {
      intent: "CONTROL_GROUP",
      scope: everything ? "all_devices" : allLights ? "all_lights" : "all_fans",
      action: wantsOff ? "OFF" : "ON",
      confidence: 0.95,
      source: "deterministic",
    };
  }

  // Resolve the device by matching room words + device type words
  const typeWord = /\bac\b|air conditioner|\bfans?\b|\blights?\b|\blamp\b|\bplug\b|socket/.exec(t);
  const type = !typeWord
    ? null
    : /ac|air conditioner/.test(typeWord[0])
      ? "ac"
      : /fan/.test(typeWord[0])
        ? "fan"
        : /plug|socket/.test(typeWord[0])
          ? "plug"
          : "light";

  const roomMatch = devices.find((d) => {
    const room = d.room?.name.toLowerCase() ?? "";
    return room && t.includes(room);
  });
  const roomSlug =
    roomMatch?.room?.slug ??
    (/\bmy room\b|\bbedroom\b/.test(t) ? "bedroom" : /\bstudy\b/.test(t) ? "study_room" : null);

  let candidates = devices;
  if (roomSlug) candidates = candidates.filter((d) => d.room?.slug === roomSlug);
  if (type) candidates = candidates.filter((d) => d.type === type);
  // Direct name match fallback
  if (candidates.length !== 1) {
    const named = devices.filter((d) => t.includes(d.name.toLowerCase()));
    if (named.length === 1) candidates = named;
  }
  if (candidates.length !== 1) return null;
  const device = candidates[0]!;

  // Speed
  const speedMatch = /speed (?:to )?(\d|one|two|three|four|five)/.exec(t);
  if (speedMatch && device.type === "fan") {
    const raw = speedMatch[1]!;
    const value = NUMBER_WORDS[raw] ?? Number(raw);
    return {
      intent: "CONTROL_DEVICE",
      device: device.slug,
      action: "SET_SPEED",
      parameters: { value },
      confidence: 0.95,
      source: "deterministic",
    };
  }

  // Temperature
  const tempMatch = /(\d{2})\s*(?:°|degrees?|c\b)/.exec(t);
  if (tempMatch && device.type === "ac") {
    return {
      intent: "CONTROL_DEVICE",
      device: device.slug,
      action: "SET_TEMP",
      parameters: { value: Number(tempMatch[1]) },
      confidence: 0.9,
      source: "deterministic",
    };
  }

  if (wantsOff || wantsOn) {
    return {
      intent: "CONTROL_DEVICE",
      device: device.slug,
      action: wantsOff ? "OFF" : "ON",
      confidence: 0.9,
      source: "deterministic",
    };
  }
  return null;
}

/**
 * AI abstraction layer. Uses the Lovable AI Gateway by default and falls back to
 * any OpenAI-compatible endpoint configured through AI_BASE_URL / AI_MODEL / AI_API_KEY.
 * It only RETURNS structured JSON — the backend validates and executes it.
 */
export async function parseWithAi(text: string, devices: Device[]): Promise<ParsedCommand | null> {
  const apiKey = process.env["AI_API_KEY"] ?? process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;
  const baseUrl = process.env["AI_BASE_URL"] ?? "https://ai.gateway.lovable.dev/v1";
  const model = process.env["AI_MODEL"] ?? "google/gemini-3.8-flash";

  const catalogue = devices
    .map((d) => `${d.slug} (${d.type}, ${d.room?.name})`)
    .join("\n");

  const system = `You translate smart-home requests into JSON. Devices:\n${catalogue}\n
Respond with ONLY JSON of the shape:
{"intent":"CONTROL_DEVICE"|"CONTROL_GROUP"|"UNKNOWN","device":"<device slug>","scope":"all_lights"|"all_fans"|"all_devices","action":"ON"|"OFF"|"SET_SPEED"|"SET_TEMP","parameters":{"value":number}}
Use device slugs exactly as listed. Fan speed 1-5, AC temperature 16-30.`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "";
  const match = /\{[\s\S]*\}/.exec(content);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as ParsedCommand;
    return validateParsed(parsed, devices);
  } catch {
    return null;
  }
}

/** Backend validation of AI output before anything touches the database. */
export function validateParsed(parsed: ParsedCommand, devices: Device[]): ParsedCommand | null {
  if (!parsed || parsed.intent === "UNKNOWN") return null;
  const actions = ["ON", "OFF", "SET_SPEED", "SET_TEMP"];
  if (!parsed.action || !actions.includes(parsed.action)) return null;

  if (parsed.intent === "CONTROL_GROUP") {
    if (!["all_lights", "all_fans", "all_devices"].includes(parsed.scope ?? "")) return null;
    return { ...parsed, source: "ai" };
  }
  const device = devices.find((d) => d.slug === parsed.device);
  if (!device) return null;
  if (parsed.action === "SET_SPEED") {
    const v = parsed.parameters?.value;
    if (device.type !== "fan" || !v || v < 1 || v > 5) return null;
  }
  if (parsed.action === "SET_TEMP") {
    const v = parsed.parameters?.value;
    if (device.type !== "ac" || !v || v < 16 || v > 30) return null;
  }
  return { ...parsed, source: "ai" };
}
