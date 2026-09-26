import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/server/http.server";
import { listHistory } from "@/lib/server/smarthome.server";

export const Route = createFileRoute("/api/history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const limit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
        return handle(async () => ({ history: await listHistory(limit) }));
      },
    },
  },
});
