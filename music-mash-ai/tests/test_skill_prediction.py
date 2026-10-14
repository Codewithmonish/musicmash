"""Tests for the rule-based skill summary (app/services/skill_prediction_service.py)."""
import pytest

from app.services.skill_prediction_service import SkillPredictionService, assess, predict_level


@pytest.mark.parametrize("score, level", [
    (0, "BEGINNER"), (49.9, "BEGINNER"), (50, "INTERMEDIATE"),
    (70, "ADVANCED"), (84.9, "ADVANCED"), (85, "EXPERT"), (100, "EXPERT"),
])
def test_level_thresholds(score, level):
    assert predict_level(score)[0] == level


def test_no_score_means_no_level():
    level, basis = predict_level(None)
    assert level is None
    assert "could be measured" in basis


def test_good_performance_gets_strengths_and_quotes_numbers():
    strengths, weaknesses, drills = assess({
        "mean_abs_cents": 6.2, "mean_signed_cents": 1.0, "pitch_stability_cents": 3.0,
        "mean_abs_timing_error_ms": 8.0, "tempo_bpm": 120.0, "tempo_drift_bpm": 0.5,
        "tempo_stability_cv": 0.01,
    })
    assert weaknesses == [] and drills == []
    assert any("6 cents" in s for s in strengths)
    assert any("8 ms" in s for s in strengths)
    assert len(strengths) == 4


def test_weaknesses_come_with_matching_drills():
    strengths, weaknesses, drills = assess({
        "mean_abs_cents": 28.0, "mean_signed_cents": -14.0, "pitch_stability_cents": 22.0,
        "mean_abs_timing_error_ms": 41.0, "pct_onsets_within_30ms": 40.0, "tempo_bpm": 100.0,
        "tempo_drift_bpm": 6.4, "tempo_stability_cv": 0.09,
    })
    assert strengths == []
    text = " ".join(weaknesses)
    assert "Tends flat: on average -14 cents" in text
    assert "Rushes: the second half is 6.4 BPM faster" in text
    assert "41 ms" in text and "40% are within 30 ms" in text
    assert len(weaknesses) == 6
    assert any("90 BPM" in d for d in drills)  # 10% below the measured 100 BPM


def test_unmeasured_metrics_produce_no_statements():
    strengths, weaknesses, drills = assess({"mean_abs_cents": None, "tempo_bpm": None})
    assert (strengths, weaknesses, drills) == ([], [], [])


def test_service_copies_scores_and_level():
    result = SkillPredictionService().predict_skill_level(
        {"intonation_score": 80.0, "rhythm_score": None, "overall_score": 80.0, "mean_abs_cents": 10.0})
    assert result["predicted_level"] == "ADVANCED"
    assert result["intonation_score"] == 80.0 and result["rhythm_score"] is None
    assert "80/100" in result["level_basis"]
