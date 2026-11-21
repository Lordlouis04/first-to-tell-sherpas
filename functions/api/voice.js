// Cloudflare Pages Function: /api/voice  (Twilio fetches this on every turn of an interactive call)
//   ?fid=<family>&mode=periodic|event&ev=<event_id>__<family>&step=<step being answered>&h=<hop>
//   ?...&status=1  -> Twilio status callback (finalizes the summary if the client hung up early)
// State per call lives in KV (binding CALLS) under s:<CallSid>; the final record under call:<rev-ts>:<CallSid>.
// Without the KV binding the call still works, it just cannot save the transcript for the advisor.
import {STEPS, intents, isYes, isNo, topicOf, prompt, closing, safe, extract, summarize} from "../_lib/engine.js";
import {renderVoice, polly} from "../_lib/tts.js";

const FIDS = ["carter", "johnson", "lewis", "weah"];
const esc = s => String(s).replace(/[<>&'"]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"}[c]));
const SAY = polly;   // only for early error replies; normal turns use the ElevenLabs assistant voice (see _lib/tts.js)
const xml = body => new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {headers: {"content-type": "text/xml"}});

async function loadState(env, sid) {
  if (!env.CALLS || !sid) return null;
  try { return JSON.parse(await env.CALLS.get(`s:${sid}`) || "null"); } catch { return null; }
}
async function saveState(env, sid, s) { if (env.CALLS && sid) await env.CALLS.put(`s:${sid}`, JSON.stringify(s), {expirationTtl: 7200}); }

async function finalize(env, brief, s, sid) {
  if (s.finalized) return;
  s.finalized = true; s.ended = Date.now();
  const x = extract(brief, s), sum = summarize(brief, x);
  const rec = {id: sid, family_id: brief.family_id, household: brief.household, mode: s.mode, event: s.event || null,
               started: s.started, ended: s.ended, turns: s.turns, extraction: x, summary: sum, simulated: true};
  if (env.CALLS) {
    await env.CALLS.put(`call:${String(9999999999999 - s.ended).padStart(13, "0")}:${sid}`, JSON.stringify(rec));
    await saveState(env, sid, s);
  }
}

export async function onRequest({request, env}) {
  const url = new URL(request.url), q = url.searchParams, origin = url.origin;
  const fid = q.get("fid"), mode = q.get("mode") === "event" ? "event" : "periodic", ev = q.get("ev") || "";
  if (!FIDS.includes(fid)) return xml(SAY("Sorry, this demo call is not configured.") + "<Hangup/>");
  const brief = await (await fetch(`${origin}/data/briefs/${fid}.json`)).json();
  const event = mode === "event" ? brief.events[ev] : null;
  if (mode === "event" && !event) return xml(SAY("Sorry, this demo message was not found.") + "<Hangup/>");

  let form = {};
  if (request.method === "POST") { try { form = Object.fromEntries(await request.formData()); } catch {} }
  const sid = form.CallSid || q.get("sid") || "nosid";
  const steps = STEPS[mode];
  let s = await loadState(env, sid) || {mode, event: ev || null, started: Date.now(), turns: [], topics: [], changes: [], gaps: [],
                                         unanswered: [], messages: [], interest: null, escalate: false, wantsAdvisor: false, urgency: "none", reprompted: {}};

  // Twilio status callback (call ended): make sure the advisor gets a summary
  if (q.get("status")) {
    if (["completed", "busy", "no-answer", "failed", "canceled"].includes(form.CallStatus)) {
      if (!s.finalized && s.turns.length) { if (!s.closed) s.endedEarly = s.endedEarly || "client hung up"; await finalize(env, brief, s, sid); }
    }
    return new Response("", {status: 204});
  }

  const h = Number(q.get("h") || 0);
  const base = `${origin}/api/voice?fid=${fid}&mode=${mode}${ev ? `&ev=${encodeURIComponent(ev)}` : ""}`;
  const A = brief.advisor_first;
  const out = [], lines = [];
  const L = t => { lines.push(t); return `@@L${lines.length - 1}@@`; };   // placeholder, resolved to audio at the end
  const say = t => { const line = safe(t, brief); out.push(L(line)); s.turns.push({who: "ai", text: line}); };
  const gather = (step, extraXml = "") => {
    const p = safe(prompt(step, brief), brief);
    s.turns.push({who: "ai", text: p, step});
    out.push(`<Gather input="speech" language="en-US" speechTimeout="auto" timeout="7" actionOnEmptyResult="true" method="POST" action="${esc(`${base}&step=${step}&h=${h + 1}`)}">${extraXml}${L(p)}</Gather>`);
  };
  const close = async () => {
    s.closed = true;
    say(closing(brief, s));
    out.push("<Hangup/>");
    await finalize(env, brief, s, sid);
  };
  const endEarly = async (line, why) => { s.closed = true; s.endedEarly = why; say(line); out.push("<Hangup/>"); await finalize(env, brief, s, sid); };
  const nextOf = step => steps[steps.indexOf(step) + 1];
  const goto = async step => {
    if (!step || step === "S8" || step === "E5" || h >= 8) return close();
    if (step === "E2") {   // event: reason + calm first + the advisor-approved voice note, then ask how they feel
      say(`Thanks, ${brief.client_first_name}. I'm calling about something in the news, in this simulated demo: ${event.headline}.`);
      say(event.type === "market" ? "First, ups and downs like this are normal, and your plan was built with them in mind. Here's the short voice note your advisor approved for you."
                                  : "First, nothing here needs a decision today. Here's the short voice note your advisor approved for you.");
      s.turns.push({who: "ai", text: "[plays the advisor-approved voice note]"});
      return gather("E2", `<Play>${esc(`${origin}/${event.audio}`)}</Play>`);
    }
    return gather(step);
  };

  const step = q.get("step");
  if (!step) {                                    // call just connected
    await goto(steps[0]);
    await saveState(env, sid, s);
    return xml(await renderVoice(out.join(""), lines, env, origin));
  }

  const speech = String(form.SpeechResult || "").trim();
  if (!speech) {                                  // silence: re-ask once, then move on
    if (!s.reprompted[step]) { s.reprompted[step] = true; say("Sorry, I didn't catch that."); await goto(step); }
    else if (step === "S0" || step === "E0") await endEarly("I'll try you another time. Goodbye.", "no answer to verification");
    else await goto(nextOf(step));
    await saveState(env, sid, s);
    return xml(await renderVoice(out.join(""), lines, env, origin));
  }
  s.turns.push({who: "client", text: speech, step});
  const it = intents(speech);
  const verifyStep = step === "S0" || step === "E0";

  // ---- hard rules first (Prompt Pack section 1) ----
  if (it.includes("emergency")) {
    s.urgency = "urgent"; s.escalate = true; s.messages.push(speech);
    say(`I'm really sorry you're going through this. If you are in immediate danger, please call 911, or 988 for the Suicide and Crisis Lifeline. I'm flagging this to ${A} as urgent right now.`);
    await close();
  } else if (verifyStep && it.includes("wrong_person")) {
    await endEarly(`Sorry to bother you. I'll try ${brief.client_first_name} another time. Goodbye.`, "someone else answered");
  } else if (it.includes("busy") || (verifyStep && isNo(speech) && !isYes(speech))) {
    await endEarly("No problem at all, I'll call back at a better time. Goodbye.", "client busy, call back");
  } else if (it.includes("are_you_human") && !it.includes("wants_advisor")) {
    say(`No, I'm an AI assistant from ${A}'s office.`);
    await goto(verifyStep ? step : step);        // re-ask the same question
  } else if (it.includes("wants_to_end")) {
    await close();
  } else if (it.includes("life_event")) {
    s.changes.push({field: "life event", value: speech, source: "client statement", quote: speech}); s.escalate = true; s.urgency = s.urgency === "urgent" ? "urgent" : "normal";
    say(`Thank you for telling me, that's important. I'll make sure ${A} knows and follows up with you.`);
    await goto(mode === "event" ? "E5" : (steps.indexOf(step) < steps.indexOf("S7") ? "S7" : "S8"));
  } else if (it.includes("distressed")) {
    if (it.includes("asked_advice")) s.unanswered.push(speech);
    s.escalate = true; s.urgency = s.urgency === "urgent" ? "urgent" : "normal";
    say(`I hear you, and it's completely understandable to feel that way. I'll ask ${A} to follow up with you personally.`);
    await goto(mode === "event" ? "E5" : (steps.indexOf(step) < steps.indexOf("S7") ? "S7" : "S8"));
  } else if (it.includes("wants_advisor") && !verifyStep) {
    s.wantsAdvisor = true;
    say(`Of course. I'll ask ${A} to get in touch with you.`);
    await goto(mode === "event" ? "E5" : (steps.indexOf(step) < steps.indexOf("S7") ? "S7" : "S8"));
  } else {
    // ---- in-agenda handling ----
    if (it.includes("asked_advice")) { s.unanswered.push(speech); say(`That's exactly the kind of decision ${A} should help you with. I'll note it and ask them to get in touch.`); }
    if (it.includes("asked_unknown_number")) { s.unanswered.push(speech); say(`I don't have that in front of me, I'll note it for ${A}.`); }
    const worried = /worr|scared|nervous|anxious|concern|not great|bad/i.test(speech);
    switch (step) {
      case "S0": case "E0": break;                                   // verified
      case "S0b": {
        const tp = topicOf(speech, brief);
        if (tp) { s.topics.push(tp); say(`${brief.topics[tp]} I've noted for ${A} that you asked about it.`); }
        else if (!isNo(speech) && !/check.?in|usual|go ahead|snapshot|summary/i.test(speech) && !it.length) { s.unanswered.push(speech); say(`I don't have that in front of me, I'll note it for ${A}.`); }
        say("Now, the usual quick check-in.");
        break;
      }
      case "S1": say(worried ? "That's understandable, and it's exactly why we check in." : "Thanks, that's helpful."); break;
      case "S2": say(worried ? "That's completely understandable. Ups and downs are normal, and your plan was built with them in mind." : "Thanks for sharing that."); break;
      case "S3": s.gaps.push({id: brief.data_gap.id, answer: speech, quote: speech}); say("Got it, I've noted that for your file."); break;
      case "S4": say(worried ? `Thanks for being open about it. I'll let ${A} know.` : `Good to hear. I'll let ${A} know.`); break;
      case "S5": s.interest = isYes(speech) && !isNo(speech) ? true : isNo(speech) ? false : null;
                 say(s.interest ? `Great, I'll ask ${A} to walk you through it.` : "No problem."); break;
      case "S7": if (!(isNo(speech) && speech.split(/\s+/).length <= 5)) {
                   s.messages.push(speech); if (/today|urgent|asap|right away|soon/i.test(speech)) { s.wantsAdvisor = true; s.urgency = s.urgency === "none" ? "normal" : s.urgency; }
                   say(`I'll pass that on to ${A}.`);
                 } break;
      case "E2": say(worried ? "That's completely understandable." : "Thanks for telling me."); break;
      case "E4": if (isYes(speech) && !isNo(speech)) { s.wantsAdvisor = true; say(`I'll ask ${A} to call you.`); } else say("No problem."); break;
    }
    await goto(nextOf(step));
  }
  await saveState(env, sid, s);
  return xml(await renderVoice(out.join(""), lines, env, origin));
}
