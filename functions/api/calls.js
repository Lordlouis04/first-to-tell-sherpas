// GET /api/calls  (header x-pin) -> latest call records with the advisor summary + transcript (newest first)
import {json, pinOk} from "../_lib/pin.js";

export async function onRequestGet({request, env}) {
  if (!pinOk(request, env)) return json({ok: false, error: "Wrong PIN"}, 401);
  if (!env.CALLS) return json({ok: true, kv: false, calls: []});
  const list = await env.CALLS.list({prefix: "call:", limit: 30});
  const calls = (await Promise.all(list.keys.map(k => env.CALLS.get(k.name)))).filter(Boolean).map(s => JSON.parse(s));
  return json({ok: true, kv: true, calls});
}
