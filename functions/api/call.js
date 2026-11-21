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

  const twiml = `<Response><Play>${audioUrl}</Play><Pause length="1"/><Say voice="alice">This was a simulated demo message. Goodbye.</Say></Response>`;
  const form = new URLSearchParams({To: env.DEMO_TO, From: env.TWILIO_FROM, Twiml: twiml});
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

export async function onRequestGet({env}) {
  const ready = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM", "DEMO_TO", "CALL_PIN"].every(k => env[k]);
  return json({ready});
}
