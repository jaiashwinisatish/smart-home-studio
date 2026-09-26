import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/server/http.server";
import { runAutomations } from "@/lib/server/smarthome.server";

export const Route = createFileRoute("/api/automation/run")({
  server: {
    handlers: {
      POST: async () => handle(async () => runAutomations()),
    },
  },
});
