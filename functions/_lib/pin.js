// Shared demo guard: every read/write of call records and client changes needs the demo PIN (CALL_PIN secret).
export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {"content-type": "application/json"}});
export function pinOk(request, env) {
  return !!env.CALL_PIN && request.headers.get("x-pin") === String(env.CALL_PIN);
}
