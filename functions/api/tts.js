// GET /api/tts?h=<hash> -> an assistant voice clip generated at runtime and cached in KV (see _lib/tts.js).
// Read-only: it can only serve clips that already exist, it never calls ElevenLabs, so it can't be used to spend credits.
export async function onRequestGet({request, env}) {
  const h = new URL(request.url).searchParams.get("h") || "";
  if (!/^[0-9a-f]{20}$/.test(h) || !env.CALLS) return new Response("Not found", {status: 404});
  const mp3 = await env.CALLS.get(`tts:${h}`, {type: "arrayBuffer"});
  if (!mp3) return new Response("Not found", {status: 404});
  return new Response(mp3, {headers: {"content-type": "audio/mpeg", "cache-control": "public, max-age=86400"}});
}
