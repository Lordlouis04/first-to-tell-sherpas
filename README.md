# First to Tell — Sherpas challenge, CDTM Valencia Hacks 2026

## Problem we chose
A financial advisor looks after ~150 families. When something happens (markets fall, a family member's
employer announces layoffs), every family should hear what it means **for them** from their advisor,
before they have to ask, and the advisor can't hand-write 30 personal messages a day.
We cover **Tracker → personal message → advisor approval at scale** (brief: "Markets fall" and "Communications").

## What we built
1. **Tracker (simulated)**: one event, e.g. `tech_selloff_2026_11` (Nvidia -30% in two weeks, US equities ~-8%).
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
- **The event** is simulated and labelled `SIMULATED` everywhere.
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
python -m http.server -d web 8000                   # open http://localhost:8000
```
Without an API key, the cached drafts are used, so the demo never depends on a live call.

## Deploy
`web/` is a static site deployed on Cloudflare Pages: no build command, output directory `web`.
Each push to `main` redeploys it.

## Stack
Python, Anthropic SDK (Claude), pydantic, ElevenLabs text-to-speech, plain HTML/JS, Cloudflare Pages.
