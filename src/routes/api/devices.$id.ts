import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/server/http.server";
import { getDevice } from "@/lib/server/smarthome.server";

export const Route = createFileRoute("/api/devices/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => handle(async () => ({ device: await getDevice(params.id) })),
    },
  },
});
