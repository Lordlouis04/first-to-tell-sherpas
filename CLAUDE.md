# CLAUDE.md — Sherpas "First to know, first to tell" (CDTM VLC Hacks 2026)

## What we are building
An advisor-side tool that turns ONE event into personal, plan-grounded messages for each family,
and lets the advisor approve them in bulk. The advisor is the customer; families only see what the advisor approves.

Pipeline:
1. **Tracker** – an event (simulated, labelled `SIMULATED`) e.g. `tech_selloff` (Nvidia -30% in two weeks), `layoffs_at_employer`.
2. **Impact engine** – for each family: plan + client profile (from the Sherpas read-only MCP) + event -> JSON (see `prompts/impact_engine.md`).
3. **Advisor inbox** – drafts sorted by urgency x date of the goal at risk; approve all / edit / reject; shows "why this family" + cited plan figures.
4. **Family view** – approved message + ElevenLabs voice note (stock voice, labelled synthetic).

## Hard rules
- Every number in a message must come from the family's plan/profile data. Never invent figures.
- Never tell a family to buy or sell. Use "let's look at…", like Sherpas' own "We should look into…".
- Always send something, even when nothing changes ("no action needed, here's why").
- Synthetic families + public sources only. API keys only in backend `.env` (never commit). No real messages sent.
- Mark every simulated input as simulated in UI and README.

## Stack (keep it boring)
- Backend: Python + FastAPI. LLM call returns strict JSON (validate with pydantic; retry once on invalid).
- Frontend: simple React/Vite or plain HTML (or Lovable). Two screens: Advisor Inbox, Family View.
- ElevenLabs: text-to-speech for `voice_script` -> mp3 served by backend.
- Cache LLM + TTS outputs to `data/cache/` so the demo never depends on live calls.

## Families (ids)
weah, carter, johnson, lewis

## Deliverables (deadline 16:45)
- README: problem chosen, what we built, how to run, what it uses, what is simulated.
- Demo video, pitch deck (3 min).

## Working style
- Smallest working version first; demo must run end to end by 13:30.
- Don't add features not listed above without asking.
