"""Every per-user AI endpoint answers only its owner. Another user gets the same 404 as for an id
that doesn't exist; a call without the X-User-Id header is rejected. Reference tracks are shared."""
import json

import pytest

from app.models import AIAnalysis, AnalysisStatus, AudioFeatures, Comparison, ReferenceTrack
from main import app
from tests.conftest import TestingSessionLocal

OWNER, OTHER = {"X-User-Id": "1"}, {"X-User-Id": "2"}


@pytest.fixture
def owned(setup_database) -> dict:
    """A completed analysis, a reference and a completed comparison, all belonging to user 1."""
    db = TestingSessionLocal()
    analysis = AIAnalysis(user_id=1, audio_file="take.wav", instrument="VIOLIN", status=AnalysisStatus.COMPLETED)
    reference = ReferenceTrack(title="Original", file_path="ref.wav", uploaded_by=9, status=AnalysisStatus.COMPLETED)
    db.add_all([analysis, reference])
    db.commit()
    db.add(AudioFeatures(analysis_id=analysis.id, mean_abs_cents=38.0, mean_signed_cents=31.0, notes="[]",
                         unavailable_reasons="{}", pitch_contour="[]"))
    comparison = Comparison(user_id=1, reference_id=reference.id, analysis_id=analysis.id,
                            performance_audio_file="take.wav", status=AnalysisStatus.COMPLETED,
                            result=json.dumps({"similarity": 80.0, "problem_sections": []}))
    db.add(comparison)
    db.commit()
    ids = {"analysis": analysis.id, "reference": reference.id, "comparison": comparison.id}
    db.close()
    return ids


@pytest.fixture
def coach_deps(kb):
    from app.api.coach import get_structured_llm
    from app.services.coach_service import get_knowledge_base
    app.dependency_overrides[get_knowledge_base] = lambda: kb
    app.dependency_overrides[get_structured_llm] = lambda: None
    yield
    del app.dependency_overrides[get_knowledge_base]
    del app.dependency_overrides[get_structured_llm]


ANALYSIS_READS = ["/api/ai/status/{analysis}", "/api/ai/result/{analysis}", "/api/ai/result/{analysis}/pitch-contour"]
COMPARISON_READS = ["/api/ai/compare/{comparison}/status"]


@pytest.mark.parametrize("path", ANALYSIS_READS + COMPARISON_READS)
def test_owner_can_read_and_others_get_the_same_404_as_a_missing_id(client, owned, path):
    url = path.format(**owned)
    assert client.get(url, headers=OWNER).status_code == 200
    other = client.get(url, headers=OTHER)
    missing = client.get(path.format(analysis=999_999, comparison=999_999), headers=OWNER)
    assert other.status_code == missing.status_code == 404
    assert other.json() == missing.json()     # nothing reveals that the id exists


@pytest.mark.parametrize("path", ANALYSIS_READS + COMPARISON_READS)
def test_calls_without_the_user_header_are_rejected(owned, path):
    from fastapi.testclient import TestClient
    assert TestClient(app).get(path.format(**owned)).status_code == 422


def test_comparison_result_is_owner_only(client, owned):
    url = f"/api/ai/compare/{owned['comparison']}/result"
    assert client.get(url, headers=OTHER).status_code == 404


def test_cannot_compare_another_users_analysis(client, owned):
    response = client.post("/api/ai/compare", headers=OTHER,
                           json={"user_id": 2, "reference_id": owned["reference"], "analysis_id": owned["analysis"]})
    assert response.status_code == 404
    assert response.json()["detail"] == "Analysis not found"


def test_coach_is_owner_only(client, owned, coach_deps):
    url = f"/api/ai/coach/{owned['analysis']}"
    assert client.post(url, headers=OTHER).status_code == 404
    assert client.post(url, headers=OWNER).status_code == 200


def test_reference_tracks_are_a_shared_library(client, owned):
    assert client.get(f"/api/ai/references/{owned['reference']}", headers=OTHER).status_code == 200
    assert any(r["id"] == owned["reference"] for r in client.get("/api/ai/references", headers=OTHER).json())
