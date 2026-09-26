import { ApiError } from "./smarthome.server";

export function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function fail(error: unknown) {
  const status = error instanceof ApiError ? error.status : 500;
  const message =
    error instanceof ApiError
      ? error.message
      : "Something went wrong on the server. Please try again.";
  if (!(error instanceof ApiError)) console.error(error);
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handle(fn: () => Promise<unknown>) {
  try {
    return ok(await fn());
  } catch (error) {
    return fail(error);
  }
}
