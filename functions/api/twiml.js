// Cloudflare Pages Function: /api/twiml?id=<event_id>__<family_id>
// Twilio fetches this URL when the call is answered (trial accounts require a TwiML URL, not inline TwiML).
// It plays the approved voice note, then a short simulated-demo notice.
const ID_RE = /^[a-z0-9_]+__(carter|johnson|lewis|weah)$/;

function twiml(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const body = ID_RE.test(id)
    ? `<Play>${url.origin}/audio/${id}.mp3</Play><Pause length="1"/><Say voice="Polly.Joanna" language="en-US">This message was from your advisor's office at Synapsis. Goodbye.</Say>`
    : `<Say voice="Polly.Joanna" language="en-US">Sorry, this demo message was not found. Goodbye.</Say>`;
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}<Hangup/></Response>`,
    {headers: {"content-type": "text/xml"}});
}

export const onRequestGet = ({request}) => twiml(request);
export const onRequestPost = ({request}) => twiml(request);
