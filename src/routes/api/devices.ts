import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/server/http.server";
import { listDevices } from "@/lib/server/smarthome.server";

export const Route = createFileRoute("/api/devices")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const room = new URL(request.url).searchParams.get("room");
        return handle(async () => ({ devices: await listDevices(room ?? undefined) }));
      },
    },
  },
});
