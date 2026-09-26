import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/server/http.server";
import { deleteRule, updateRule } from "@/lib/server/smarthome.server";
import type { AutomationRule } from "@/types/smart-home";

export const Route = createFileRoute("/api/automation/$id")({
  server: {
    handlers: {
      PUT: async ({ params, request }) =>
        handle(async () => {
          const body = (await request.json()) as Partial<AutomationRule>;
          return { rule: await updateRule(params.id, body) };
        }),
      DELETE: async ({ params }) => handle(async () => deleteRule(params.id)),
    },
  },
});
