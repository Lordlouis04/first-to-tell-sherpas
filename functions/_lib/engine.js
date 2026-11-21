// Interactive call engine (Prompt Pack v0.1, code-controlled loop).
// No LLM key is available, so each turn is chosen by CODE from the family's CALL_BRIEF:
// steps S0..S8 (periodic) or E0..E5 (event), global interruption rules (section 1 hard rules),
// keyword intent detection on Twilio's speech transcript, and the section-8 validator on every line.
// Twilio trial limit: max 10 action hops per call, so the agenda is kept to <= 8 client turns.

export const STEPS = {
  periodic: ["S0", "S0b", "S1", "S2", "S3", "S4", "S5", "S7", "S8"],
  event: ["E0", "E2", "E3", "E4", "E5"],
};

const has = (t, words) => words.some(w => new RegExp(`\\b${w}\\b`, "i").test(t));
const YES = ["yes", "yeah", "yep", "sure", "correct", "right", "speaking", "it is", "that's me", "this is", "of course", "ok", "okay", "go ahead", "please", "sounds good", "absolutely", "definitely", "i would", "i'd like"];
const NO = ["no", "nope", "not really", "nothing", "no thanks", "not now", "i don't think so", "all good", "i'm good", "that's it"];

// --- intents (checked every turn, most serious first) ---
export function intents(text) {
  const t = String(text || "").toLowerCase();
  const out = [];
  if (has(t, ["hurt myself", "kill myself", "suicide", "suicidal", "end my life", "emergency", "can't go on", "ambulance"])) out.push("emergency");
  if (has(t, ["laid off", "layoff", "layoffs", "lost my job", "fired", "divorce", "divorced", "passed away", "died", "death", "inheritance", "inherited", "hospital", "cancer", "diagnosed", "pregnant", "new baby", "bought a car", "buying a car", "new car", "bought a house", "buying a house", "new job", "promotion", "moving", "retiring early"])) out.push("life_event");
  if (has(t, ["talk to (my |the )?advisor", "speak to (my |the )?advisor", "speak to someone", "talk to someone", "real person", "a human", "call me back", "have (him|her|them) call", "mohamed"])) {
    if (has(t, ["are you (a )?real", "are you (a )?human", "are you a person", "am i talking to"])) out.push("are_you_human"); else out.push("wants_advisor");
  }
  if (has(t, ["are you (a )?real", "are you (a )?human", "are you a person", "are you a robot", "is this a robot", "am i talking to a"])) out.push("are_you_human");
  if (has(t, ["panic", "panicking", "terrified", "scared", "freaking out", "losing sleep", "really worried", "very worried", "so worried", "stressed out"])) out.push("distressed");
  if (has(t, ["should i", "do i sell", "sell everything", "sell my", "buy more", "should we", "move my money", "pull out", "what should i do", "is it a good time to"])) out.push("asked_advice");
  if (has(t, ["how much will", "how much would", "how much money will", "what will i have", "how much do i need", "what's my balance", "how much is my"])) out.push("asked_unknown_number");
  if (has(t, ["i'm busy", "i am busy", "not a good time", "bad time", "call me later", "call back later", "in a meeting", "driving"])) out.push("busy");
  if (has(t, ["wrong number", "not here", "this is his", "this is her", "you have the wrong", "who is this"])) out.push("wrong_person");
  if (has(t, ["goodbye", "bye", "hang up", "i have to go", "gotta go", "stop calling", "that's all", "end the call"])) out.push("wants_to_end");
  if (has(t, ["complain", "complaint", "unhappy with", "scam", "fraud", "lawyer", "lawsuit"])) out.push("wants_advisor");
  // big purchase plans ("I'm thinking of buying a car for 200k"; speech-to-text sometimes hears "bring a car")
  if (/\b(buy|buying|bought|bring|purchase|purchasing|get|getting|afford)\b[^.?!]{0,30}\b(car|truck|house|home|boat|apartment|condo|second home|vacation home|property|motorbike|motorcycle)\b/.test(t)
      || /\b(new|another)\s+(car|house|home|boat)\b/.test(t)) out.push("big_purchase");
  if (has(t, ["i have a question", "i've got a question", "can i ask", "a question", "my question", "answer my question", "can you tell me", "i want to ask", "i'd like to ask", "quick question", "i want to know"])) out.push("has_question");
  return out;
}
export const isQuestiony = t => /\?|\b(what|how|when|why|can you|could you|tell me|is it|do i|am i)\b/i.test(String(t || ""));
export function purchaseLine(brief) {
  return `That's a big decision, thanks for telling me. ${brief.purchase_context} I can't advise on it, but I've noted it so ${brief.advisor_first} can look at how it fits your plan with you.`;
}
export const isYes = t => has(String(t || "").toLowerCase(), YES);
export const isNo = t => has(String(t || "").toLowerCase(), NO);

const TOPIC_WORDS = {
  home: ["home", "house", "mortgage", "down payment"], cash: ["cash", "emergency fund", "savings account", "reserve", "liquidity", "cushion"],
  college: ["college", "tuition", "university", "529", "school", "ethan", "ava", "liam", "josh", "oliver", "sophia"],
  market: ["market", "stocks", "nvidia", "tech", "crash", "drop", "portfolio", "investments"], retirement: ["retire", "retirement", "401k", "401(k)", "pension"],
  debt: ["debt", "credit card", "card", "loan"], tax: ["tax", "taxes", "irs", "deduction"],
};
export function topicOf(text, brief) {
  const t = String(text || "").toLowerCase();
  for (const [k, ws] of Object.entries(TOPIC_WORDS)) if (brief.topics[k] && has(t, ws)) return k;
  return null;
}

// --- validator (section 8) ---
const BLOCKED = ["you should", "i recommend", "i suggest you", "\\bbuy\\b", "\\bsell\\b(?!-off)", "guarantee", "will recover", "will go up", "vulnerable", "critical", "aggressive", "risk profile", "your score"];
function allowedNumbers(brief) {
  const s = JSON.stringify(brief);
  return new Set((s.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(n => n.replace(/,/g, "")));
}
export function validate(line, brief) {
  const nums = (line.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(n => n.replace(/,/g, ""));
  const ok = allowedNumbers(brief);
  const badNum = nums.filter(n => !ok.has(n) && !/^(19|20)\d\d$/.test(n) && !["911", "988"].includes(n));
  const lower = line.toLowerCase();
  // "sell" / "buy" are allowed only inside the fixed advice-refusal line
  const badPhrase = BLOCKED.filter(p => new RegExp(p, "i").test(lower) && !lower.includes("that's exactly the kind of decision"));
  return {ok: !badNum.length && !badPhrase.length, badNum, badPhrase};
}
export function safe(line, brief) {
  const v = validate(line, brief);
  return v.ok ? line : `I'll note that for ${brief.advisor_first}.`;
}

// --- lines per step ---
export function prompt(step, brief, ctx = {}) {
  const A = brief.advisor_first, C = brief.client_first_name;
  switch (step) {
    case "S0": return `Hi, this is the AI assistant from ${brief.advisor_name}'s office, with your regular check-in. This call is recorded and ${A} gets a summary. Am I speaking with ${C}, and is now a good moment for about ${brief.target_minutes} minutes?`;
    case "S0b": return `Thanks, ${C}. Is there anything specific you'd like to talk about today, or shall I go through the usual quick check-in?`;
    case "S1": return `Here's a quick snapshot from your plan: ${brief.summary.line}, and ${brief.summary.strength}. One thing we keep an eye on is ${brief.summary.area}. Does that match how things feel on your side?`;
    case "S2": return `One thing from the news: ${brief.world_update}. How does that sit with you?`;
    case "S3": return brief.data_gap.question;
    case "S4": return `Looking ahead, your plan has ${brief.upcoming_goal.name} ${brief.upcoming_goal.when}. How are preparations going?`;
    case "S5": return `Something your plan highlights that's worth talking through with ${A}: ${brief.plan_point}. Would you like ${A} to walk you through that?`;
    case "S7": return `Is there anything you'd like me to pass on to ${A}?`;
    case "Q": return "Of course. What's your question?";
    case "E0": return `Hi, this is the AI assistant from ${brief.advisor_name}'s office, with a short update for you. This call is recorded and ${A} gets a summary. Am I speaking with ${C}?`;
    case "E2": return `How do you feel about it, and is anything worrying you?`;
    case "E3": return `Is there anything about this you'd like to ask, or anything on your mind?`;
    case "E4": return `Would you like ${A} to call you about it?`;
    default: return "";
  }
}

export function closing(brief, state) {
  const A = brief.advisor_first, C = brief.client_first_name;
  if (state.urgency === "urgent") return `Thank you for telling me, ${C}. ${A} will be in touch with you very soon. Please take care. Goodbye.`;
  const passing = state.escalate ? `this to ${A} so they can follow up` : state.wantsAdvisor ? `your request to ${A}`
    : (state.messages.length || state.interest ? `your notes to ${A}` : `a short summary to ${A}`);
  return `Thanks, ${C}. I'll pass ${passing}. Your next check-in will follow the schedule you chose in your app. Have a lovely day. Goodbye.`;
}

// --- post-call: extraction (section 5) + advisor summary (section 6), deterministic ---
export function extract(brief, state) {
  const client = state.turns.filter(t => t.who === "client").map(t => t.text).join(" ").toLowerCase();
  const emotion = state.urgency === "urgent" || /worr|scared|panic|stress|nervous|anxious|concern|can't go on|afraid/.test(client) ? "worried" : /great|good|fine|happy|glad|perfect/.test(client) ? "positive" : "calm";
  return {
    client: brief.household, call_type: state.mode, event: state.event || null,
    duration_estimate_min: Math.max(1, Math.round((Date.now() - state.started) / 60000)),
    topics_mentioned: [...new Set(state.topics)], emotion,
    wants_advisor: !!state.wantsAdvisor || !!state.escalate, urgency: state.urgency || "none",
    stated_changes: state.changes, data_gaps_answered: state.gaps, plan_points_interest: state.interest === null ? [] : [{id: "P1", interested: state.interest}],
    unanswered_questions: state.unanswered, client_messages_for_advisor: state.messages,
    ended_early: state.endedEarly || null,
  };
}
export function summarize(brief, x) {
  const who = brief.household;
  const pts = [];
  if (x.event && brief.events[x.event]) pts.push(`Event call: ${brief.events[x.event].headline} (simulated)`);
  x.stated_changes.forEach(c => pts.push(`Client says: "${c.quote}"`));
  x.unanswered_questions.forEach(q => pts.push(`Asked: "${q}" (not answered on the call)`));
  if (x.plan_points_interest.length && x.plan_points_interest[0].interested) pts.push(`Wants a walk-through: ${brief.plan_point}`);
  if (x.topics_mentioned.length) pts.push(`Raised: ${x.topics_mentioned.join(", ")}`);
  x.data_gaps_answered.forEach(g => pts.push(`File question answered: "${g.answer}"`));
  const important = x.urgency !== "none" || x.wants_advisor || x.stated_changes.length || x.client_messages_for_advisor.length
    || x.emotion === "worried" || x.unanswered_questions.length || (x.plan_points_interest[0] || {}).interested;
  const headline = x.urgency === "urgent" ? `${who}: URGENT, safety concern raised on the call`
    : x.stated_changes.length ? (x.stated_changes.some(c => c.field === "planned purchase") ? `${who}: is planning a big purchase` : `${who}: reported a life change`)
    : x.wants_advisor ? `${who}: wants to talk with you`
    : x.ended_early ? `${who}: call ended early (${x.ended_early})`
    : important ? `${who}: check-in done, a few things to note` : `${who}: all good, nothing needs action`;
  const asks = x.client_messages_for_advisor.length ? x.client_messages_for_advisor.map(m => `"${m}"`).join("; ") + (x.urgency === "urgent" ? " (today)" : x.wants_advisor ? " (this week)" : " (no rush)")
    : x.wants_advisor ? `Wants you to get in touch (${x.urgency === "urgent" ? "today" : "this week"})` : "Nothing";
  const next = x.urgency === "urgent" ? "Call the client today."
    : x.stated_changes.length ? "Talk through how the change affects the plan."
    : x.wants_advisor ? "Schedule a short call to talk it through."
    : important ? "Mention these points at the next check-in." : "No action needed; next check-in as scheduled.";
  return {headline, key_points: pts.slice(0, 3), client_asks: asks, next_step: next, all_good: !important, emotion: x.emotion};
}
