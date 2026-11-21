// Cloudflare Pages Function: POST /api/call  {"id": "<event_id>__<family_id>", "pin": "...."}
// Places a real phone call through Twilio that plays the approved voice note (web/audio/<id>.mp3).
//
// Safety for a public demo site:
//  - it only ever calls ONE number, DEMO_TO, set as a Cloudflare secret (never taken from the request);
//  - a shared CALL_PIN is required, so random visitors can't trigger calls;
//  - the audio id must match an existing mp3 on this site.
//
// Secrets (Cloudflare Pages > Settings > Variables and Secrets):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (your Twilio number, +1...), DEMO_TO (+34...), CALL_PIN
const ID_RE = /^[a-z0-9_]+__(carter|johnson|lewis|weah)$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {"content-type": "application/json"}});

export async function onRequestPost({request, env}) {
  const need = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM", "DEMO_TO", "CALL_PIN"];
  const missing = need.filter(k => !env[k]);
  if (missing.length) return json({ok: false, error: "Calling is not configured yet", missing}, 503);

  let body;
  try { body = await request.json(); } catch { return json({ok: false, error: "Bad JSON"}, 400); }
  if (String(body.pin || "") !== String(env.CALL_PIN)) return json({ok: false, error: "Wrong PIN"}, 401);
  if (!ID_RE.test(String(body.id || ""))) return json({ok: false, error: "Unknown message"}, 400);

  const origin = new URL(request.url).origin;
  const audioUrl = `${origin}/audio/${body.id}.mp3`;
  const head = await fetch(audioUrl, {method: "HEAD"});
  if (!head.ok) return json({ok: false, error: "Voice note not found"}, 404);

  // Trial accounts take a TwiML URL ("Custom TwiML URL"), so Twilio fetches /api/twiml when the call connects.
  // Trial accounts only accept To / From / Url / StatusCallback (no Method, no inline Twiml); /api/twiml answers GET and POST.
  const form = new URLSearchParams({To: env.DEMO_TO, From: env.TWILIO_FROM, Url: `${origin}/api/twiml?id=${body.id}`});
  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls.json`, {
    method: "POST",
    headers: {Authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded"},
    body: form,
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) return json({ok: false, error: out.message || `Twilio error ${r.status}`}, 502);
  const to = String(env.DEMO_TO);
  return json({ok: true, sid: out.sid, status: out.status, to: to.slice(0, 3) + " ··· " + to.slice(-3)});
}

// GET /api/call            -> {ready}
// GET /api/call?diag=1     -> yes/no checks only (no call is placed, no secret values returned)
export async function onRequestGet({request, env}) {
  const keys = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM", "DEMO_TO", "CALL_PIN"];
  const ready = keys.every(k => env[k]);
  if (!new URL(request.url).searchParams.get("diag")) return json({ready});
  const e164 = v => /^\+[1-9]\d{6,14}$/.test(String(v || ""));
  const out = {
    ready,
    present: Object.fromEntries(keys.map(k => [k, !!env[k]])),
    sid_format_ok: /^AC[0-9a-f]{32}$/.test(String(env.TWILIO_ACCOUNT_SID || "").trim()),
    sid_has_spaces: /\s/.test(String(env.TWILIO_ACCOUNT_SID || "")),
    token_len: String(env.TWILIO_AUTH_TOKEN || "").length,
    token_has_spaces: /\s/.test(String(env.TWILIO_AUTH_TOKEN || "")),
    from_e164_ok: e164(env.TWILIO_FROM), to_e164_ok: e164(env.DEMO_TO),
    pin_len: String(env.CALL_PIN || "").length,
  };
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}.json`, {headers: {Authorization: `Basic ${auth}`}});
    const j = await r.json().catch(() => ({}));
    out.twilio_auth_status = r.status; out.account_status = j.status || null; out.account_type = j.type || null;
    const c = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls.json?PageSize=3`, {headers: {Authorization: `Basic ${auth}`}});
    const cj = await c.json().catch(() => ({}));
    out.recent_calls = (cj.calls || []).map(x => ({status: x.status, start: x.start_time, duration: x.duration}));
  }
  return json(out);
}
