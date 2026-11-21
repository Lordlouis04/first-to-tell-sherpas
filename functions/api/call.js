// Cloudflare Pages Function: POST /api/call
//   {"mode":"event","id":"<event_id>__<family_id>","pin":"...."}  -> interactive call about an approved message
//   {"mode":"periodic","fid":"<family_id>","pin":"...."}        -> interactive periodic check-in (Prompt Pack S0..S8)
// Twilio fetches /api/voice on every turn (speech in, TwiML out).
//
// Safety for a public demo site:
//  - it only ever calls ONE number, DEMO_TO, set as a Cloudflare secret (never taken from the request);
//  - a shared CALL_PIN is required, so random visitors can't trigger calls.
// Twilio trial accounts accept only To / From / Url / StatusCallback on the Calls API.
//
// Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, DEMO_TO, CALL_PIN.  Optional KV binding: CALLS.
const ID_RE = /^[a-z0-9_]+__(carter|johnson|lewis|weah)$/;
const FIDS = ["carter", "johnson", "lewis", "weah"];
const KEYS = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM", "DEMO_TO", "CALL_PIN"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {"content-type": "application/json"}});

export async function onRequestPost({request, env}) {
  const missing = KEYS.filter(k => !env[k]);
  if (missing.length) return json({ok: false, error: "Calling is not configured yet", missing}, 503);

  let body;
  try { body = await request.json(); } catch { return json({ok: false, error: "Bad JSON"}, 400); }
  if (String(body.pin || "") !== String(env.CALL_PIN)) return json({ok: false, error: "Wrong PIN"}, 401);

  const origin = new URL(request.url).origin;
  let qs;
  if (body.mode === "periodic") {
    if (!FIDS.includes(body.fid)) return json({ok: false, error: "Unknown family"}, 400);
    qs = `fid=${body.fid}&mode=periodic`;
  } else {
    const id = String(body.id || "");
    if (!ID_RE.test(id)) return json({ok: false, error: "Unknown message"}, 400);
    qs = `fid=${id.split("__")[1]}&mode=event&ev=${encodeURIComponent(id)}`;
  }

  const form = new URLSearchParams({To: env.DEMO_TO, From: env.TWILIO_FROM,
    Url: `${origin}/api/voice?${qs}`, StatusCallback: `${origin}/api/voice?${qs}&status=1`});
  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls.json`, {
    method: "POST",
    headers: {Authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded"},
    body: form,
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) return json({ok: false, error: out.message || `Twilio error ${r.status}`}, 502);
  const to = String(env.DEMO_TO);
  return json({ok: true, sid: out.sid, status: out.status, to: to.slice(0, 3) + " ··· " + to.slice(-3), kv: !!env.CALLS});
}

// GET /api/call -> {ready, kv}
export async function onRequestGet({env}) {
  return json({ready: KEYS.every(k => env[k]), kv: !!env.CALLS});
}
