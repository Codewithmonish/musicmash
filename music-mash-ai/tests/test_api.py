"""API tests. Audio is generated in code and written into a temporary upload dir."""
import numpy as np
import pytest

SR = 22050


def tone(freq_hz: float = 440.0, seconds: float = 2.0) -> np.ndarray:
    return 0.5 * np.sin(2 * np.pi * freq_hz * np.arange(int(SR * seconds)) / SR)


def submit(client, **fields) -> dict:
    payload = {"performance_id": 1, "user_id": 1, **fields}
    return client.post("/api/ai/analyze", json=payload)


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert data["status"] == "running"


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_analyze_endpoint(client, setup_database, write_upload):
    name = write_upload(tone(), "a440.wav")
    response = submit(client, audio_file=name, instrument="PIANO", category="CLASSICAL")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["performance_id"] == 1
    assert data["user_id"] == 1
    assert data["status"] == "PENDING"  # status at the time it was queued


def test_analyze_endpoint_missing_fields(client, setup_database):
    response = client.post("/api/ai/analyze", json={"performance_id": 1})
    assert response.status_code == 422


def test_analyze_needs_a_file(client, setup_database):
    response = submit(client)
    assert response.status_code == 422
    assert "audio_file or video_file is required" in response.text


@pytest.mark.parametrize("bad_name", [
    "../secret.wav",                    # escapes the upload dir
    "..\\secret.wav",
    "sub/dir.wav",                      # no directories
    "C:\\Windows\\win.ini",             # absolute Windows path
    "/etc/passwd",                      # absolute POSIX path
    "http://example.com/audio.mp3",     # URLs are not accepted
    ".env",                             # hidden files
])
def test_analyze_rejects_anything_but_a_plain_file_name(client, setup_database, upload_dir, bad_name):
    response = submit(client, audio_file=bad_name)
    assert response.status_code == 422


def test_analyze_rejects_missing_upload(client, setup_database, upload_dir):
    response = submit(client, audio_file="not-uploaded.wav")
    assert response.status_code == 400
    assert "not found in the upload directory" in response.json()["detail"]


def test_status_endpoint(client, setup_database, write_upload):
    analysis_id = submit(client, audio_file=write_upload(tone())).json()["id"]
    response = client.get(f"/api/ai/status/{analysis_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == analysis_id
    assert data["status"] == "COMPLETED"


def test_status_endpoint_not_found(client, setup_database):
    assert client.get("/api/ai/status/99999").status_code == 404


def test_result_endpoint_not_completed(client, setup_database, upload_dir):
    (upload_dir / "broken.wav").write_bytes(b"not audio")  # exists, but cannot be decoded
    analysis_id = submit(client, audio_file="broken.wav").json()["id"]
    response = client.get(f"/api/ai/result/{analysis_id}")
    assert response.status_code == 400


def test_full_analysis_of_generated_audio(client, setup_database, write_upload):
    """End to end: a generated 440 Hz tone goes through /analyze and comes back measured."""
    name = write_upload(tone(), "a440.wav")
    analysis_id = submit(client, audio_file=name, instrument="VIOLIN").json()["id"]

    # TestClient runs the background task before returning, so the result is ready.
    response = client.get(f"/api/ai/result/{analysis_id}")
    assert response.status_code == 200
    data = response.json()

    features = data["audio_features"]
    assert features["mean_abs_cents"] < 5
    assert features["notes"][0]["note_name"] == "A4"
    assert features["pitch_fmin_hz"] == pytest.approx(196.0, abs=0.1)  # violin: G3
    assert features["tempo_bpm"] is None  # a single held tone has no rhythm
    assert "onsets" in features["unavailable_reasons"]["tempo_bpm"]

    skill = data["skill_prediction"]
    assert skill["intonation_score"] > 90
    assert skill["rhythm_score"] is None
    assert skill["predicted_level"] == "EXPERT"
    assert any("Accurate intonation" in s for s in skill["strengths"])


def test_unreadable_audio_marks_analysis_failed(client, setup_database, upload_dir):
    (upload_dir / "broken.wav").write_bytes(b"not audio")
    analysis_id = submit(client, audio_file="broken.wav").json()["id"]

    status = client.get(f"/api/ai/status/{analysis_id}").json()
    assert status["status"] == "FAILED"
    assert "Could not analyse the audio" in status["error_message"]


def test_pitch_contour_endpoint_shape_and_downsampling(client, setup_database, write_upload, monkeypatch):
    """A generated C-major scale comes back as a capped contour plus its 8 notes."""
    from app.services.audio import metrics

    monkeypatch.setattr(metrics, "CONTOUR_MAX_POINTS", 40)  # ~140 frames must shrink to <= 40
    freqs = np.repeat(440 * 2 ** ((np.array([60, 62, 64, 65, 67, 69, 71, 72]) - 69) / 12), int(0.4 * SR))
    scale = 0.5 * np.sin(2 * np.pi * np.cumsum(freqs) / SR)
    analysis_id = submit(client, audio_file=write_upload(scale, "scale.wav")).json()["id"]

    response = client.get(f"/api/ai/result/{analysis_id}/pitch-contour")
    assert response.status_code == 200
    data = response.json()

    assert data["analysis_id"] == analysis_id
    assert data["max_points"] == 40
    assert data["reason"] is None
    points = data["points"]
    assert 20 < len(points) <= 40
    assert set(points[0]) == {"t", "midi_float", "cents_off", "voiced"}
    assert [p["t"] for p in points] == sorted(p["t"] for p in points)
    for p in points:
        if p["voiced"]:
            assert 59.5 < p["midi_float"] < 72.5 and abs(p["cents_off"]) <= 50
        else:
            assert p["midi_float"] is None and p["cents_off"] is None

    assert [n["note_name"] for n in data["notes"]] == ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]
    assert set(data["notes"][0]) == {"start", "end", "midi", "note_name", "mean_cents"}

    # The (large) contour is not repeated in the main /result payload.
    assert "pitch_contour" not in client.get(f"/api/ai/result/{analysis_id}").json()["audio_features"]


def test_pitch_contour_is_empty_with_reason_for_unpitched_audio(client, setup_database, write_upload):
    noise = 0.1 * np.random.default_rng(0).standard_normal(SR * 2)
    analysis_id = submit(client, audio_file=write_upload(noise, "noise.wav")).json()["id"]

    data = client.get(f"/api/ai/result/{analysis_id}/pitch-contour").json()
    assert data["points"] == [] and data["notes"] == []
    assert "detectable pitch" in data["reason"]


def test_pitch_contour_errors(client, setup_database, upload_dir):
    assert client.get("/api/ai/result/99999/pitch-contour").status_code == 404
    (upload_dir / "broken.wav").write_bytes(b"not audio")
    failed_id = submit(client, audio_file="broken.wav").json()["id"]
    assert client.get(f"/api/ai/result/{failed_id}/pitch-contour").status_code == 400


def test_practice_attempt_can_be_analysed_without_a_performance(client, setup_database, write_upload):
    """Practice Arena attempts are not performances: performance_id may be omitted."""
    response = client.post("/api/ai/analyze", json={"user_id": 1, "audio_file": write_upload(tone(), "attempt.wav")})
    assert response.status_code == 200, response.text
    assert response.json()["performance_id"] is None
    result = client.get(f"/api/ai/result/{response.json()['id']}").json()
    assert result["analysis"]["performance_id"] is None
    assert result["skill_prediction"]["intonation_score"] > 90
