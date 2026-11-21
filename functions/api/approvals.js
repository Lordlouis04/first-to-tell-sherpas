// Shared demo state in KV so the client app on any device sees what the advisor approved.
// GET  /api/approvals                    -> {approvals: {<draft id>: {status, text, at}}, prefs: {freq: {fid: v}, time: {fid: v}}}
//      (no PIN: synthetic families, and the client app reads it without asking)
// POST /api/approvals (x-pin) {approvals?: {<id>: {status, text} | null}, prefs?: {freq?: {fid: v}, time?: {fid: v}}, reset?: true}
import {json, pinOk} from "../_lib/pin.js";

const ID_RE = /^[a-z0-9_]+__(carter|johnson|lewis|weah)$/;
const FIDS = ["carter", "johnson", "lewis", "weah"];
const FREQ = ["weekly", "biweekly", "monthly"], TIME = ["09:00", "12:30", "15:30", "18:00"];
const EMPTY = () => ({approvals: {}, prefs: {freq: {}, time: {}}});

async function read(env) {
  try { return {...EMPTY(), ...JSON.parse(await env.CALLS.get("shared:state") || "{}")}; } catch { return EMPTY(); }
}

export async function onRequestGet({env}) {
  if (!env.CALLS) return json({ok: true, kv: false, ...EMPTY()});
  return json({ok: true, kv: true, ...(await read(env))});
}

export async function onRequestPost({request, env}) {
  if (!pinOk(request, env)) return json({ok: false, error: "Wrong PIN"}, 401);
  if (!env.CALLS) return json({ok: false, error: "Storage (KV binding CALLS) is not set up yet"}, 503);
  let b; try { b = await request.json(); } catch { return json({ok: false, error: "Bad JSON"}, 400); }
  const s = b.reset ? {...(await read(env)), approvals: {}} : await read(env);
  for (const [id, v] of Object.entries(b.approvals || {})) {
    if (!ID_RE.test(id)) continue;
    if (!v || !["approved", "rejected"].includes(v.status)) delete s.approvals[id];
    else s.approvals[id] = {status: v.status, text: String(v.text || "").slice(0, 2000), at: Date.now()};
  }
  for (const [k, allowed] of [["freq", FREQ], ["time", TIME]]) {
    for (const [fid, v] of Object.entries((b.prefs || {})[k] || {})) if (FIDS.includes(fid) && allowed.includes(v)) s.prefs[k][fid] = v;
  }
  await env.CALLS.put("shared:state", JSON.stringify(s));
  return json({ok: true, ...s});
}
