# Synapsis — Sherpas challenge "First to know, first to tell", CDTM Valencia Hacks 2026

## Problem we chose
A financial advisor looks after ~150 families. When something happens (markets fall, a family member's
employer announces layoffs), every family should hear what it means **for them** from their advisor,
before they have to ask, and the advisor can't hand-write 30 personal messages a day.
We cover **Tracker → personal message → advisor approval at scale** (brief: "Markets fall" and "Communications").

## What we built
1. **Tracker (simulated)**: six events covering the brief's moments, each routed only to the families it touches:
   - Markets fall: `tech_selloff_2026_11` (Nvidia -30% in two weeks, US equities ~-8%), all 4 families.
   - Markets: `rate_cut_2026_11` (Fed -0.5 points) for Johnson, Weah and Carter; `home_prices_2026_11` (+6%) for Carter, Weah and Lewis.
   - The law changes: `tax_limits_2027` (higher 401(k)/IRA/HSA limits) for Lewis, Carter and Johnson.
   - The family's life changes: `layoffs_johnson_employer` for Johnson; `tuition_2027` (+5%) for Lewis.
   The first two events are in `prompts/impact_engine.md`; the rest are in `prompts/events_extra.json`.
2. **Impact engine** (`backend/impact.py`): for each family, combines the event with the family's Sherpas plan
   and returns strict JSON: affected / action type / urgency, the goal at risk, why this family, the plan figures cited,
   a draft message (≤120 words) and a voice script (≤60 words).
   - Validated with pydantic, with one retry if the output is invalid.
   - **Grounding check:** every `$` and `%` in the message must appear verbatim in the plan or event inputs; otherwise the output is rejected.
   - Never says buy or sell ("let's look at…"), and always sends something, even when the answer is "no action needed".
3. **Advisor inbox** (`web/`): drafts are sorted by urgency × how soon the goal at risk is. The advisor sees "why this family"
   and the cited plan figures, and can approve all / edit / reject.
4. **Family view** (`web/`): shows only the message the advisor approved, with a voice note.
   `backend/tts.py` turns each `voice_script` into an mp3 using an ElevenLabs **stock voice**. The mp3s are cached in
   `web/audio/` and labelled as synthetic.

## What is simulated
- **All six events** are simulated and labelled `SIMULATED` everywhere.
- **Families** are the 4 synthetic Sherpas case families (Weah, Carter, Johnson, Lewis).
- **The current drafts** in `data/cache/impact/` were written offline in a Claude Code session following
  `prompts/impact_engine.md`, and passed through the same schema and grounding checks (`generated_by: "offline-draft"`),
  because no API key was available yet. Regenerate them with the API (see below).
- **The client profile** (how each person decides, what worries them) was not available: we used the public shared plans only.
  Risk profiles come from the plan text, and the advisor note flags anything to confirm.
- **No real messages are sent.** Approval state lives in the viewer's browser.

## Data used
The public "Open plan" links from the challenge brief. `scripts/fetch_plans.py` decodes the data embedded in each
shared-plan page (Financial health, Investment analysis and the Living map projection) into `data/families/<id>.json`.

## How to run
```bash
python -m venv .venv && .venv/Scripts/pip install anthropic pydantic python-dotenv   # (macOS/Linux: .venv/bin/pip)
python scripts/fetch_plans.py                       # refresh plan data (optional, already committed)
cp backend/.env.example backend/.env                # add ANTHROPIC_API_KEY (and ELEVENLABS_API_KEY)
python backend/impact.py tech_selloff_2026_11 --force   # regenerate drafts with Claude (claude-opus-5-5)
python backend/tts.py                               # voice notes (ElevenLabs, cached in web/audio)
python scripts/export_web.py                        # bundle drafts + audio for the web
python scripts/build_briefs.py                      # call briefs for the AI calls + plan assistant
python -m http.server -d web 8000                   # open http://localhost:8000
```
Without an API key, the cached drafts are used, so the demo never depends on a live call.

5. **Update frequency**: each family chooses weekly, two-weekly or monthly personalized updates. Urgent alerts
   (urgency ≥ 70) always go out as soon as the advisor approves them; everything else waits for the next update. Nothing is dropped.
6. **Interactive AI phone calls (demo)**: real calls through Twilio (trial: 75 free minutes) to one pre-registered
   demo number (`DEMO_TO` secret), protected by a PIN (`CALL_PIN`). Twilio keys are Cloudflare secrets, never in the repo.
   - *Event call* ("Call me with this message"): identity and verification, calm first, the advisor-approved voice note,
     "how do you feel?", and an offer to have the advisor call.
   - *Periodic check-in* ("Talk to us"): steps S0–S8 of our call Prompt Pack (verify, topic of the client's choice,
     snapshot, news, one data-gap question, upcoming goal, one plan point, message for the advisor, close).
   - **The loop is controlled by code, not by a model** (`functions/_lib/engine.js`). Each line comes from a per-family
     CALL_BRIEF (`scripts/build_briefs.py`, every figure checked against the plan). Twilio speech recognition gives the
     client's words. Keyword intents apply the hard rules: no advice, honest "I'm an AI", escalate life events, distress
     and requests for the advisor, safety line with 911/988, busy, wrong person. A validator checks every line
     (only brief numbers, blocked phrases). No LLM key is needed, and nothing can be invented.
   - **Assistant voice:** ElevenLabs stock voice "Sarah" (the advisor's voice notes use "George", so the AI never sounds like the advisor).
     Every line a call can say (122 lines, all 4 families, all branches) is pre-generated by `scripts/build_tts_cache.mjs`
     into `web/tts/`. Live calls never wait and spend no credits. Safety nets: runtime generation cached in KV (if the
     `ELEVENLABS_API_KEY` secret is set), then Twilio's own voice.
   - After hang-up, the post-call extraction and a 10-second advisor summary ("all good" when nothing matters) are saved in
     Cloudflare KV (`CALLS` binding) and shown in the advisor's **Client check-ins**.
7. **Client app extras**: *Report a change* (for example "we're buying a car"), saved as a client statement for the advisor
   to validate. *Ask about your plan* answers only from the family's brief and routes decisions or unknown questions to the advisor.

## Deploy
`web/` is a static site deployed on Cloudflare Pages: no build command, output directory `web`.
Each push to `main` redeploys it.

## Stack
Python, Anthropic SDK (Claude), pydantic, ElevenLabs text-to-speech, plain HTML/JS, Cloudflare Pages.
