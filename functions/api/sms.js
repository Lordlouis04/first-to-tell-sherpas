// POST /api/sms (x-pin) {fid, ev?} -> sends the missed-call SMS for that case to the demo number, to test it without
// missing a real call. Returns Twilio's answer as-is so we can see whether the trial account accepts custom text.
import {json, pinOk} from "../_lib/pin.js";
import {smsText, sendSms} from "../_lib/sms.js";

export async function onRequestPost({request, env}) {
  if (!pinOk(request, env)) return json({ok: false, error: "Wrong PIN"}, 401);
  let b; try { b = await request.json(); } catch { return json({ok: false, error: "Bad JSON"}, 400); }
  if (!["carter", "johnson", "lewis", "weah"].includes(b.fid)) return json({ok: false, error: "Unknown family"}, 400);
  const brief = await (await fetch(`${new URL(request.url).origin}/data/briefs/${b.fid}.json`)).json();
  const event = b.ev ? brief.events[b.ev] : null;
  const text = smsText(brief, event);
  const r = await sendSms(env, text);
  return json({...r, text}, r.ok ? 200 : 502);
}
