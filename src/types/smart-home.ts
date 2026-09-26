export type DeviceType = "light" | "fan" | "ac" | "plug";

export interface Room {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Device {
  id: string;
  room_id: string;
  name: string;
  slug: string;
  type: DeviceType;
  status: boolean;
  fan_speed: number;
  temperature: number;
  power_rating: number;
  created_at: string;
  updated_at: string;
  room?: Pick<Room, "id" | "name" | "slug">;
  /** Simulated live power draw in watts */
  power_watts?: number;
}

export interface AutomationCondition {
  type: "time" | "temperature";
  operator?: ">" | "<" | "=";
  value: string | number;
}

export interface AutomationAction {
  type: "device" | "all_lights" | "all_devices";
  target?: string;
  action: "ON" | "OFF" | "SET_SPEED" | "SET_TEMP";
  value?: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  condition: AutomationCondition;
  action: AutomationAction;
  enabled: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

export interface CommandHistoryEntry {
  id: string;
  command: string;
  source: string;
  parsed_action: ParsedCommand | null;
  result: string | null;
  success: boolean;
  created_at: string;
}

export interface ParsedCommand {
  intent: "CONTROL_DEVICE" | "CONTROL_GROUP" | "QUERY" | "UNKNOWN";
  device?: string;
  scope?: "all_lights" | "all_fans" | "all_devices";
  action?: "ON" | "OFF" | "SET_SPEED" | "SET_TEMP";
  parameters?: { value?: number };
  confidence?: number;
  source?: "deterministic" | "ai";
}

export interface DashboardSummary {
  totalDevices: number;
  devicesOn: number;
  byType: Record<DeviceType, { total: number; on: number }>;
  currentPowerWatts: number;
  todayKwh: number;
  activeRules: number;
  simulatedTemperature: number;
}
