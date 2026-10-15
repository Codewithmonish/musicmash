"""
Contract test: the exact JSON Spring sends to POST /api/ai/analyze, and the shape it reads back.

The fixtures live in <repo>/contracts/ and are also used by Spring's AIServiceContractTest,
so a format change on either side fails a test.
"""
import json
from pathlib import Path

import numpy as np

from app.schemas import AnalysisResponse

CONTRACTS = Path(__file__).resolve().parents[2] / "contracts"


def load(name: str) -> dict:
    return json.loads((CONTRACTS / name).read_text(encoding="utf-8"))


def test_spring_request_is_accepted_and_response_matches_contract(client, setup_database, write_upload):
    request = load("ai-analyze-request.json")
    tone = 0.5 * np.sin(2 * np.pi * 440 * np.arange(22050) / 22050)
    write_upload(tone, request["audio_file"])

    response = client.post("/api/ai/analyze", json=request)

    assert response.status_code == 200, response.text
    body = response.json()
    expected = load("ai-analyze-response.json")
    assert set(body) == set(expected)  # exactly the keys Spring maps into AIAnalysisResponseDTO
    assert body["performance_id"] == request["performance_id"]
    assert body["user_id"] == request["user_id"]
    assert body["status"] == "PENDING"


def test_contract_response_example_is_valid():
    AnalysisResponse.model_validate(load("ai-analyze-response.json"))


def test_camel_case_request_is_rejected(client, setup_database):
    """Spring must translate to snake_case; camelCase silently losing fields was the old bug."""
    request = load("ai-analyze-request.json")
    camel = {"performanceId": request["performance_id"], "userId": request["user_id"],
             "audioFile": request["audio_file"]}
    assert client.post("/api/ai/analyze", json=camel).status_code == 422


def test_spring_compare_request_is_accepted_and_response_matches_contract(
        client, setup_database, write_upload, tmp_path, monkeypatch):
    from app.core.config import settings
    from tests.test_alignment import TUNE, melody

    monkeypatch.setattr(settings, "REFERENCE_FEATURES_DIR", str(tmp_path / "features"))
    reference_id = client.post("/api/ai/references", json={
        "title": "Contract tune", "audio_file": write_upload(melody(TUNE[:8]), "ref.wav")}).json()["id"]
    request = load("ai-compare-request.json")
    request["reference_id"] = reference_id
    write_upload(melody(TUNE[:8]), request["performance_audio_file"])

    response = client.post("/api/ai/compare", json=request)

    assert response.status_code == 200, response.text
    assert set(response.json()) == set(load("ai-compare-response.json"))
