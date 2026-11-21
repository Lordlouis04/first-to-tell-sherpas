"""Bundle cached impact results + family names into web/data/drafts.json for the static site."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "cache" / "impact"
AUDIO = ROOT / "web" / "audio"
OUT = ROOT / "web" / "data" / "drafts.json"


def household(fid):
    plan = json.loads((ROOT / "data" / "families" / f"{fid}.json").read_text(encoding="utf8"))["plan"]
    hh = plan["household"]
    names = [p["name"] for p in (hh.get("client"), hh.get("spouse")) if p]
    return {"names": names, "surname": hh["client"]["surname"], "advisor": plan["advisor"]}


drafts = []
for f in sorted(CACHE.glob("*.json")):
    r = json.loads(f.read_text(encoding="utf8"))
    audio = AUDIO / f"{f.stem}.mp3"
    r["household"] = household(r["family_id"])
    r["audio"] = f"audio/{audio.name}" if audio.exists() else None
    r["id"] = f.stem
    drafts.append(r)

import sys  # noqa: E402
sys.path.insert(0, str(ROOT / "backend"))
from impact import load_prompt  # noqa: E402

from impact import plan_digest, FAMILY_IDS  # noqa: E402

used = {d["event_id"] for d in drafts}
events = [e for e in load_prompt()[1].values() if e["event_id"] in used]


def family_data(fid):
    """Goals with dates + full yearly projection (Living map) for the charts."""
    raw = json.loads((ROOT / "data" / "families" / f"{fid}.json").read_text(encoding="utf8"))["plan"]
    fh = next(a for a in raw["analyses"] if a["plan"] == "financialHealth")["diagnosticPayload"]["data"]
    proj = fh["/client/networth.json"]["projected"]
    hh = raw["household"]
    retire = sorted({p["retirementDate"][:7] for p in hh.values() if p and p.get("retirementDate")})
    goals = [g for g in plan_digest(fid)["goals"] if g["year"]]
    return {
        "names": [p["name"] for p in hh.values() if p],
        "retirement": retire,
        "goals": goals,
        "projection": [{"year": r["year"], "net_worth": round(r["netWorth"]), "investable": round(r["totalPortfolios"])}
                       for r in proj],
    }


families = {fid: family_data(fid) for fid in FAMILY_IDS}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"events": events, "drafts": drafts, "families": families}, indent=1, ensure_ascii=False), encoding="utf8")
print(f"wrote {len(drafts)} drafts -> {OUT.relative_to(ROOT)}")
