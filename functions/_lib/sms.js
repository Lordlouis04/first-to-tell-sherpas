// SMS fallback when a call isn't answered. Always to the single demo number (DEMO_TO), never to a number from a request.
// Twilio trial accounts may only allow template bodies; if Twilio refuses, the caller records the reason and the
// in-app banner + advisor row still make sure the family gets the information.
export function smsText(brief, event) {
  const A = brief.advisor_name, C = brief.client_first_name;
  if (!event) return `Synapsis: Hi ${C}, ${A}'s office tried to reach you for your check-in. Nothing urgent, we'll try again at your next scheduled time.`;
  return event.urgent
    ? `Synapsis: Hi ${C}, ${A}'s office tried to call you about something important: ${event.subject}. Please open your app or reply to call back today.`
    : `Synapsis: Hi ${C}, ${A}'s office tried to call you about: ${event.subject}. Nothing urgent, it's waiting in your app whenever suits you.`;
}

export async function sendSms(env, body) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM || !env.DEMO_TO) return {ok: false, error: "not configured"};
  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {Authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded"},
      body: new URLSearchParams({To: env.DEMO_TO, From: env.TWILIO_FROM, Body: body}),
    });
    const j = await r.json().catch(() => ({}));
    return r.ok ? {ok: true, sid: j.sid, status: j.status} : {ok: false, error: j.message || `Twilio error ${r.status}`, code: j.code || null};
  } catch (e) { return {ok: false, error: "network error"}; }
}
