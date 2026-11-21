# Synapsis — Sherpas challenge "First to know, first to tell" (CDTM Valencia Hacks 2026)

**Every family hears it from their advisor first.** When a law changes, markets move or a family's life changes,
Synapsis drafts a personal message for every family it touches, using only figures from their own Sherpas plan.
The advisor approves in bulk, and each family gets a message, a voice note and an AI check-in call.

**Live demo:** https://first-to-tell-sherpas.pages.dev
- Advisor view: https://first-to-tell-sherpas.pages.dev/advisor/
- Client app (mobile): https://first-to-tell-sherpas.pages.dev/client/?family=lewis (families: `lewis`, `carter`, `johnson`, `weah`)

Calls, SMS and saving approvals need the demo PIN, and calls only ring one pre-registered demo phone. Everything else is open.

## Problem we chose
One advisor, ~150 families, and each one wants to feel like the only one. Families hear about changes from the news first;
silence reads as "nobody is watching"; and the advisor can't approve 30 personal drafts a day one by one.
We cover the brief's **Tracker → personal message → advisor approval at scale**, plus **AI check-in calls**, built on what
the plan already knows about each family.

## What we built
| Piece | What it does | Where |
|---|---|---|
| **Tracker** (simulated) | 6 events, each routed only to the families it touches: tech sell-off (all 4), Fed rate cut, home prices +6%, **new 2027 contribution limits (law)**, layoffs at Daniel Johnson's employer, tuition +5% | `prompts/impact_engine.md`, `prompts/events_extra.json` |
| **Impact engine** | Event × family plan → strict JSON: impact, urgency, goal at risk, why this family, cited plan figures, message (≤120 words), voice script (≤60 words). Pydantic validation, one retry, and a **grounding check**: every `$`/`%` must appear in the plan or event, or the output is rejected. Never says buy or sell; always sends something ("no action needed" included) | `backend/impact.py` |
| **Advisor view** | Opens on **Client check-ins** (AI call summaries: 10-second summary, transcript, requests, *Done*, *Call again*; client-reported changes). Per event: who it touches, **who needs you first** (urgency × time to goal), plan calendar, drafts with *why this family* and cited figures; approve / edit / reject / approve all. Approving one draft can phone the family (demo toggle) | `web/advisor/` |
| **Client app** | Simple mobile app: next step, the advisor's approved message + **voice note**, upcoming calls, **Call me now**, preferences (how often, what time), **Report a change**, **Ask about your plan** chat (answers only from their plan, routes decisions to the advisor), missed-call banner | `web/client/` |
| **Voice notes** | Each approved message has an ElevenLabs stock-voice note ("George"), labelled synthetic | `backend/tts.py`, `web/audio/` |
| **Interactive AI calls** | Real phone calls via Twilio. *Event call*: identity + verification, calm first, the approved voice note, "how do you feel?", an open turn (questions, big purchases, comments), offer the advisor. *Periodic check-in*: verify, client's topic, snapshot, news (incl. the new law), one data-gap question, upcoming goal, one plan point, message for the advisor. Handles "I have a question", big purchases (with context from their plan), "should I sell?" (no advice), "are you a person?", distress/emergency (911/988), busy, wrong person | `functions/api/voice.js`, `functions/_lib/engine.js` |
| **Missed-call defence** | No answer → SMS (urgent vs not), a "No answer" row for the advisor with *Call again*, and a banner in the client app | `functions/_lib/sms.js` |

**The call loop is controlled by code, not by a model.** Every line comes from a per-family brief whose figures are
checked against the plan (`scripts/build_briefs.py`). A validator blocks any number not in the brief and phrases like
"you should" or "buy". The assistant speaks with an ElevenLabs stock voice ("Sarah", so it never sounds like the advisor).
All 130+ possible lines are pre-generated (`scripts/build_tts_cache.mjs` → `web/tts/`), so calls never wait and spend no credits.

## What is simulated
- **All six events** are simulated and labelled *SIMULATED* in the UI.
- **Families:** the 4 synthetic Sherpas case families. Plan data comes from the brief's public "Open plan" links
  (`scripts/fetch_plans.py` → `data/families/`).
- **Drafts:** written offline in a Claude Code session following `prompts/impact_engine.md` and passed through the same schema and
  grounding checks (`generated_by: "offline-draft"`), because no Anthropic API key was available. `backend/impact.py` regenerates them with Claude.
- **Client behavioural profile** (from the Sherpas MCP) was not available. We use the plan, its risk profiles, and what families tell us in calls and in the app.
- **No real messages are sent to clients.** Calls and SMS only reach one pre-registered demo phone (Twilio trial).

## How to run
```bash
python -m venv .venv && .venv/Scripts/pip install anthropic pydantic python-dotenv   # macOS/Linux: .venv/bin/pip
cp backend/.env.example backend/.env                       # ANTHROPIC_API_KEY, ELEVENLABS_API_KEY (never committed)
python scripts/fetch_plans.py                              # plan data (already committed)
python backend/impact.py tech_selloff_2026_11 --force      # regenerate drafts with Claude
python backend/tts.py                                      # voice notes
python scripts/export_web.py && python scripts/build_briefs.py
node scripts/build_tts_cache.mjs --generate                # assistant voice for every call line
python -m http.server -d web 8000                          # static UI at http://localhost:8000 (calls need Cloudflare)
```
**Deploy:** Cloudflare Pages (output dir `web`, Functions in `functions/`), auto-deployed on every push to `main`.
Secrets (Cloudflare): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `DEMO_TO`, `CALL_PIN`; KV binding `CALLS`
(call summaries, shared approvals, preferences, client changes).

## Stack
Python, pydantic, Anthropic SDK (Claude), ElevenLabs text-to-speech, Twilio Voice + SMS, Cloudflare Pages + Functions + KV, plain HTML/JS.
Pitch deck: `pitch/Synapsis_pitch.pptx`.
