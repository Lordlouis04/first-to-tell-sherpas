"""Impact engine: one EVENT x one FAMILY -> validated JSON draft for the advisor.

Usage:
    python backend/impact.py tech_selloff_2026_11            # all 4 families
    python backend/impact.py tech_selloff_2026_11 carter     # one family
    python backend/impact.py tech_selloff_2026_11 --force    # ignore cache

Reads  data/families/<id>.json (from scripts/fetch_plans.py)
Writes data/cache/impact/<event_id>__<family_id>.json
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Literal

import anthropic
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError, field_validator

ROOT = Path(__file__).resolve().parent.parent
PROMPT_FILE = ROOT / "prompts" / "impact_engine.md"
FAMILIES_DIR = ROOT / "data" / "families"
CACHE_DIR = ROOT / "data" / "cache" / "impact"
FAMILY_IDS = ["weah", "carter", "johnson", "lewis"]
MODEL = "claude-opus-5-5"

load_dotenv(ROOT / "backend" / ".env")


# ---------- output schema ----------
class GoalAtRisk(BaseModel):
    name: str
    date: str = Field(description="YYYY-MM or YYYY")


class PlanFigure(BaseModel):
    figure: str = Field(description="Exactly as written in PLAN/PROFILE/EVENT, e.g. '$113,300' or '73.5%'")
    meaning: str
    source: str = Field(description="Where it comes from, e.g. 'PLAN.summary'")


class ImpactResult(BaseModel):
    family_id: str
    event_id: str
    affected: Literal["high", "medium", "low", "none"]
    action_type: Literal["act", "understand", "reassure"]
    urgency_score: int = Field(ge=0, le=100)
    goal_at_risk: GoalAtRisk | None
    why_this_family: str
    plan_figures_cited: list[PlanFigure]
    tone: Literal["calm-first", "numbers-first", "joint-couple"]
    subject: str
    draft: str
    voice_script: str
    advisor_note: str
    simulated_inputs: list[str]
    generated_by: str = "claude-api"  # "offline-draft" when written in a Claude Code session, not via the API

    @field_validator("draft")
    @classmethod
    def _draft_len(cls, v: str) -> str:
        if len(v.split()) > 130:  # prompt says 120; small tolerance
            raise ValueError(f"draft has {len(v.split())} words (max 120)")
        return v

    @field_validator("voice_script")
    @classmethod
    def _voice_len(cls, v: str) -> str:
        if len(v.split()) > 66:
            raise ValueError(f"voice_script has {len(v.split())} words (max 60)")
        return v


# ---------- inputs ----------
def load_prompt() -> tuple[str, dict[str, dict]]:
    """System prompt = everything before the fixtures; events parsed from the fixture block."""
    text = PROMPT_FILE.read_text(encoding="utf8")
    system = text.split("# Event fixtures")[0].strip()
    fixtures = re.search(r"# Event fixtures.*?```json\s*(\[.*?\])\s*```", text, re.S)
    events = {e["event_id"]: e for e in json.loads(fixtures.group(1))}
    extra = ROOT / "prompts" / "events_extra.json"  # more simulated events, kept outside the team prompt
    if extra.exists():
        events.update({e["event_id"]: e for e in json.loads(extra.read_text(encoding="utf8"))})
    return system, events


def _md(data: dict) -> dict[str, str]:
    return {k.split("/")[-1].removesuffix(".md"): v for k, v in data.items() if k.startswith("inputs/main/")}


def plan_digest(family_id: str) -> dict:
    """Compact, LLM-sized view of the Sherpas plan: household, goals, and every narrative section
    (the narratives carry the plan's figures verbatim)."""
    raw = json.loads((FAMILIES_DIR / f"{family_id}.json").read_text(encoding="utf8"))
    plan = raw["plan"]
    by_type = {a["plan"]: a["diagnosticPayload"]["data"] for a in plan["analyses"]}
    fh, pf = by_type.get("financialHealth", {}), by_type.get("portfolio", {})

    goals = []
    buckets = pf.get("/client/profile.json", {}).get("financialBuckets", [])
    for b in buckets:
        if b.get("category") == "GOAL":
            d = b.get("data") or {}
            goals.append({"name": b["name"], "type": b.get("subcategory"), "amount": d.get("value"),
                          "frequency": d.get("frequency"), "year": d.get("originationYear")})

    # Living map: year-by-year projection. Keep this year, the next 3, goal years and retirement year.
    hh = plan["household"]
    key_years = {g["year"] for g in goals if g["year"]}
    key_years |= {int(p["retirementDate"][:4]) for p in hh.values() if p and p.get("retirementDate")}
    proj = fh.get("/client/networth.json", {}).get("projected", [])
    first = proj[0]["year"] if proj else 0
    living_map = [
        {"year": r["year"], "net_worth_nominal_projection": round(r["netWorth"]), "investable": round(r["totalPortfolios"]),
         "other_assets": round(r["totalAssets"]), "debts": round(r["totalDebts"])}
        for r in proj if r["year"] <= first + 3 or r["year"] in key_years
    ]

    return {
        "analysis_date": plan.get("analysisDate"),
        "household": hh,
        "goals": goals,
        "living_map_projection": living_map,
        "financial_health": _md(fh),
        "portfolio": _md(pf),
    }


def profile_for(family_id: str) -> dict | None:
    raw = json.loads((FAMILIES_DIR / f"{family_id}.json").read_text(encoding="utf8"))
    return raw.get("profile")


# ---------- grounding check ----------
_NUM = re.compile(r"\$\s?\d[\d,]*(?:\.\d+)?\s?(?:[KkMm](?![a-z]))?|\d+(?:\.\d+)?\s?%")


def _norm(s: str) -> str:
    return s.replace(" ", "").replace(",", "").lower()


def ungrounded_figures(result: ImpactResult, source_text: str) -> list[str]:
    """Money/percent figures in draft/voice/citations that don't appear verbatim in the inputs."""
    src = _norm(source_text)
    found = set()
    for text in [result.draft, result.voice_script, *(f.figure for f in result.plan_figures_cited)]:
        for m in _NUM.findall(text):
            n = _norm(m)
            # dollar figures may come from structured fields (e.g. goal "amount": 550000) without "$"
            if n not in src and not (n.startswith("$") and re.search(rf"(?<![\d.]){re.escape(n[1:])}(?![\d])", src)):
                found.add(m.strip())
    return sorted(found)


# ---------- LLM call ----------
def run_impact(event_id: str, family_id: str, client: anthropic.Anthropic | None = None,
               force: bool = False) -> ImpactResult:
    cache_file = CACHE_DIR / f"{event_id}__{family_id}.json"
    if cache_file.exists() and not force:
        return ImpactResult.model_validate_json(cache_file.read_text(encoding="utf8"))

    system, events = load_prompt()
    event = events[event_id]
    digest = plan_digest(family_id)
    profile = profile_for(family_id)
    inputs = {
        "EVENT": event,
        "PLAN": digest,
        "PROFILE": profile if profile is not None else
        "NOT AVAILABLE - only the plan narrative is provided. Infer risk comfort only from what PLAN says; "
        "flag anything you would need from the profile in advisor_note.",
    }
    source_text = json.dumps(inputs, ensure_ascii=False)
    user = (f"family_id: {family_id}\nevent_id: {event_id}\n\n"
            + "\n\n".join(f"## {k}\n```json\n{json.dumps(v, indent=1, ensure_ascii=False)}\n```"
                          for k, v in inputs.items()))

    client = client or anthropic.Anthropic()
    messages = [{"role": "user", "content": user}]
    last_err = None
    for attempt in range(2):  # retry once on invalid output
        try:
            resp = client.messages.parse(
                model=MODEL,
                max_tokens=16000,
                system=system,
                messages=messages,
                output_format=ImpactResult,
                output_config={"effort": "medium"},
            )
            if resp.stop_reason == "refusal":
                raise RuntimeError(f"model refused: {resp.stop_details}")
            result = resp.parsed_output
            if result is None:
                raise ValueError("no parsed output")
            bad = ungrounded_figures(result, source_text)
            if bad:
                raise ValueError(f"figures not found in PLAN/PROFILE/EVENT: {bad}")
            result.family_id, result.event_id = family_id, event_id
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            cache_file.write_text(result.model_dump_json(indent=2), encoding="utf8")
            return result
        except (ValidationError, ValueError) as e:
            last_err = e
            print(f"  [{family_id}] attempt {attempt + 1} invalid: {e}", file=sys.stderr)
            messages = [{"role": "user", "content": user + f"\n\nYour previous answer was rejected: {e}. "
                         "Fix it and use only figures that appear verbatim in the inputs."}]
    raise RuntimeError(f"{family_id}: invalid output after retry: {last_err}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    if not args:
        sys.exit(__doc__)
    event_id, fams = args[0], (args[1:] or FAMILY_IDS)
    client = anthropic.Anthropic()
    for fid in fams:
        r = run_impact(event_id, fid, client, force=force)
        print(f"{fid:8} {r.affected:6} {r.action_type:10} urgency={r.urgency_score:3} tone={r.tone}  "
              f"goal={r.goal_at_risk.name + ' ' + r.goal_at_risk.date if r.goal_at_risk else '-'}")
