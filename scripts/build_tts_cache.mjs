// Pre-generate the AI assistant's voice for every line a call can say (all 4 families, all branches),
// so live calls never wait for ElevenLabs. Writes web/tts/<hash>.mp3 + web/tts/manifest.json.
//
//   node scripts/build_tts_cache.mjs            # dry run: list lines + character count
//   node scripts/build_tts_cache.mjs --generate # call ElevenLabs for missing clips (reads ELEVENLABS_API_KEY from backend/.env)
//
// Lines are collected by driving the real call engine (functions/api/voice.js) through many simulated conversations.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {pathToFileURL, fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = path.join(ROOT, "functions", "package.json");
fs.writeFileSync(pkg, '{"type":"module"}');               // let Node load the Pages Functions as ES modules
let onRequest, VOICE_ID, MODEL_ID;
try {
  ({onRequest} = await import(pathToFileURL(path.join(ROOT, "functions/api/voice.js")).href));
  ({VOICE_ID, MODEL_ID} = await import(pathToFileURL(path.join(ROOT, "functions/_lib/tts.js")).href));
} finally { fs.rmSync(pkg); }

globalThis.fetch = async u => {                                // serve the site's static JSON locally
  const p = new URL(u).pathname;
  const file = path.join(ROOT, "web", p);
  if (!fs.existsSync(file)) throw new Error("no " + p);
  return {ok: true, json: async () => JSON.parse(fs.readFileSync(file, "utf8"))};
};
const store = new Map();
const KV = {get: async k => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); }, list: async () => ({keys: []})};
const said = new Set();
const grab = x => [...x.matchAll(/<Say[^>]*>(.*?)<\/Say>/g)].forEach(m => said.add(m[1].replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")));
const act = x => { const m = x.match(/action="([^"]+)"/); return m ? m[1].replace(/&amp;/g, "&") : null; };

let n = 0;
async function run(qs, answers) {
  store.clear(); const sid = "CA" + (n++);
  let x = await (await onRequest({request: new Request(`https://demo.test/api/voice?${qs}`, {method: "POST", body: new URLSearchParams({CallSid: sid})}), env: {CALLS: KV}})).text();
  grab(x);
  for (const a of answers) {
    const u = act(x); if (!u) break;
    x = await (await onRequest({request: new Request(u, {method: "POST", body: new URLSearchParams({CallSid: sid, SpeechResult: a})}), env: {CALLS: KV}})).text();
    grab(x);
  }
}

const FAMS = ["carter", "johnson", "lewis", "weah"];
const TOPIC_Q = ["home", "cash", "college", "market", "retirement", "debt", "tax"].map(t => `Let's talk about my ${t}`);
for (const fid of FAMS) {
  const brief = JSON.parse(fs.readFileSync(path.join(ROOT, "web/data/briefs", fid + ".json"), "utf8"));
  const P = `fid=${fid}&mode=periodic`;
  // full agenda, calm and worried variants, interest yes/no, message or not
  await run(P, ["yes", "nothing", "yes", "fine", "yes", "good", "yes please", "no"]);
  await run(P, ["yes", "go ahead", "I'm worried about it", "it's a concern", "I don't know", "not great, I'm worried", "no", "please tell him to call me today"]);
  for (const q of TOPIC_Q) await run(P, ["yes", q, "yes"]);
  await run(P, ["yes", "what's the weather like"]);
  // interruptions at different steps
  for (const intr of ["Should I sell everything?", "How much will I have at 62?", "Are you a real person?", "My company announced layoffs",
                      "I'm panicking about all this", "I'd like to talk to my advisor", "I have to go, bye", "I can't go on"]) {
    await run(P, ["yes", intr, "no", "no"]);
    await run(P, ["yes", "nothing", "yes", intr, "no", "no"]);
    await run(P, ["yes", "nothing", "yes", "fine", "yes", "good", "no", intr]);
  }
  // question mode and big purchases (anywhere in the agenda)
  for (const q of [...TOPIC_Q.map(x => x.replace("Let's talk about my", "how about my") + "?"), "what's the weather like?", "should I sell my stocks?"]) {
    await run(P, ["yes", "I have a question", q, "yes", "fine", "no", "ok", "no", "no"]);
    await run(P, ["yes", "nothing", "yes, and I have a question", q, "fine", "no", "ok", "no", "no"]);
  }
  for (const buy of ["I'm thinking of buying a car for 200,000 dollars", "We want to buy a house next year"]) {
    await run(P, ["yes", buy, "yes", "fine", "no", "ok", "no", "no"]);
    await run(P, ["yes", "nothing", "yes", buy, "no", "ok", "no", "no"]);
    await run(P, ["yes", "I have a question", buy, "fine", "no", "ok", "no", "no"]);
  }
  await run(P, ["Are you a real person?", "yes"]);
  await run(P, ["I'm busy, call me later"]);
  await run(P, ["No, this is his wife"]);
  await run(P, ["yes", "", "", "", "", "", "", "", "", ""]);     // silence path
  await run(P, ["", ""]);
  // event calls for every approved-message event of this family
  for (const ev of Object.keys(brief.events)) {
    const E = `fid=${fid}&mode=event&ev=${ev}`;
    await run(E, ["yes", "I'm fine", "no", "yes please"]);
    await run(E, ["yes", "I'm fine", "no", "no"]);
    for (const q of ["How much cash do I have?", "what about my home?", "and my college plans?", "what about retirement?", "my debt?", "what about the market?", "taxes?"])
      await run(E, ["yes", "ok", q, "yes"]);
    await run(E, ["yes", "ok", "I have a question", "how much cash do I have?", "no"]);
    await run(E, ["yes", "ok", "I'm thinking of buying a car for 200,000", "no"]);
    await run(E, ["yes", "ok", "We started a new savings plan last month", "no"]);
    await run(E, ["yes", "I'm worried", "no"]);
    await run(E, ["yes", "should I sell?", "no"]);
    await run(E, ["yes", "I'm panicking"]);
    await run(E, ["yes", "I'd like to talk to my advisor"]);
    await run(E, ["Are you a real person?", "yes", "fine", "no"]);
    await run(E, ["I'm busy"]);
    await run(E, ["", ""]);
  }
}

const hash = t => crypto.createHash("sha256").update(`${VOICE_ID}|${MODEL_ID}|${t}`).digest("hex").slice(0, 20);
const lines = [...said].sort();
const chars = lines.reduce((s, t) => s + t.length, 0);
console.log(`${lines.length} unique lines, ${chars} characters`);

const OUT = path.join(ROOT, "web", "tts");
fs.mkdirSync(OUT, {recursive: true});
const manifest = fs.existsSync(path.join(OUT, "manifest.json")) ? JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8")) : {};
const missing = lines.filter(t => !manifest[hash(t)] || !fs.existsSync(path.join(OUT, hash(t) + ".mp3")));
console.log(`${missing.length} missing (${missing.reduce((s, t) => s + t.length, 0)} characters)`);

if (process.argv.includes("--generate")) {
  const env = fs.readFileSync(path.join(ROOT, "backend/.env"), "utf8");
  const key = (env.match(/^ELEVENLABS_API_KEY=(.*)$/m) || [])[1]?.trim();
  if (!key) throw new Error("ELEVENLABS_API_KEY missing in backend/.env");
  const realFetch = (await import("node:https")).default;
  const tts = text => new Promise((resolve, reject) => {
    const body = JSON.stringify({text, model_id: MODEL_ID});
    const req = realFetch.request({host: "api.elevenlabs.io", path: `/v1/text-to-speech/${VOICE_ID}?output_format=mp3_22050_32`, method: "POST",
      headers: {"xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg", "content-length": Buffer.byteLength(body)}}, res => {
      const chunks = []; res.on("data", c => chunks.push(c));
      res.on("end", () => res.statusCode === 200 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ElevenLabs ${res.statusCode}: ${Buffer.concat(chunks).toString().slice(0, 200)}`)));
    });
    req.on("error", reject); req.write(body); req.end();
  });
  let done = 0;
  for (let i = 0; i < missing.length; i += 4) {                 // 4 at a time (well under plan concurrency)
    await Promise.all(missing.slice(i, i + 4).map(async t => {
      const h = hash(t);
      fs.writeFileSync(path.join(OUT, h + ".mp3"), await tts(t));
      manifest[h] = t.length; done++;
    }));
    fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest));
    process.stdout.write(`\r${done}/${missing.length}`);
  }
  console.log("\ndone");
}
