import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/server/http.server";
import { listRooms } from "@/lib/server/smarthome.server";

export const Route = createFileRoute("/api/rooms")({
  server: {
    handlers: {
      GET: async () => handle(async () => ({ rooms: await listRooms() })),
    },
  },
});
