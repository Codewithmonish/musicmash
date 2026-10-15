"""
DEV ONLY: create a demo analysis and a reference comparison through the real Spring API.

Two generated recordings of the same 24-note tune (0.5 s per note = 120 BPM, 12 s):
  * the REFERENCE: played perfectly;
  * the user's TAKE, with known mistakes:
      - the first E4 (at 1.0 s) is 40 cents sharp           -> intonation feedback (Phase 1/2)
      - notes 9-16 (4-8 s in the reference) are 35 cents sharp  -> "pitch_sharp" there (Phase 3)
      - notes 17-24 (8-12 s in the reference) are 20% faster    -> "rushing" there (Phase 3)

Steps, exactly as the frontend would do them:
  1. demo user: upload the take, create a performance, run the AI analysis
  2. demo host (role HOST): upload the reference and register it as a reference track
     (re-used on later runs), wait until its features are computed
  3. demo user: compare the analysed take with the reference, wait for the result
It prints the AI Analysis page URL; the ids go to logs/demo_seed.json for e2e_screenshot.py.

Usage (services running, from the repo root):
    music-mash-ai\\.venv\\Scripts\\python scripts\\demo_seed.py
Env: MUSICMASH_API (default http://localhost:8081/api), MUSICMASH_DEMO_EMAIL,
     MUSICMASH_DEMO_PASSWORD (throwaway local dev passwords, not secrets).
"""
import io
import json
import os
import sys
import time
from pathlib import Path

import httpx
import numpy as np
import soundfile as sf

API = os.environ.get("MUSICMASH_API", "http://localhost:8081/api")
FRONTEND = os.environ.get("MUSICMASH_FRONTEND", "http://localhost:5173")
EMAIL = os.environ.get("MUSICMASH_DEMO_EMAIL", "demo@musicmash.local")
PASSWORD = os.environ.get("MUSICMASH_DEMO_PASSWORD", "demo-pass-123")
USERNAME = "demo_player"
HOST_EMAIL, HOST_USERNAME = "host@musicmash.local", "demo_host"

SR = 22050
NOTE_S = 0.5            # 120 BPM, one note per beat
GAP_S = 0.05            # short silence between notes so every note has a clear onset
SHARP_NOTE = "E4"
SHARP_CENTS = 40.0
MELODY = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5",     # 0-4 s
          "B4", "A4", "G4", "F4", "E4", "D4", "C4", "D4",     # 4-8 s: played 35 c sharp
          "E4", "F4", "G4", "A4", "G4", "F4", "E4", "C4"]     # 8-12 s: played 20% faster
SHARP_SECTION, SHARP_SECTION_CENTS = range(8, 16), 35.0
RUSHED_SECTION, RUSHED_FACTOR = range(16, 24), 1.2
REFERENCE_TITLE = "Demo tune (reference)"
SEED_FILE = Path(__file__).resolve().parents[1] / "logs" / "demo_seed.json"


def note_hz(name: str) -> float:
    """Equal-tempered frequency (A4 = 440 Hz) of a note name like 'C#4'."""
    names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    midi = names.index(name[:-1]) + 12 * (int(name[-1]) + 1)
    return 440.0 * 2 ** ((midi - 69) / 12)


def tone(freq_hz: float, note_s: float) -> np.ndarray:
    """One note: 10 ms attack, steady tone, smooth 40 ms release, then a 10% gap.

    The smooth release matters: a 10 ms linear cut-off is effectively a click, which onset
    detection rightly reports as a second "onset" at the end of every note.
    """
    tone_n = int(SR * note_s * (1 - GAP_S / NOTE_S))
    gap_n = int(SR * note_s) - tone_n
    attack_n, release_n = int(SR * 0.01), int(SR * 0.04)
    envelope = np.ones(tone_n)
    envelope[:attack_n] = np.linspace(0, 1, attack_n)
    envelope[-release_n:] = 0.5 * (1 + np.cos(np.linspace(0, np.pi, release_n)))
    t = np.arange(tone_n) / SR
    return np.concatenate([0.5 * envelope * np.sin(2 * np.pi * freq_hz * t), np.zeros(gap_n)])


def to_wav(parts: list[np.ndarray]) -> bytes:
    buffer = io.BytesIO()
    sf.write(buffer, np.concatenate(parts).astype(np.float32), SR, format="WAV")
    return buffer.getvalue()


def make_reference() -> bytes:
    """The tune played exactly: in tune, steady 120 BPM."""
    return to_wav([tone(note_hz(name), NOTE_S) for name in MELODY])


def make_take() -> bytes:
    """The user's take with the three known mistakes listed in the module docstring."""
    parts = []
    for i, name in enumerate(MELODY):
        cents = SHARP_CENTS if i == MELODY.index(SHARP_NOTE) else 0.0
        if i in SHARP_SECTION:
            cents = SHARP_SECTION_CENTS
        note_s = NOTE_S / RUSHED_FACTOR if i in RUSHED_SECTION else NOTE_S
        parts.append(tone(note_hz(name) * 2 ** (cents / 1200), note_s))
    return to_wav(parts)


def check(response: httpx.Response, what: str) -> dict:
    if response.status_code >= 400:
        sys.exit(f"{what} failed: HTTP {response.status_code} {response.text[:300]}")
    return response.json()


def login(client: httpx.Client, username: str, email: str, role: str) -> str:
    """Register the account (or log in if it already exists) and return its JWT."""
    register = client.post("/auth/register", json={
        "username": username, "email": email, "password": PASSWORD, "role": role})
    if register.status_code < 400:
        print(f"Registered {role.lower()} {email}")
        return register.json()["token"]
    if register.status_code != 409:
        check(register, f"Register {email}")
    return check(client.post("/auth/login", json={"email": email, "password": PASSWORD}), f"Login {email}")["token"]


def wait_until_done(client: httpx.Client, url: str, what: str, timeout_s: float = 300) -> dict:
    """Poll a status URL until COMPLETED (returns the body) or FAILED / timeout (exits)."""
    deadline = time.monotonic() + timeout_s
    while True:
        body = check(client.get(url), what)
        if body["status"] == "COMPLETED":
            return body
        if body["status"] == "FAILED":
            sys.exit(f"{what} FAILED: {body.get('error_message')}")
        if time.monotonic() > deadline:
            sys.exit(f"{what} still {body['status']} after {timeout_s:.0f} s")
        time.sleep(2)


def upload(client: httpx.Client, wav: bytes, name: str) -> str:
    url = check(client.post("/upload/audio", files={"file": (name, wav, "audio/wav")}), "Upload")["url"]
    print(f"Uploaded {name} -> {url}")
    return url


def ensure_reference(client: httpx.Client) -> int:
    """Re-use the demo reference track if it exists, otherwise upload and register it as host."""
    for reference in check(client.get("/ai/references"), "List references"):
        if reference["title"] == REFERENCE_TITLE and reference["status"] == "COMPLETED":
            print(f"Re-using reference track {reference['id']}")
            return reference["id"]
    host = httpx.Client(base_url=API, timeout=30)
    host.headers["Authorization"] = f"Bearer {login(host, HOST_USERNAME, HOST_EMAIL, 'HOST')}"
    reference = check(host.post("/ai/references", json={
        "title": REFERENCE_TITLE, "artist": "MusicMash demo", "instrument": "VIOLIN",
        "audioUrl": upload(host, make_reference(), "demo-reference.wav")}), "Create reference")
    print(f"Created reference track {reference['id']}, computing its features...")
    wait_until_done(host, f"/ai/references/{reference['id']}", "Reference")
    return reference["id"]


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252
    with httpx.Client(base_url=API, timeout=30) as client:
        client.headers["Authorization"] = f"Bearer {login(client, USERNAME, EMAIL, 'USER')}"

        # 1. Analyse the take (Phase 1/2).
        take_url = upload(client, make_take(), "demo-take.wav")
        performance = check(client.post("/performances", json={
            "title": "Demo: tune with a sharp E4, a sharp phrase and a rushed ending",
            "description": "Generated by scripts/demo_seed.py.",
            "category": "CLASSICAL", "instrument": "VIOLIN", "difficulty": "BEGINNER",
            "audioUrl": take_url}), "Create performance")
        analysis_id = check(client.post("/ai/analyze", json={
            "performanceId": performance["id"], "audioUrl": take_url,
            "instrument": "VIOLIN", "category": "CLASSICAL"}), "Submit analysis")["id"]
        print(f"Submitted analysis {analysis_id}, waiting for the AI service...")
        wait_until_done(client, f"/ai/status/{analysis_id}", f"Analysis {analysis_id}")

        result = check(client.get(f"/ai/result/{analysis_id}"), "Result")
        features, skill = result["audio_features"], result["skill_prediction"]
        print(f"Analysis {analysis_id} COMPLETED")
        print(f"  notes: {' '.join(n['note_name'] for n in features['notes'])}")
        first_e4 = next(n for n in features["notes"] if n["note_name"] == SHARP_NOTE)
        print(f"  first {SHARP_NOTE} measured: {first_e4['mean_cents']:+.1f} cents (played {SHARP_CENTS:+.0f})")
        print(f"  intonation {skill['intonation_score']}  rhythm {skill['rhythm_score']}  "
              f"overall {skill['overall_score']}  level {skill['predicted_level']}")

        # 2 + 3. Compare the take with the reference (Phase 3).
        reference_id = ensure_reference(client)
        comparison_id = check(client.post("/ai/compare", json={
            "referenceId": reference_id, "analysisId": analysis_id}), "Submit comparison")["id"]
        print(f"Submitted comparison {comparison_id}, waiting...")
        wait_until_done(client, f"/ai/compare/{comparison_id}/status", f"Comparison {comparison_id}")
        comparison = check(client.get(f"/ai/compare/{comparison_id}/result"), "Comparison result")
        print(f"Comparison {comparison_id} COMPLETED: similarity {comparison['similarity']}, "
              f"overall tempo {comparison['tempo_ratio']}x")
        for section in comparison["problem_sections"]:
            print(f"  {section['issue']:<13} {section['ref_start']:>5.1f}-{section['ref_end']:<5.1f} s  {section['detail']}")

    SEED_FILE.parent.mkdir(exist_ok=True)
    SEED_FILE.write_text(json.dumps({"analysis_id": analysis_id, "comparison_id": comparison_id,
                                     "email": EMAIL}, indent=2))
    print(f"\nOpen: {FRONTEND}/ai-analysis/{analysis_id}?comparison={comparison_id}  (log in as {EMAIL})")


if __name__ == "__main__":
    main()
