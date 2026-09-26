import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/server/http.server";
import { createRule, listRules } from "@/lib/server/smarthome.server";
import type { AutomationRule } from "@/types/smart-home";

export const Route = createFileRoute("/api/automation")({
  server: {
    handlers: {
      GET: async () => handle(async () => ({ rules: await listRules() })),
      POST: async ({ request }) =>
        handle(async () => {
          const body = (await request.json()) as Partial<AutomationRule>;
          return { rule: await createRule(body) };
        }),
    },
  },
});
