import type { Device } from "@/types/smart-home";

/**
 * Software simulation engine.
 * These values are SIMULATED and do not represent real electrical measurements.
 */
export function devicePowerWatts(device: {
  type: Device["type"];
  status: boolean;
  fan_speed: number;
  temperature: number;
  power_rating: number;
}): number {
  if (!device.status) return 0;
  switch (device.type) {
    case "light":
      return device.power_rating || 10;
    case "fan":
      // speed 1 -> 30W ... speed 5 -> 70W
      return 20 + device.fan_speed * 10;
    case "ac": {
      // colder setpoint = more power
      const base = device.power_rating || 1200;
      const delta = Math.max(0, 26 - device.temperature);
      return Math.round(base + delta * 60);
    }
    case "plug":
      return device.power_rating || 150;
    default:
      return 0;
  }
}

/** Deterministic simulated ambient temperature for the current hour. */
export function simulatedTemperature(date = new Date()): number {
  const hour = date.getHours() + date.getMinutes() / 60;
  return Math.round((25 + 6 * Math.sin(((hour - 9) / 24) * 2 * Math.PI)) * 10) / 10;
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Good Night";
}
