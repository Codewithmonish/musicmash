"""API tests for reference tracks and comparisons, with generated melodies as uploads."""
import pytest

from app.core.config import settings
from tests.test_alignment import TUNE, melody


@pytest.fixture
def features_dir(tmp_path, monkeypatch):
    folder = tmp_path / "reference_features"
    monkeypatch.setattr(settings, "REFERENCE_FEATURES_DIR", str(folder))
    return folder


@pytest.fixture
def reference_id(client, setup_database, write_upload, features_dir):
    """A reference track created from the clean melody (features computed by the background task)."""
    name = write_upload(melody(TUNE), "reference.wav")
    response = client.post("/api/ai/references", json={
        "title": "Test tune", "artist": "Generated", "instrument": "VIOLIN", "audio_file": name, "uploaded_by": 9})
    assert response.status_code == 200, response.text
    return response.json()["id"]


def compare(client, **fields):
    return client.post("/api/ai/compare", json={"user_id": 1, **fields})


def test_reference_upload_precomputes_features(client, reference_id, features_dir):
    reference = client.get(f"/api/ai/references/{reference_id}").json()
    assert reference["status"] == "COMPLETED"
    assert reference["duration_s"] == pytest.approx(8.0, abs=0.3)
    assert (features_dir / f"reference_{reference_id}.npz").exists()
    assert [r["id"] for r in client.get("/api/ai/references").json()] == [reference_id]


def test_compare_flags_the_sharp_half(client, reference_id, write_upload):
    take = write_upload(melody(TUNE, cents=[0.0] * 8 + [50.0] * 8), "take.wav")
    queued = compare(client, reference_id=reference_id, performance_audio_file=take)
    assert queued.status_code == 200, queued.text
    comparison_id = queued.json()["id"]

    assert client.get(f"/api/ai/compare/{comparison_id}/status").json()["status"] == "COMPLETED"
    result = client.get(f"/api/ai/compare/{comparison_id}/result").json()
    assert result["reference"]["title"] == "Test tune"
    assert result["similarity"] > 90 and result["reliable"]
    assert [(p["issue"], p["ref_start"], p["ref_end"]) for p in result["problem_sections"]] == [
        ("pitch_sharp", 4.0, 8.0)]
    assert set(result["problem_sections"][0]) == {"ref_start", "ref_end", "user_start", "user_end", "issue", "detail"}
    assert result["tempo_curve"] and result["path"]


def test_compare_can_reuse_the_audio_of_an_analysis(client, reference_id, write_upload):
    take = write_upload(melody(TUNE, note_s=0.5 / 1.2), "faster.wav")
    analysis_id = client.post("/api/ai/analyze", json={
        "performance_id": 5, "user_id": 1, "audio_file": take}).json()["id"]

    comparison_id = compare(client, reference_id=reference_id, analysis_id=analysis_id).json()["id"]
    result = client.get(f"/api/ai/compare/{comparison_id}/result").json()
    assert result["tempo_ratio"] == pytest.approx(1.2, abs=0.03)
    assert {p["issue"] for p in result["problem_sections"]} == {"rushing"}


@pytest.mark.parametrize("fields, status", [
    ({"reference_id": 1}, 422),                                                    # no audio source
    ({"reference_id": 1, "performance_audio_file": "a.wav", "analysis_id": 1}, 422),  # both sources
    ({"reference_id": 1, "performance_audio_file": "../a.wav"}, 422),              # not a plain name
])
def test_compare_request_validation(client, setup_database, fields, status):
    assert compare(client, **fields).status_code == status


def test_compare_errors(client, reference_id, upload_dir):
    assert compare(client, reference_id=999, performance_audio_file="x.wav").status_code == 404
    assert compare(client, reference_id=reference_id, performance_audio_file="missing.wav").status_code == 400
    assert compare(client, reference_id=reference_id, analysis_id=999).status_code == 404
    assert client.get("/api/ai/compare/999/status").status_code == 404


def test_broken_reference_fails_and_cannot_be_compared(client, setup_database, upload_dir, features_dir):
    (upload_dir / "broken.wav").write_bytes(b"not audio")
    reference_id = client.post("/api/ai/references", json={"title": "Broken", "audio_file": "broken.wav"}).json()["id"]
    reference = client.get(f"/api/ai/references/{reference_id}").json()
    assert reference["status"] == "FAILED" and "Could not analyse" in reference["error_message"]

    (upload_dir / "take.wav").write_bytes(b"x")
    response = compare(client, reference_id=reference_id, performance_audio_file="take.wav")
    assert response.status_code == 400 and "not ready" in response.json()["detail"]


def test_unreadable_performance_marks_comparison_failed(client, reference_id, upload_dir):
    (upload_dir / "broken-take.wav").write_bytes(b"not audio")
    comparison_id = compare(client, reference_id=reference_id, performance_audio_file="broken-take.wav").json()["id"]
    status = client.get(f"/api/ai/compare/{comparison_id}/status").json()
    assert status["status"] == "FAILED" and "Could not compare" in status["error_message"]
    assert client.get(f"/api/ai/compare/{comparison_id}/result").status_code == 400
