import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/server/http.server";
import { getAnalytics } from "@/lib/server/smarthome.server";

export const Route = createFileRoute("/api/analytics")({
  server: {
    handlers: {
      GET: async () => handle(async () => getAnalytics()),
    },
  },
});
