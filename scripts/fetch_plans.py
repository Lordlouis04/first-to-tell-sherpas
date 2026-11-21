"""Fetch the 4 public Sherpas shared plans and decode the embedded React Router
turbo-stream loader data into plain JSON -> data/families/<id>.json (plan only)."""
import json, re, sys, urllib.request
from pathlib import Path

PLANS = {  # links from the challenge brief PDF ("Open plan")
    "weah":    "https://app.sherpaswealth.com/plan/shared/RcCtgoNkGmD6dvGtYVKWLGefdCTFdc4JP_jH9Jbz2jo",
    "carter":  "https://app.sherpaswealth.com/plan/shared/ZshH0AUJjZnvwKIYtP5wYKyvI6Nc1nsGwQlDncXLfek",
    "johnson": "https://app.sherpaswealth.com/plan/shared/FjVPq_UEwSMxaye8aOWj3osJWWSE3cDnYWcxm1X7I78",
    "lewis":   "https://app.sherpaswealth.com/plan/shared/vyV2h64-qSet-sJuwkAHxw-iUaYV88Lkwsg29L2Y5y8",
}
SPECIAL = {-1: None, -2: float("nan"), -3: float("-inf"), -4: -0.0, -5: None, -6: float("inf"), -7: None}

def decode(arr):
    cache = {}
    def h(i):
        if i < 0:
            return SPECIAL.get(i)
        if i in cache:
            return cache[i]
        v = arr[i]
        if isinstance(v, list):
            if v and isinstance(v[0], str) and v[0] in ("D", "R", "S", "Y", "U", "B", "E", "P", "M", "Z", "W"):
                tag = v[0]
                if tag == "D":
                    out = v[1]  # timestamp
                elif tag == "Y":
                    out = arr[v[1]] if isinstance(v[1], int) else v[1]
                else:
                    out = [tag] + v[1:]
                cache[i] = out
                return out
            out = []
            cache[i] = out
            out.extend(h(x) for x in v)
            return out
        if isinstance(v, dict):
            out = {}
            cache[i] = out
            for k, x in v.items():
                out[arr[int(k[1:])]] = h(x)
            return out
        cache[i] = v
        return v
    return h(0)

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=60).read().decode("utf8")
    chunks = re.findall(r'streamController\.enqueue\((".*?")\);', html, re.S)
    arr = json.loads(json.loads(chunks[0]))
    root = decode(arr)
    return root["loaderData"]["routes/(public-plan)/plan.shared.$token"]["plan"]

if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "data" / "families"
    out.mkdir(parents=True, exist_ok=True)
    for fid, url in PLANS.items():
        if len(sys.argv) > 1 and fid not in sys.argv[1:]:
            continue
        plan = fetch(url)
        (out / f"{fid}.json").write_text(json.dumps({"family_id": fid, "source_url": url, "plan": plan, "profile": None}, indent=2, ensure_ascii=False), encoding="utf8")
        print(fid, "ok")
