import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/server/http.server";
import { getSummary } from "@/lib/server/smarthome.server";

export const Route = createFileRoute("/api/summary")({
  server: {
    handlers: {
      GET: async () => handle(async () => ({ summary: await getSummary() })),
    },
  },
});
