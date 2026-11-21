// Client-reported changes and questions (from the Family view), stored in KV for the advisor.
// GET  /api/changes  (x-pin)                         -> all, newest first
// POST /api/changes  (x-pin) {fid, kind, text, when}  -> saved as "client statement", to be validated by the advisor
import {json, pinOk} from "../_lib/pin.js";

const FIDS = ["carter", "johnson", "lewis", "weah"];
const KINDS = ["job", "home", "car", "family", "health", "money", "other", "question"];

export async function onRequestGet({request, env}) {
  if (!pinOk(request, env)) return json({ok: false, error: "Wrong PIN"}, 401);
  if (!env.CALLS) return json({ok: true, kv: false, changes: []});
  const list = await env.CALLS.list({prefix: "chg:", limit: 50});
  const changes = (await Promise.all(list.keys.map(k => env.CALLS.get(k.name)))).filter(Boolean).map(s => JSON.parse(s));
  return json({ok: true, kv: true, changes});
}

export async function onRequestPost({request, env}) {
  if (!pinOk(request, env)) return json({ok: false, error: "Wrong PIN"}, 401);
  if (!env.CALLS) return json({ok: false, error: "Storage (KV binding CALLS) is not set up yet"}, 503);
  let b; try { b = await request.json(); } catch { return json({ok: false, error: "Bad JSON"}, 400); }
  const text = String(b.text || "").trim().slice(0, 500);
  if (!FIDS.includes(b.fid) || !KINDS.includes(b.kind) || !text) return json({ok: false, error: "Missing fields"}, 400);
  const now = Date.now();
  const rec = {fid: b.fid, kind: b.kind, text, when: String(b.when || "").slice(0, 20), created: now, source: "client statement", status: "to validate"};
  await env.CALLS.put(`chg:${String(9999999999999 - now).padStart(13, "0")}:${Math.random().toString(36).slice(2, 8)}`, JSON.stringify(rec));
  return json({ok: true});
}
