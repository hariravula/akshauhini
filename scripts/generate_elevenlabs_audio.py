#!/usr/bin/env python3
"""
Generate ElevenLabs studio narration MP3s for Akshauhini stories.

Zero third-party dependencies (uses Python stdlib).

Examples:
  # 1. List all voices available on your ElevenLabs subscription
  python scripts/generate_elevenlabs_audio.py --list-voices

  # 2. Audition a voice on Scene 01 (Bhishmacharya) only
  python scripts/generate_elevenlabs_audio.py --voice "George" --only 01

  # 3. Generate all 21 scenes + Prologue + Epilogue (skips unchanged files)
  python scripts/generate_elevenlabs_audio.py --voice "George"

Environment:
  Set ELEVENLABS_API_KEY (or XI_API_KEY) in your shell or in a gitignored `.env`
  file in the repository root:
    ELEVENLABS_API_KEY=sk_...
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API_BASE = "https://api.elevenlabs.io/v1"
REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_STORY_DIR = REPO_ROOT / "stories" / "banners-of-kurukshetra"


def load_dotenv(env_path: Path) -> None:
    """Load simple KEY=VALUE lines from a local .env file without overriding shell env."""
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


def get_api_key() -> str:
    load_dotenv(REPO_ROOT / ".env")
    key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("XI_API_KEY")
    if not key:
        sys.exit(
            "Error: ELEVENLABS_API_KEY is not set.\n"
            "Set it in PowerShell:\n"
            '  $env:ELEVENLABS_API_KEY = "your_key_here"\n'
            f"Or add ELEVENLABS_API_KEY=... to {REPO_ROOT / '.env'} (gitignored)."
        )
    return key.strip()


def api_request(
    method: str,
    path: str,
    api_key: str,
    body: dict | None = None,
    accept: str = "application/json",
    timeout: int = 120,
) -> bytes:
    url = f"{API_BASE}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {
        "xi-api-key": api_key,
        "Accept": accept,
    }
    if data is not None:
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ElevenLabs API error {exc.code} on {path}: {detail}") from exc


def fetch_voices(api_key: str) -> list[dict]:
    payload = json.loads(api_request("GET", "/voices", api_key).decode("utf-8"))
    return payload.get("voices", [])


def list_voices(api_key: str) -> None:
    voices = fetch_voices(api_key)
    if not voices:
        print("No voices returned for this account.")
        return
    print(f"Found {len(voices)} voices in your ElevenLabs account:\n")
    print(f"{'NAME':<26} {'VOICE ID':<24} {'CATEGORY':<12} {'LABELS'}")
    print("-" * 92)
    for v in sorted(voices, key=lambda x: (x.get("category", ""), x.get("name", "").lower())):
        labels = v.get("labels") or {}
        label_str = ", ".join(f"{k}={val}" for k, val in labels.items() if val)
        print(
            f"{v.get('name', ''):<26.26} "
            f"{v.get('voice_id', ''):<24} "
            f"{v.get('category', ''):<12.12} "
            f"{label_str}"
        )


def resolve_voice(api_key: str, voice_arg: str, voice_name_override: str | None = None) -> tuple[str, str]:
    """Accept either a voice_id or a case-insensitive voice name."""
    is_voice_id = len(voice_arg) >= 16 and voice_arg.isalnum()
    if is_voice_id and voice_name_override:
        return voice_arg, voice_name_override

    if is_voice_id:
        try:
            detail = json.loads(
                api_request("GET", f"/voices/{urllib.parse.quote(voice_arg)}", api_key).decode("utf-8")
            )
            return detail.get("voice_id", voice_arg), detail.get("name") or voice_arg
        except Exception:
            # Scoped TTS-only keys may lack voices_read; use voice_id directly.
            return voice_arg, voice_arg

    voices = fetch_voices(api_key)
    for v in voices:
        if v.get("voice_id") == voice_arg:
            return v["voice_id"], voice_name_override or v.get("name", voice_arg)
    lowered = voice_arg.strip().lower()
    exact = [v for v in voices if v.get("name", "").strip().lower() == lowered]
    if len(exact) == 1:
        return exact[0]["voice_id"], voice_name_override or exact[0]["name"]
    partial = [v for v in voices if lowered in v.get("name", "").strip().lower()]
    if len(partial) == 1:
        return partial[0]["voice_id"], voice_name_override or partial[0]["name"]
    if len(partial) > 1:
        names = ", ".join(f"{v['name']} ({v['voice_id']})" for v in partial)
        sys.exit(f"Ambiguous voice name '{voice_arg}'. Matches: {names}\nPass the exact voice_id.")
    sys.exit(
        f"Voice '{voice_arg}' not found in your account. "
        "Run with --list-voices to see available voice names and IDs."
    )


def probe_duration_sec(audio_path: Path) -> float | None:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return None
    try:
        out = subprocess.check_output(
            [
                ffprobe,
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(audio_path),
            ],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        return round(float(out), 2)
    except Exception:
        return None


def build_tracks(story_data: dict, include_bookends: bool) -> list[dict]:
    tracks: list[dict] = []
    story = story_data["story"]
    if include_bookends and story.get("prologue"):
        tracks.append(
            {
                "key": "prologue",
                "filename": "00-prologue.mp3",
                "label": "Prologue",
                "text": f"{story['title']}. {story['subtitle']}.\n\n{story['prologue']}",
            }
        )

    for s in story_data["scenes"]:
        tracks.append(
            {
                "key": s["number"],
                "sceneId": s["id"],
                "filename": f"{s['imageSlug']}.mp3",
                "label": f"{s['number']} {s['warrior']}",
                "text": f"{s['warrior']}. {s['emblem']}.\n\n{s['script']}",
            }
        )

    if include_bookends and story.get("epilogue"):
        tracks.append(
            {
                "key": "epilogue",
                "filename": "22-epilogue.mp3",
                "label": "Epilogue",
                "text": f"Epilogue.\n\n{story['epilogue']}",
            }
        )
    return tracks


def hash_track(text: str, settings: dict) -> str:
    payload = json.dumps({"text": text, "settings": settings}, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def write_manifest(audio_dir: Path, manifest: dict) -> None:
    json_path = audio_dir / "manifest.json"
    js_path = audio_dir / "manifest.js"
    json_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    js_path.write_text(
        "// Auto-generated by scripts/generate_elevenlabs_audio.py\n"
        "window.AKSHAUHINI_AUDIO = "
        + json.dumps(manifest, indent=2, ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate ElevenLabs narration MP3s for an Akshauhini story."
    )
    parser.add_argument(
        "--story-dir",
        type=Path,
        default=DEFAULT_STORY_DIR,
        help="Path to the story directory containing scripts.json",
    )
    parser.add_argument(
        "--list-voices",
        action="store_true",
        help="List all voices available in your ElevenLabs account and exit",
    )
    parser.add_argument(
        "--voice",
        help="ElevenLabs voice name or voice_id (run --list-voices to browse)",
    )
    parser.add_argument(
        "--voice-name",
        help="Optional friendly display name for the narrator badge (e.g. 'Morgan')",
    )
    parser.add_argument(
        "--model",
        default="eleven_multilingual_v2",
        help="ElevenLabs model_id (default: eleven_multilingual_v2)",
    )
    parser.add_argument(
        "--output-format",
        default="mp3_44100_128",
        help="Output audio format (default: mp3_44100_128)",
    )
    parser.add_argument(
        "--stability",
        type=float,
        default=0.52,
        help="Voice stability 0.0-1.0 (default: 0.52 for expressive epic narration)",
    )
    parser.add_argument(
        "--similarity",
        type=float,
        default=0.78,
        help="Voice similarity_boost 0.0-1.0 (default: 0.78)",
    )
    parser.add_argument(
        "--style",
        type=float,
        default=0.22,
        help="Voice style exaggeration 0.0-1.0 (default: 0.22)",
    )
    parser.add_argument(
        "--speed",
        type=float,
        default=0.95,
        help="Speaking speed 0.7-1.2 (default: 0.95 for cinematic pacing)",
    )
    parser.add_argument(
        "--only",
        help="Comma-separated keys to generate (e.g. '01' or 'prologue,01,06,epilogue')",
    )
    parser.add_argument(
        "--no-bookends",
        action="store_true",
        help="Skip generating Prologue and Epilogue audio",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate MP3s even if hash matches existing files",
    )
    args = parser.parse_args()

    api_key = get_api_key()

    if args.list_voices:
        list_voices(api_key)
        return

    if not args.voice:
        sys.exit("Error: pass --voice <name_or_id> (or run --list-voices first).")

    scripts_path = args.story_dir / "scripts.json"
    if not scripts_path.exists():
        sys.exit(f"Error: scripts.json not found at {scripts_path}")

    story_data = json.loads(scripts_path.read_text(encoding="utf-8"))
    voice_id, voice_name = resolve_voice(api_key, args.voice, args.voice_name)
    print(f"Using ElevenLabs voice: {voice_name} ({voice_id}) | model: {args.model}")

    audio_dir = args.story_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = audio_dir / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        manifest = {"provider": "elevenlabs", "tracks": {}}

    manifest["provider"] = "elevenlabs"
    manifest["voiceId"] = voice_id
    manifest["voiceName"] = voice_name
    manifest["modelId"] = args.model
    manifest["outputFormat"] = args.output_format
    manifest.setdefault("tracks", {})

    settings_fingerprint = {
        "voiceId": voice_id,
        "modelId": args.model,
        "outputFormat": args.output_format,
        "stability": args.stability,
        "similarity": args.similarity,
        "style": args.style,
        "speed": args.speed,
    }

    tracks = build_tracks(story_data, include_bookends=not args.no_bookends)
    only_keys = (
        {k.strip().lower().zfill(2) if k.strip().isdigit() else k.strip().lower() for k in args.only.split(",")}
        if args.only
        else None
    )

    generated = 0
    skipped = 0
    total_chars = 0

    for idx, track in enumerate(tracks):
        key = track["key"]
        if only_keys is not None and key.lower() not in only_keys:
            continue

        out_path = audio_dir / track["filename"]
        h = hash_track(track["text"], settings_fingerprint)
        existing = manifest["tracks"].get(key)

        if not args.force and out_path.exists() and existing and existing.get("hash") == h:
            print(f"  [skip] {track['label']} (unchanged)")
            skipped += 1
            continue

        body: dict = {
            "text": track["text"],
            "model_id": args.model,
            "voice_settings": {
                "stability": args.stability,
                "similarity_boost": args.similarity,
                "style": args.style,
                "use_speaker_boost": True,
                "speed": args.speed,
            },
        }
        # Pass neighboring text for consistent prosody across consecutive scenes
        if idx > 0:
            body["previous_text"] = tracks[idx - 1]["text"][-260:]
        if idx + 1 < len(tracks):
            body["next_text"] = tracks[idx + 1]["text"][:260]

        query = urllib.parse.urlencode({"output_format": args.output_format})
        path = f"/text-to-speech/{urllib.parse.quote(voice_id)}?{query}"

        print(f"  [gen ] {track['label']} ({len(track['text'])} chars)...", end=" ", flush=True)
        audio_bytes = api_request("POST", path, api_key, body=body, accept="audio/mpeg")
        out_path.write_bytes(audio_bytes)
        dur = probe_duration_sec(out_path)
        size_kb = len(audio_bytes) // 1024
        print(f"OK ({size_kb} KB{f', {dur:.1f}s' if dur else ''})")

        manifest["tracks"][key] = {
            "file": f"audio/{track['filename']}",
            "bytes": len(audio_bytes),
            "durationSec": dur,
            "hash": h,
        }
        write_manifest(audio_dir, manifest)
        generated += 1
        total_chars += len(track["text"])
        time.sleep(0.25)

    write_manifest(audio_dir, manifest)
    print(
        f"\nDone! Generated: {generated} ({total_chars} chars), Skipped: {skipped}.\n"
        f"Manifest updated at: {manifest_path}"
    )


if __name__ == "__main__":
    main()
