// ElevenLabs voice for the AI assistant during calls, with zero dead air:
//  1. pre-generated clip shipped with the site (web/tts/<hash>.mp3, listed in web/tts/manifest.json)
//  2. clip generated earlier at runtime and cached in KV (served by /api/tts?h=<hash>)
//  3. generate now with ElevenLabs (flash model, 3 s budget) and cache it
//  4. fallback: Twilio's own <Say> voice
// The same hash is computed by scripts/build_tts_cache.mjs, so pre-generated clips match exactly.
export const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";   // ElevenLabs premade stock voice "Sarah" (assistant; the advisor's notes use "George")
export const MODEL_ID = "eleven_flash_v2_5";

const esc = s => String(s).replace(/[<>&'"]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"}[c]));
export const polly = t => `<Say voice="Polly.Joanna" language="en-US">${esc(t)}</Say>`;

export async function hashLine(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${VOICE_ID}|${MODEL_ID}|${text}`));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 20);
}

let MANIFEST = null;
async function manifest(origin) {
  if (MANIFEST) return MANIFEST;
  try { MANIFEST = await (await fetch(`${origin}/tts/manifest.json`)).json(); } catch { MANIFEST = {}; }
  return MANIFEST;
}

async function generate(text, env) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_22050_32`, {
      method: "POST", signal: ctrl.signal,
      headers: {"xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json", accept: "audio/mpeg"},
      body: JSON.stringify({text, model_id: MODEL_ID}),
    });
    return r.ok ? await r.arrayBuffer() : null;
  } catch { return null; } finally { clearTimeout(timer); }
}

async function audioFor(text, env, origin) {
  const h = await hashLine(text);
  const m = await manifest(origin);
  if (m[h]) return `<Play>${origin}/tts/${h}.mp3</Play>`;
  if (env.CALLS && env.ELEVENLABS_API_KEY) {
    if (await env.CALLS.get(`tts:${h}`, {type: "stream"})) return `<Play>${origin}/api/tts?h=${h}</Play>`;
    const mp3 = await generate(text, env);
    if (mp3) { await env.CALLS.put(`tts:${h}`, mp3); return `<Play>${origin}/api/tts?h=${h}</Play>`; }
  }
  return polly(text);
}

// lines: array of texts referenced in body as @@L<i>@@ placeholders
export async function renderVoice(body, lines, env, origin) {
  const audio = await Promise.all(lines.map(t => audioFor(t, env, origin).catch(() => polly(t))));
  return body.replace(/@@L(\d+)@@/g, (_, i) => audio[Number(i)]);
}
