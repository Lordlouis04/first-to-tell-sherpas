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

used = {d["event_id"] for d in drafts}
events = [e for e in load_prompt()[1].values() if e["event_id"] in used]
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"events": events, "drafts": drafts}, indent=1, ensure_ascii=False), encoding="utf8")
print(f"wrote {len(drafts)} drafts -> {OUT.relative_to(ROOT)}")
