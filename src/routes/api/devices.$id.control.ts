import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/server/http.server";
import { controlDevice, logCommand, type ControlInput } from "@/lib/server/smarthome.server";

export const Route = createFileRoute("/api/devices/$id/control")({
  server: {
    handlers: {
      POST: async ({ params, request }) =>
        handle(async () => {
          const body = (await request.json()) as ControlInput;
          const device = await controlDevice(params.id, body);
          await logCommand({
            command: `${body.action}${body.value !== undefined ? ` ${body.value}` : ""} → ${device.name}`,
            source: "ui",
            parsed_action: {
              intent: "CONTROL_DEVICE",
              device: device.slug,
              action: body.action === "TOGGLE" ? (device.status ? "ON" : "OFF") : body.action,
              ...(body.value !== undefined ? { parameters: { value: body.value } } : {}),
              source: "deterministic",
            },
            result: `${device.name} updated`,
            success: true,
          });
          return { device };
        }),
    },
  },
});
