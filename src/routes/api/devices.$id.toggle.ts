import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/server/http.server";
import { controlDevice, logCommand } from "@/lib/server/smarthome.server";

export const Route = createFileRoute("/api/devices/$id/toggle")({
  server: {
    handlers: {
      POST: async ({ params }) =>
        handle(async () => {
          const device = await controlDevice(params.id, { action: "TOGGLE" });
          await logCommand({
            command: `Toggle ${device.name}`,
            source: "ui",
            parsed_action: {
              intent: "CONTROL_DEVICE",
              device: device.slug,
              action: device.status ? "ON" : "OFF",
              source: "deterministic",
            },
            result: `${device.name} turned ${device.status ? "ON" : "OFF"}`,
            success: true,
          });
          return { device };
        }),
    },
  },
});
