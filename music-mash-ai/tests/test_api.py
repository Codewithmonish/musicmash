import pytest
from fastapi.testclient import TestClient
from main import app
from app.database.database import init_db, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.database import Base

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture
def setup_database():
    """Setup test database."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_root_endpoint():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert data["status"] == "running"


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_analyze_endpoint(setup_database):
    """Test analyze performance endpoint."""
    request_data = {
        "performance_id": 1,
        "user_id": 1,
        "audio_url": "http://example.com/audio.mp3",
        "video_url": "http://example.com/video.mp4",
        "instrument": "PIANO",
        "category": "CLASSICAL"
    }
    
    response = client.post("/api/ai/analyze", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["performance_id"] == 1
    assert data["user_id"] == 1
    assert data["status"] in ["PENDING", "PROCESSING"]


def test_analyze_endpoint_missing_fields(setup_database):
    """Test analyze endpoint with missing required fields."""
    request_data = {
        "performance_id": 1
        # Missing user_id
    }
    
    response = client.post("/api/ai/analyze", json=request_data)
    assert response.status_code == 422


def test_status_endpoint(setup_database):
    """Test get analysis status endpoint."""
    # First create an analysis
    request_data = {
        "performance_id": 1,
        "user_id": 1,
        "audio_url": "http://example.com/audio.mp3"
    }
    
    create_response = client.post("/api/ai/analyze", json=request_data)
    analysis_id = create_response.json()["id"]
    
    # Get status
    response = client.get(f"/api/ai/status/{analysis_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == analysis_id
    assert "status" in data


def test_status_endpoint_not_found(setup_database):
    """Test status endpoint with non-existent analysis."""
    response = client.get("/api/ai/status/99999")
    assert response.status_code == 404


def test_result_endpoint_not_completed(setup_database):
    """Test result endpoint when analysis not completed."""
    # Create an analysis
    request_data = {
        "performance_id": 1,
        "user_id": 1,
        "audio_url": "http://example.com/audio.mp3"
    }
    
    create_response = client.post("/api/ai/analyze", json=request_data)
    analysis_id = create_response.json()["id"]
    
    # Try to get result immediately (should not be completed yet)
    response = client.get(f"/api/ai/result/{analysis_id}")
    assert response.status_code == 400


def test_full_analysis_of_generated_audio(setup_database, tmp_path):
    """End to end: a generated 440 Hz tone goes through /analyze and comes back measured."""
    import numpy as np
    import soundfile as sf

    sr = 22050
    tone = 0.5 * np.sin(2 * np.pi * 440 * np.arange(sr * 2) / sr)
    audio_path = tmp_path / "a440.wav"
    sf.write(audio_path, tone, sr)

    create_response = client.post("/api/ai/analyze", json={
        "performance_id": 1, "user_id": 1, "audio_url": str(audio_path), "instrument": "VIOLIN"
    })
    analysis_id = create_response.json()["id"]

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
    assert skill["pitch_score"] > 90
    assert skill["rhythm_score"] is None
    assert skill["predicted_level"] == "EXPERT"
    assert any("Accurate intonation" in s for s in skill["strengths"])


def test_unreadable_audio_marks_analysis_failed(setup_database, tmp_path):
    create_response = client.post("/api/ai/analyze", json={
        "performance_id": 1, "user_id": 1, "audio_url": str(tmp_path / "missing.wav")
    })
    analysis_id = create_response.json()["id"]

    status = client.get(f"/api/ai/status/{analysis_id}").json()
    assert status["status"] == "FAILED"
    assert "Could not analyse the audio" in status["error_message"]


def _analyse_generated_audio(tmp_path, signal, name="take.wav"):
    import soundfile as sf
    path = tmp_path / name
    sf.write(path, signal, 22050)
    response = client.post("/api/ai/analyze", json={
        "performance_id": 1, "user_id": 1, "audio_url": str(path)
    })
    return response.json()["id"]


def test_pitch_contour_endpoint_shape_and_downsampling(setup_database, tmp_path, monkeypatch):
    """A generated C-major scale comes back as a capped contour plus its 8 notes."""
    import numpy as np
    from app.services.audio import metrics

    monkeypatch.setattr(metrics, "CONTOUR_MAX_POINTS", 40)  # ~140 frames must shrink to <= 40
    sr = 22050
    freqs = np.repeat(440 * 2 ** ((np.array([60, 62, 64, 65, 67, 69, 71, 72]) - 69) / 12), int(0.4 * sr))
    scale = 0.5 * np.sin(2 * np.pi * np.cumsum(freqs) / sr)
    analysis_id = _analyse_generated_audio(tmp_path, scale)

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


def test_pitch_contour_is_empty_with_reason_for_unpitched_audio(setup_database, tmp_path):
    import numpy as np
    noise = 0.1 * np.random.default_rng(0).standard_normal(22050 * 2)
    analysis_id = _analyse_generated_audio(tmp_path, noise, "noise.wav")

    data = client.get(f"/api/ai/result/{analysis_id}/pitch-contour").json()
    assert data["points"] == [] and data["notes"] == []
    assert "detectable pitch" in data["reason"]


def test_pitch_contour_errors(setup_database, tmp_path):
    assert client.get("/api/ai/result/99999/pitch-contour").status_code == 404
    failed_id = client.post("/api/ai/analyze", json={
        "performance_id": 1, "user_id": 1, "audio_url": str(tmp_path / "missing.wav")
    }).json()["id"]
    assert client.get(f"/api/ai/result/{failed_id}/pitch-contour").status_code == 400
