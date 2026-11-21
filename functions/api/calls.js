// GET  /api/calls  (header x-pin)            -> latest call records with the advisor summary + transcript (newest first)
// POST /api/calls  (header x-pin) {key, done} -> advisor marks a call as handled ("Done")
import {json, pinOk} from "../_lib/pin.js";

export async function onRequestGet({request, env}) {
  if (!pinOk(request, env)) return json({ok: false, error: "Wrong PIN"}, 401);
  if (!env.CALLS) return json({ok: true, kv: false, calls: []});
  const list = await env.CALLS.list({prefix: "call:", limit: 30});
  const calls = (await Promise.all(list.keys.map(async k => {
    const v = await env.CALLS.get(k.name); return v ? {...JSON.parse(v), key: k.name} : null;
  }))).filter(Boolean);
  return json({ok: true, kv: true, calls});
}

export async function onRequestPost({request, env}) {
  if (!pinOk(request, env)) return json({ok: false, error: "Wrong PIN"}, 401);
  if (!env.CALLS) return json({ok: false, error: "Storage (KV binding CALLS) is not set up yet"}, 503);
  let b; try { b = await request.json(); } catch { return json({ok: false, error: "Bad JSON"}, 400); }
  const key = String(b.key || "");
  if (!/^call:\d{13}:[A-Za-z0-9]+$/.test(key)) return json({ok: false, error: "Unknown call"}, 400);
  const v = await env.CALLS.get(key); if (!v) return json({ok: false, error: "Unknown call"}, 404);
  const rec = JSON.parse(v); rec.done = !!b.done; rec.done_at = rec.done ? Date.now() : null;
  await env.CALLS.put(key, JSON.stringify(rec));
  return json({ok: true});
}
