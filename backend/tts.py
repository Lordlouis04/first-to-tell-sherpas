"""Voice notes: each cached draft's voice_script -> mp3 with an ElevenLabs stock voice.

Usage:
    python backend/tts.py            # generate missing mp3s
    python backend/tts.py --force    # regenerate all

Reads  data/cache/impact/*.json
Writes web/audio/<event_id>__<family_id>.mp3 (cached; served by the static site)
The voice is a synthetic stock voice and is labelled as such in the Family view.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "cache" / "impact"
AUDIO = ROOT / "web" / "audio"
VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"  # ElevenLabs premade stock voice ("George")
MODEL_ID = "eleven_multilingual_v2"

load_dotenv(ROOT / "backend" / ".env")


def synthesize(text: str, out: Path) -> None:
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("ELEVENLABS_API_KEY missing in backend/.env")
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128",
        data=json.dumps({"text": text, "model_id": MODEL_ID}).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            out.write_bytes(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs error {e.code}: {e.read().decode(errors='replace')[:300]}")


if __name__ == "__main__":
    force = "--force" in sys.argv
    AUDIO.mkdir(parents=True, exist_ok=True)
    for f in sorted(CACHE.glob("*.json")):
        out = AUDIO / f"{f.stem}.mp3"
        if out.exists() and not force:
            print(f"cached  {out.name}")
            continue
        script = json.loads(f.read_text(encoding="utf8"))["voice_script"]
        synthesize(script, out)
        print(f"wrote   {out.name} ({out.stat().st_size // 1024} KB)")
