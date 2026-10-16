"""Measured metrics → a short, deterministic diagnosis (no LLM involved).

Each Diagnosis names one problem, the knowledge-base tag used to retrieve exercises for it,
and the evidence: sentences that quote the measured numbers exactly. The coach's LLM may only
cite these sentences, so every number the user sees in the coaching traces back to here.

Thresholds are the ones skill_prediction_service uses for strengths/weaknesses, so the coach
never contradicts the feedback shown on the analysis page. Dynamics is not diagnosed: its
metrics are descriptive only (docs/METRICS.md §5) and have no validated "good" range.
"""
from dataclasses import dataclass, field
from typing import Any, Optional

from app.services.skill_prediction_service import (
    INACCURATE_CENTS,
    LOOSE_TIMING_MS,
    OFF_NOTE_CENTS,
    TEMPO_DRIFT_BPM,
    TUNING_BIAS_CENTS,
    UNEVEN_PULSE_CV,
    UNSTEADY_NOTE_CENTS,
)

MAX_OFF_NOTES = 3        # worst off-pitch notes quoted as evidence
MAX_SECTIONS_QUOTED = 3  # problem sections quoted per issue

# Phase 3 problem-section issue → (diagnosis key, knowledge tag, label)
SECTION_ISSUES: dict[str, tuple[str, str, str]] = {
    "pitch_sharp": ("intonation", "sharp", "Intonation"),
    "pitch_flat": ("intonation", "flat", "Intonation"),
    "rushing": ("rushing", "rushing", "Rushing"),
    "dragging": ("dragging", "dragging", "Dragging"),
    "missing_notes": ("missing_notes", "missing_notes", "Missing notes"),
}


@dataclass
class Diagnosis:
    """One measured problem.

    key:      stable id ("intonation", "note_stability", "timing", "rushing", "dragging", "pulse",
              "missing_notes").
    tag:      knowledge-base problem tag used for retrieval (e.g. "sharp", "rushing").
    label:    short human title.
    severity: how far past its threshold the worst metric is (1.0 = exactly at the threshold);
              used only to order the diagnoses.
    evidence: sentences quoting measured values, in the units the metrics are stored in.
    """
    key: str
    tag: str
    label: str
    severity: float
    evidence: list[str] = field(default_factory=list)

    @property
    def query(self) -> str:
        """Retrieval query: the label plus the evidence, so wording like "sharp" or "faster" counts."""
        return f"{self.label}. " + " ".join(self.evidence)


def _num(value: Any) -> Optional[float]:
    return None if value is None else float(value)


def _intonation(m: dict) -> Optional[Diagnosis]:
    """Inaccurate (mean |deviation| > INACCURATE_CENTS) or biased (|mean signed| > TUNING_BIAS_CENTS)."""
    mean_abs, signed = _num(m.get("mean_abs_cents")), _num(m.get("mean_signed_cents"))
    if mean_abs is None:
        return None
    biased = signed is not None and abs(signed) > TUNING_BIAS_CENTS
    if mean_abs <= INACCURATE_CENTS and not biased:
        return None
    evidence = [f"Notes are {mean_abs:.1f} cents from the nearest semitone on average"]
    tag = "intonation"
    if biased:
        tag = "sharp" if signed > 0 else "flat"
        evidence.append(f"Average signed deviation is {signed:+.1f} cents (mostly {tag})")
    pct = _num(m.get("pct_frames_within_25_cents"))
    if pct is not None:
        evidence.append(f"{pct:.0f}% of pitched frames are within ±25 cents")
    off = sorted((n for n in m.get("notes") or [] if abs(n["mean_cents"]) > OFF_NOTE_CENTS),
                 key=lambda n: -abs(n["mean_cents"]))[:MAX_OFF_NOTES]
    for n in off:
        evidence.append(f"{n['note_name']} at {n['start']:.1f} s is {n['mean_cents']:+.0f} cents off")
    severity = max(mean_abs / INACCURATE_CENTS, abs(signed or 0) / TUNING_BIAS_CENTS)
    return Diagnosis("intonation", tag, "Intonation", severity, evidence)


def _note_stability(m: dict) -> Optional[Diagnosis]:
    """Pitch wobbles inside held notes: pitch_stability_cents > UNSTEADY_NOTE_CENTS."""
    stability = _num(m.get("pitch_stability_cents"))
    if stability is None or stability <= UNSTEADY_NOTE_CENTS:
        return None
    return Diagnosis("note_stability", "note_stability", "Pitch drift on held notes",
                     stability / UNSTEADY_NOTE_CENTS,
                     [f"Pitch varies by {stability:.1f} cents (standard deviation) within held notes"])


def _timing(m: dict) -> Optional[Diagnosis]:
    """Loose timing: mean |onset − grid| > LOOSE_TIMING_MS."""
    error = _num(m.get("mean_abs_timing_error_ms"))
    if error is None or error <= LOOSE_TIMING_MS:
        return None
    evidence = [f"Notes land {error:.0f} ms from the beat grid on average"]
    pct = _num(m.get("pct_onsets_within_30ms"))
    if pct is not None:
        evidence.append(f"{pct:.0f}% of notes are within 30 ms of the beat")
    return Diagnosis("timing", "timing", "Timing", error / LOOSE_TIMING_MS, evidence)


def _tempo_drift(m: dict) -> Optional[Diagnosis]:
    """Rushing/dragging over the take: |tempo_drift_bpm| > TEMPO_DRIFT_BPM (second half − first half)."""
    drift = _num(m.get("tempo_drift_bpm"))
    if drift is None or abs(drift) <= TEMPO_DRIFT_BPM:
        return None
    rushing = drift > 0
    key = "rushing" if rushing else "dragging"
    return Diagnosis(key, key, key.capitalize(),
                     abs(drift) / TEMPO_DRIFT_BPM,
                     [f"The second half is {abs(drift):.1f} BPM {'faster' if rushing else 'slower'} than the first"])


def _pulse(m: dict) -> Optional[Diagnosis]:
    """Uneven pulse: tempo_stability_cv > UNEVEN_PULSE_CV."""
    cv = _num(m.get("tempo_stability_cv"))
    if cv is None or cv <= UNEVEN_PULSE_CV:
        return None
    return Diagnosis("pulse", "uneven_pulse", "Uneven pulse", cv / UNEVEN_PULSE_CV,
                     [f"Beat-to-beat spacing varies by {cv * 100:.1f}% (coefficient of variation)"])


def _merge_sections(found: dict[str, Diagnosis], sections: list[dict]) -> None:
    """Add Phase 3 problem sections as evidence, creating a diagnosis if the metrics didn't flag one."""
    by_issue: dict[str, list[dict]] = {}
    for s in sections:
        if s.get("issue") in SECTION_ISSUES:
            by_issue.setdefault(s["issue"], []).append(s)
    for issue, items in by_issue.items():
        key, tag, label = SECTION_ISSUES[issue]
        quotes = [f"{s['user_start']:.1f}–{s['user_end']:.1f} s: {s['detail']}" for s in items[:MAX_SECTIONS_QUOTED]]
        if key in found:
            found[key].evidence.extend(quotes)
        else:
            # Severity 1 per flagged section: compared sections are already past the alignment thresholds.
            found[key] = Diagnosis(key, tag, label, float(len(items)), quotes)


def diagnose(metrics: dict, problem_sections: Optional[list[dict]] = None) -> list[Diagnosis]:
    """Measured metrics (+ optional comparison problem sections) → diagnoses, most severe first.

    metrics: the stored audio-feature columns (AudioFeaturesResponse fields; `notes` as a list).
    problem_sections: ComparisonResult.problem_sections, if the take was compared with a reference.
    Returns [] when nothing crosses a threshold. Pure and deterministic.
    """
    found: dict[str, Diagnosis] = {}
    for rule in (_intonation, _note_stability, _timing, _tempo_drift, _pulse):
        d = rule(metrics)
        if d is not None:
            found[d.key] = d
    _merge_sections(found, problem_sections or [])
    return sorted(found.values(), key=lambda d: (-d.severity, d.key))
