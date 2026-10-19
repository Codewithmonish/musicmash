"""AI coach: deterministic diagnosis, knowledge retrieval, output schemas, grounding check,
basic mode without an API key, and the cached API endpoint. The LLM is always mocked."""
import json

import pytest
from langchain_core.runnables import RunnableLambda
from pydantic import ValidationError

from app.models import AIAnalysis, AnalysisStatus, AudioFeatures, Comparison, ReferenceTrack
from app.schemas.coach import CoachResponse, LLMCoachOutput
from app.services.coach.diagnosis import diagnose
from app.services.coach.knowledge import KNOWLEDGE_DIR, chunk_doc, load_docs, parse_doc
from app.services.coach_service import (build_coaching, exercise_excerpt, grounding_problems, how_long_of,
                                         numbers_in, short_how_long)
from main import app

# A take that is clearly sharp, rushes, and has one very sharp note. Units as stored.
SHARP_RUSHED = {
    "mean_abs_cents": 38.2, "mean_signed_cents": 31.0, "pct_frames_within_25_cents": 41.0,
    "pitch_stability_cents": 6.0,
    "notes": [{"start": 1.0, "end": 1.5, "midi": 64, "note_name": "E4", "mean_cents": 44.0, "cents_std": 3.0},
              {"start": 2.0, "end": 2.5, "midi": 67, "note_name": "G4", "mean_cents": 5.0, "cents_std": 2.0}],
    "mean_abs_timing_error_ms": 18.0, "pct_onsets_within_30ms": 88.0,
    "tempo_drift_bpm": 6.2, "tempo_stability_cv": 0.03,
    "unavailable_reasons": {},
}
CLEAN = {"mean_abs_cents": 6.0, "mean_signed_cents": 1.0, "pitch_stability_cents": 3.0,
         "mean_abs_timing_error_ms": 9.0, "tempo_drift_bpm": 0.5, "tempo_stability_cv": 0.01, "notes": []}


# --- Diagnosis (pure) -----------------------------------------------------------------------

def test_diagnosis_quotes_the_measured_numbers_most_severe_first():
    result = diagnose(SHARP_RUSHED)
    assert [d.key for d in result] == ["intonation", "rushing"]   # 31/10 = 3.1 > 6.2/3 = 2.07
    intonation, rushing = result
    assert intonation.tag == "sharp"
    assert intonation.evidence == [
        "Notes are 38.2 cents from the nearest semitone on average",
        "Average signed deviation is +31.0 cents (mostly sharp)",
        "41% of pitched frames are within ±25 cents",
        "E4 at 1.0 s is +44 cents off",                             # G4 (+5) is under the 25-cent bar
    ]
    assert rushing.tag == "rushing"
    assert rushing.evidence == ["The second half is 6.2 BPM faster than the first"]


def test_diagnosis_is_empty_for_a_clean_take_and_ignores_missing_metrics():
    assert diagnose(CLEAN) == []
    assert diagnose({"mean_abs_cents": None, "tempo_drift_bpm": None, "notes": []}) == []


def test_diagnosis_flags_flat_dragging_unsteady_and_loose_timing():
    metrics = {"mean_abs_cents": 25.0, "mean_signed_cents": -18.0, "pitch_stability_cents": 21.0,
               "mean_abs_timing_error_ms": 45.0, "pct_onsets_within_30ms": 40.0,
               "tempo_drift_bpm": -4.5, "tempo_stability_cv": 0.09, "notes": []}
    by_key = {d.key: d for d in diagnose(metrics)}
    assert by_key["intonation"].tag == "flat"
    assert by_key["dragging"].evidence == ["The second half is 4.5 BPM slower than the first"]
    assert by_key["note_stability"].evidence == ["Pitch varies by 21.0 cents (standard deviation) within held notes"]
    assert by_key["timing"].evidence == ["Notes land 45 ms from the beat grid on average",
                                         "40% of notes are within 30 ms of the beat"]
    assert by_key["pulse"].tag == "uneven_pulse"


def test_problem_sections_add_evidence_or_new_diagnoses():
    sections = [{"user_start": 4.0, "user_end": 8.0, "ref_start": 4.0, "ref_end": 8.0,
                 "issue": "pitch_sharp", "detail": "35 cents sharp of the reference"},
                {"user_start": 8.0, "user_end": 11.2, "ref_start": 8.0, "ref_end": 12.0,
                 "issue": "missing_notes", "detail": "4 notes in the reference, 2 played"}]
    by_key = {d.key: d for d in diagnose(SHARP_RUSHED, sections)}
    assert "4.0–8.0 s: 35 cents sharp of the reference" in by_key["intonation"].evidence
    assert by_key["missing_notes"].evidence == ["8.0–11.2 s: 4 notes in the reference, 2 played"]


# --- Knowledge docs and retrieval ------------------------------------------------------------

def test_every_knowledge_doc_has_valid_front_matter():
    docs = load_docs(KNOWLEDGE_DIR)
    assert 25 <= len(docs) <= 40
    for doc in docs:
        assert doc.problem_tags and doc.instruments
        assert doc.level in {"beginner", "intermediate", "advanced", "all"}
        assert all(len(c.text) <= 1300 for c in chunk_doc(doc))
    # Every tag the diagnosis can produce has at least one doc for any instrument.
    any_tags = {t for d in docs if "any" in d.instruments for t in d.problem_tags}
    assert {"intonation", "sharp", "flat", "note_stability", "timing", "rushing", "dragging",
            "uneven_pulse", "missing_notes", "warmup"} <= any_tags


def test_parse_doc_rejects_missing_front_matter(tmp_path):
    bad = tmp_path / "bad.md"
    bad.write_text("---\ninstruments: [any]\nlevel: all\n---\n# Title\n", encoding="utf-8")
    with pytest.raises(ValueError, match="problem_tags"):
        parse_doc(bad)


# kb (fake embeddings) and real_kb (all-MiniLM-L6-v2, slow) come from conftest.py.

@pytest.mark.slow
def test_retrieval_returns_intonation_docs_for_an_intonation_problem(real_kb):
    diagnosis = diagnose(SHARP_RUSHED)[0]
    chunks = real_kb.retrieve(diagnosis.query, diagnosis.tag, "VIOLIN", "INTERMEDIATE", k=3)
    docs = {d.doc_id: d for d in load_docs(KNOWLEDGE_DIR)}
    assert len(chunks) == 3
    for chunk in chunks:
        doc = docs[chunk.doc_id]
        assert "sharp" in doc.problem_tags
        assert set(doc.instruments) & {"any", "violin"}
    assert chunks[0].doc_id == "intonation-sharp-tendency"


def test_retrieval_only_returns_docs_for_the_problem_tag(kb):
    """Fast version: the metadata filter alone guarantees on-topic docs, whatever the embedding."""
    docs = {d.doc_id: d for d in load_docs(KNOWLEDGE_DIR)}
    for tag in ("sharp", "rushing", "note_stability"):
        chunks = kb.retrieve(f"{tag} problem", tag, "VIOLIN", "INTERMEDIATE", k=3)
        assert chunks
        for chunk in chunks:
            assert tag in docs[chunk.doc_id].problem_tags
            assert set(docs[chunk.doc_id].instruments) & {"any", "violin"}


def test_retrieval_respects_instrument_and_level(kb):
    docs = {d.doc_id: d for d in load_docs(KNOWLEDGE_DIR)}
    guitar = kb.retrieve("playing sharp", "sharp", "GUITAR", "BEGINNER", k=3)
    assert any(docs[c.doc_id].instruments == ["guitar"] for c in guitar)   # instrument slot
    for c in kb.retrieve("rushing and timing", "rushing", "PIANO", "BEGINNER", k=5):
        assert docs[c.doc_id].level in {"beginner", "all"}
        assert set(docs[c.doc_id].instruments) & {"any", "piano"}


# --- Schemas and grounding -------------------------------------------------------------------

def _grounded_output(source: str = "intonation-sharp-tendency") -> LLMCoachOutput:
    return LLMCoachOutput(
        summary="Your timing is close, but notes sit sharp, especially E4. Lighten up and land in the centre.",
        top_3_issues=[{"issue": "Sharp intonation",
                       "evidence": ["Average signed deviation is +31.0 cents (mostly sharp)",
                                    "E4 at 1.0 s is +44 cents off"],
                       "exercise": "Start the three sharpest notes slightly flat, slide into the centre, then play them with a light touch.",
                       "how_long": "10 minutes a day for a week", "source_doc": source}],
        plan=[{"day": d, "focus": "Sharp intonation", "tasks": ["Land low, then centre"]} for d in range(1, 7)]
        + [{"day": 7, "focus": "Check", "tasks": ["Record the same passage again"]}],
    )


def test_llm_output_schema_validates_shape():
    _grounded_output()  # valid
    with pytest.raises(ValidationError):
        LLMCoachOutput.model_validate({**_grounded_output().model_dump(), "plan": []})
    too_many = _grounded_output().model_dump()
    too_many["top_3_issues"] *= 4
    with pytest.raises(ValidationError):
        LLMCoachOutput.model_validate(too_many)


def test_numbers_are_normalised():
    assert numbers_in("+31.0 cents, ±25, 10–15 minutes") == {"31", "25", "10", "15"}


def test_grounding_rejects_invented_evidence_numbers_and_sources(kb):
    chunks = {c.doc_id: c for c in kb.retrieve(diagnose(SHARP_RUSHED)[0].query, "sharp", None, None, k=10)}
    allowed = set(diagnose(SHARP_RUSHED)[0].evidence)
    assert grounding_problems(_grounded_output(), allowed, chunks) == []

    invented = _grounded_output()
    invented.summary = "You are 52 cents sharp."
    assert any("52" in p for p in grounding_problems(invented, allowed, chunks))

    paraphrased = _grounded_output()
    paraphrased.top_3_issues[0].evidence = ["You play about 30 cents sharp"]
    assert any("evidence not in the measurements" in p for p in grounding_problems(paraphrased, allowed, chunks))

    assert any("unknown source" in p for p in grounding_problems(_grounded_output("made-up-doc"), allowed, chunks))


def test_doc_text_helpers():
    text = "# T\n\nIntro.\n\n## Exercise\n1. Do it.\n\n**How long:** 10 minutes a day."
    assert exercise_excerpt(text) == "1. Do it."
    assert how_long_of(text) == "10 minutes a day."
    assert short_how_long("10 minutes a day for a week. Re-record and compare.") == "10 minutes a day for a week"


# --- Pipeline: basic mode and mocked LLM ------------------------------------------------------

def test_basic_mode_without_an_llm(kb):
    result = build_coaching(1, SHARP_RUSHED, None, "GUITAR", "BEGINNER", kb, structured_llm=None)
    assert result.mode == "basic" and result.summary is None and result.top_issues == []
    assert [d.key for d in result.diagnosis] == ["intonation", "rushing"]
    assert {e.diagnosis_key for e in result.exercises} == {"intonation", "rushing"}
    assert all(e.excerpt for e in result.exercises)
    assert [d.day for d in result.plan] == list(range(1, 8))
    assert any("Basic mode" in n and "no LLM API key" in n for n in result.notes)


def test_clean_take_gets_a_warm_up_and_no_plan(kb):
    result = build_coaching(1, CLEAN, None, "PIANO", None, kb, structured_llm=None)
    assert result.diagnosis == [] and result.plan == []
    assert result.exercises[0].diagnosis_key == "warmup"


def test_mocked_llm_output_is_used_when_grounded(kb):
    seen = {}

    def fake_llm(prompt_value):
        seen["prompt"] = prompt_value.to_string()
        sources = [line.split('"')[1] for line in seen["prompt"].splitlines() if line.startswith("<source id=")]
        return _grounded_output(sources[0])

    result = build_coaching(1, SHARP_RUSHED, None, "VIOLIN", "INTERMEDIATE", kb, RunnableLambda(fake_llm), "fake-model")
    assert result.mode == "llm" and result.model == "fake-model"
    assert result.top_issues[0].evidence[1] == "E4 at 1.0 s is +44 cents off"
    assert len(result.plan) == 7
    assert "Do not invent" in seen["prompt"] and "E4 at 1.0 s is +44 cents off" in seen["prompt"]


def test_ungrounded_or_failing_llm_falls_back_to_basic_mode(kb):
    def invents(_):
        output = _grounded_output("intonation-sharp-tendency")
        output.summary = "You were 73 cents sharp."
        return output

    def fails(_):
        raise TimeoutError("no network")

    for llm, note in [(invents, "discarded"), (fails, "TimeoutError")]:
        result = build_coaching(1, SHARP_RUSHED, None, "VIOLIN", None, kb, RunnableLambda(llm))
        assert result.mode == "basic" and result.summary is None
        assert any(note in n for n in result.notes)


# --- API --------------------------------------------------------------------------------------

@pytest.fixture
def analysis_id(setup_database):
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    analysis = AIAnalysis(user_id=1, audio_file="take.wav", instrument="VIOLIN", status=AnalysisStatus.COMPLETED)
    db.add(analysis)
    db.commit()
    fields = {k: v for k, v in SHARP_RUSHED.items() if k not in ("notes", "unavailable_reasons")}
    db.add(AudioFeatures(analysis_id=analysis.id, notes=json.dumps(SHARP_RUSHED["notes"]),
                         unavailable_reasons="{}", **fields))
    reference = ReferenceTrack(title="ref", file_path="ref.wav", status=AnalysisStatus.COMPLETED)
    db.add(reference)
    db.commit()
    db.add(Comparison(user_id=1, reference_id=reference.id, analysis_id=analysis.id, performance_audio_file="take.wav",
                      status=AnalysisStatus.COMPLETED,
                      result=json.dumps({"problem_sections": [{"user_start": 8.0, "user_end": 11.0, "ref_start": 8.0,
                                                               "ref_end": 12.0, "issue": "rushing",
                                                               "detail": "33% faster than the original here."}]})))
    db.commit()
    id_ = analysis.id
    db.close()
    return id_


@pytest.fixture
def coach_api(kb):
    from app.api.coach import get_structured_llm
    from app.services.coach_service import get_knowledge_base
    app.dependency_overrides[get_knowledge_base] = lambda: kb
    app.dependency_overrides[get_structured_llm] = lambda: None
    yield
    del app.dependency_overrides[get_knowledge_base]
    del app.dependency_overrides[get_structured_llm]


def test_coach_endpoint_basic_mode_uses_comparison_and_caches(client, analysis_id, coach_api):
    first = client.post(f"/api/ai/coach/{analysis_id}", json={"level": "BEGINNER"})
    assert first.status_code == 200, first.text
    body = CoachResponse.model_validate(first.json())
    assert body.mode == "basic"
    rushing = next(d for d in body.diagnosis if d.key == "rushing")
    assert "8.0–11.0 s: 33% faster than the original here." in rushing.evidence

    again = client.post(f"/api/ai/coach/{analysis_id}")
    assert again.json()["created_at"] == first.json()["created_at"]           # served from cache
    fresh = client.post(f"/api/ai/coach/{analysis_id}", json={"refresh": True})
    assert fresh.json()["created_at"] != first.json()["created_at"]


def test_coach_endpoint_errors(client, setup_database, coach_api):
    assert client.post("/api/ai/coach/999").status_code == 404
