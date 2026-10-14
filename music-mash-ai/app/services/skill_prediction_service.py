"""
Skill summary built only from measured metrics (app/services/audio/metrics.py).

Every strength, weakness and drill below is triggered by a documented threshold on a
measured number, and quotes that number. If a metric is None (not measurable), no
statement is made about it. The skill LEVEL is a plain rule on overall_score; Phase 6
replaces it with a trained model.
"""
from typing import Any, Optional

from app.utils.logging import log

# Skill level from overall_score (0–100): the first threshold the score reaches wins.
LEVEL_THRESHOLDS: list[tuple[float, str]] = [
    (85.0, "EXPERT"),
    (70.0, "ADVANCED"),
    (50.0, "INTERMEDIATE"),
    (0.0, "BEGINNER"),
]

# Strength / weakness thresholds (units in the names).
ACCURATE_CENTS = 10.0        # mean_abs_cents at or below → strength
INACCURATE_CENTS = 20.0      # mean_abs_cents above → weakness
TUNING_BIAS_CENTS = 10.0     # |mean_signed_cents| above → "tends sharp/flat"
STEADY_NOTE_CENTS = 5.0      # pitch_stability_cents at or below → strength
UNSTEADY_NOTE_CENTS = 15.0   # pitch_stability_cents above → weakness
OFF_NOTE_CENTS = 25.0        # a single note whose |mean_cents| is above this is named
MAX_NOTES_LISTED = 3         # at most this many off notes are listed (worst first)
TIGHT_TIMING_MS = 15.0       # mean_abs_timing_error_ms at or below → strength
LOOSE_TIMING_MS = 30.0       # mean_abs_timing_error_ms above → weakness
TEMPO_DRIFT_BPM = 3.0        # |tempo_drift_bpm| above → "rushes/drags"
EVEN_PULSE_CV = 0.02         # tempo_stability_cv at or below → strength
UNEVEN_PULSE_CV = 0.05       # tempo_stability_cv above → weakness


def predict_level(overall_score: Optional[float]) -> tuple[Optional[str], str]:
    """Map overall_score to a level label; returns (level, explanation).

    BEGINNER < 50 ≤ INTERMEDIATE < 70 ≤ ADVANCED < 85 ≤ EXPERT. None if there is no score.
    """
    if overall_score is None:
        return None, "No level: neither pitch nor rhythm could be measured."
    for threshold, level in LEVEL_THRESHOLDS:
        if overall_score >= threshold:
            return level, (
                f"Rule-based: overall score {overall_score:.0f}/100 → {level} "
                "(Beginner < 50, Intermediate 50–70, Advanced 70–85, Expert ≥ 85)."
            )
    raise ValueError(f"overall_score out of range: {overall_score}")


def assess(metrics: dict[str, Any]) -> tuple[list[str], list[str], list[str]]:
    """Return (strengths, weaknesses, improvement_areas) from measured metrics.

    Each weakness adds one matching drill to improvement_areas.
    """
    strengths: list[str] = []
    weaknesses: list[str] = []
    drills: list[str] = []

    def weak(text: str, drill: str) -> None:
        weaknesses.append(text)
        if drill not in drills:
            drills.append(drill)

    # Intonation
    cents = metrics.get("mean_abs_cents")
    if cents is not None:
        if cents <= ACCURATE_CENTS:
            strengths.append(f"Accurate intonation: notes average {cents:.0f} cents from the nearest semitone.")
        elif cents > INACCURATE_CENTS:
            weak(f"Intonation: notes average {cents:.0f} cents from the nearest semitone "
                 f"(≤ {ACCURATE_CENTS:.0f} is accurate).",
                 "Play slow long tones against a drone or tuner, holding each note until it settles.")

    signed = metrics.get("mean_signed_cents")
    if signed is not None and abs(signed) > TUNING_BIAS_CENTS:
        direction = "sharp" if signed > 0 else "flat"
        weak(f"Tends {direction}: on average {signed:+.0f} cents from the nearest semitone.",
             "Check your tuning against A4 = 440 Hz, then practise landing held notes in the centre.")

    # Individual notes: whole-take averages hide one badly tuned note among many good ones.
    off_notes = sorted(
        (n for n in metrics.get("notes") or [] if abs(n["mean_cents"]) > OFF_NOTE_CENTS),
        key=lambda n: -abs(n["mean_cents"]),
    )
    if off_notes:
        listed = ", ".join(
            f"{n['note_name']} at {n['start']:.1f} s ({n['mean_cents']:+.0f}¢ "
            f"{'sharp' if n['mean_cents'] > 0 else 'flat'})"
            for n in off_notes[:MAX_NOTES_LISTED]
        )
        more = f" and {len(off_notes) - MAX_NOTES_LISTED} more" if len(off_notes) > MAX_NOTES_LISTED else ""
        weak(f"Out-of-tune notes: {listed}{more}.",
             "Loop the bars around the marked notes slowly against a drone, landing each one in the centre.")

    stability = metrics.get("pitch_stability_cents")
    if stability is not None:
        if stability <= STEADY_NOTE_CENTS:
            strengths.append(f"Steady held notes: pitch varies about ±{stability:.0f} cents within sustained notes.")
        elif stability > UNSTEADY_NOTE_CENTS:
            weak(f"Pitch wavers on held notes: about ±{stability:.0f} cents within sustained notes "
                 "(vibrato also counts here).",
                 "Hold each note for four slow beats while watching a tuner, keeping the needle still.")

    # Timing
    timing = metrics.get("mean_abs_timing_error_ms")
    tempo = metrics.get("tempo_bpm")
    if timing is not None:
        if timing <= TIGHT_TIMING_MS:
            strengths.append(f"Tight timing: onsets land {timing:.0f} ms from a steady beat grid on average.")
        elif timing > LOOSE_TIMING_MS:
            pct = metrics.get("pct_onsets_within_30ms")
            detail = f"; {pct:.0f}% are within 30 ms" if pct is not None else ""
            drill = "Practise with a metronome, starting about 10% below your performance tempo."
            if tempo:
                drill = (f"Practise with a metronome at {round(tempo * 0.9)} BPM (10% below your "
                         f"{tempo:.0f} BPM), then build back up.")
            weak(f"Loose timing: onsets land {timing:.0f} ms from a steady beat grid on average{detail}.", drill)

    drift = metrics.get("tempo_drift_bpm")
    if drift is not None and abs(drift) > TEMPO_DRIFT_BPM:
        word, faster = ("Rushes", "faster") if drift > 0 else ("Drags", "slower")
        weak(f"{word}: the second half is {abs(drift):.1f} BPM {faster} than the first.",
             "Keep the metronome on for the whole piece and listen for it most in the closing section.")

    cv = metrics.get("tempo_stability_cv")
    if cv is not None:
        if cv <= EVEN_PULSE_CV:
            strengths.append(f"Even pulse: beat lengths vary by only {cv * 100:.1f}%.")
        elif cv > UNEVEN_PULSE_CV:
            weak(f"Uneven pulse: beat lengths vary by {cv * 100:.0f}% (coefficient of variation).",
                 "Tap along with a metronome, then play the passage hearing only every second click.")

    return strengths, weaknesses, drills


class SkillPredictionService:
    """Builds the skill summary stored with each analysis."""

    def predict_skill_level(self, metrics: dict[str, Any]) -> dict[str, Any]:
        """
        Summarise measured metrics into scores, a level and feedback.

        Args:
            metrics: Flat metrics dict from AudioAnalysisService.analyze_audio

        Returns:
            Dict with predicted_level, level_basis, intonation_score, rhythm_score, overall_score,
            strengths, weaknesses and improvement_areas.
        """
        level, basis = predict_level(metrics.get("overall_score"))
        strengths, weaknesses, drills = assess(metrics)
        log.info(f"Skill summary completed. Level: {level}")
        return {
            "predicted_level": level,
            "level_basis": basis,
            "intonation_score": metrics.get("intonation_score"),
            "rhythm_score": metrics.get("rhythm_score"),
            "overall_score": metrics.get("overall_score"),
            "strengths": strengths,
            "weaknesses": weaknesses,
            "improvement_areas": drills,
        }
