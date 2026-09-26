import { createFileRoute } from "@tanstack/react-router";
import { fail, ok } from "@/lib/server/http.server";
import {
  ApiError,
  executeParsed,
  listDevices,
  logCommand,
} from "@/lib/server/smarthome.server";
import { parseDeterministic, parseWithAi } from "@/lib/server/parser.server";

export const Route = createFileRoute("/api/commands")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let text = "";
        let source = "voice";
        try {
          const body = (await request.json()) as { command?: string; source?: string };
          text = (body.command ?? "").trim();
          source = body.source ?? "voice";
          if (!text) throw new ApiError("No command was provided.");

          const devices = await listDevices();
          const parsed =
            parseDeterministic(text, devices) ?? (await parseWithAi(text, devices));
          if (!parsed)
            throw new ApiError(
              "I couldn't match that to a device. Try: \"turn on the living room light\".",
            );

          const result = await executeParsed(parsed);
          await logCommand({ command: text, source, parsed_action: parsed, result, success: true });
          return ok({ parsed, result });
        } catch (error) {
          const message =
            error instanceof ApiError ? error.message : "The command could not be processed.";
          if (text) {
            await logCommand({ command: text, source, result: message, success: false }).catch(
              () => undefined,
            );
          }
          return fail(error instanceof ApiError ? error : new ApiError(message, 500));
        }
      },
    },
  },
});
