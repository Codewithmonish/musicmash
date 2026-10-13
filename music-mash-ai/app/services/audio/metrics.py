"""
Measured audio metrics for one performance.

Every function in this module is pure: it takes a NumPy signal (or arrays derived from it)
and returns numbers. Nothing here touches the database, the network or the filesystem,
which keeps the maths easy to unit-test with generated audio (see tests/test_metrics.py).

Units used throughout:
    Hz      frequency
    cents   1/100 of an equal-tempered semitone (A4 = 440 Hz)
    ms / s  time
    BPM     beats per minute
    dBFS    decibels relative to a full-scale (amplitude 1.0) signal

If a metric cannot be measured, it is ``None`` and the reason is stored in the ``reasons``
dict of its group under the metric's name. Nothing is ever filled in with a default guess.
The full write-up of every formula lives in docs/METRICS.md.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import librosa
import numpy as np

# --- Analysis constants -------------------------------------------------------------------

A4_HZ = 440.0
A4_MIDI = 69

FRAME_LENGTH = 2048          # pYIN / RMS window: 93 ms at 22 050 Hz
HOP_LENGTH = 512             # pYIN / RMS hop: 23 ms at 22 050 Hz
ONSET_HOP_LENGTH = 128       # finer hop for onsets and tempo: 5.8 ms at 22 050 Hz

MIN_VOICED_PROBABILITY = 0.5 # pYIN voiced probability needed for a frame to count as voiced
MIN_VOICED_RATIO = 0.2       # below this, pitch metrics are not reported
MIN_NOTE_DURATION_S = 0.08   # shorter pitch runs are treated as transitions, not notes
SUSTAINED_NOTE_S = 0.2       # notes at least this long count towards pitch stability
IN_TUNE_CENTS = 25.0         # threshold for pct_frames_within_25_cents

GRID_SUBDIVISIONS = 4        # beat grid resolution: 4 = sixteenth notes
ON_TIME_MS = 30.0            # threshold for pct_onsets_within_30ms
MIN_ONSETS = 8               # below this, rhythm metrics are not reported
STABILITY_WINDOW = 8         # inter-onset intervals per rolling window for tempo_stability_cv
MIN_ONSETS_PER_HALF = 4      # needed in each half of the take to measure tempo drift

SILENCE_GATE_DB = 60.0       # RMS frames this far below the loudest frame count as silence

# Pitch search range (lowest note, highest note) per instrument. pYIN only looks for f0
# inside this range, which avoids octave errors and speeds it up.
INSTRUMENT_PITCH_RANGES: dict[str, tuple[str, str]] = {
    "VOCALS": ("C2", "C6"),
    "GUITAR": ("E2", "E6"),
    "BASS": ("B0", "G4"),
    "PIANO": ("A1", "C7"),
    "VIOLIN": ("G3", "E7"),
    "CELLO": ("C2", "A5"),
    "FLUTE": ("C4", "C7"),
    "SAXOPHONE": ("A2", "F5"),
    "TRUMPET": ("E3", "C6"),
}
DEFAULT_PITCH_RANGE = ("C2", "C7")
UNPITCHED_INSTRUMENTS = {"DRUMS", "PERCUSSION"}


# --- Result types -------------------------------------------------------------------------

@dataclass(frozen=True)
class PitchTrack:
    """Frame-wise pYIN output.

    times: frame centre times in seconds.
    f0_hz: fundamental frequency in Hz, NaN where the frame is unvoiced.
    voiced_probability: pYIN's probability (0..1) that each frame is voiced.
    frame_period_s: time between consecutive frames in seconds.
    """
    times: np.ndarray
    f0_hz: np.ndarray
    voiced_probability: np.ndarray
    frame_period_s: float


@dataclass(frozen=True)
class Note:
    """One segmented note.

    start / end: seconds. midi: nearest equal-tempered MIDI number.
    note_name: e.g. "C#4". mean_cents / cents_std: deviation from that note, in cents.
    """
    start: float
    end: float
    midi: int
    note_name: str
    mean_cents: float
    cents_std: float


@dataclass
class PitchMetrics:
    voiced_ratio: Optional[float] = None
    mean_abs_cents: Optional[float] = None
    median_abs_cents: Optional[float] = None
    mean_signed_cents: Optional[float] = None
    pct_frames_within_25_cents: Optional[float] = None
    pitch_stability_cents: Optional[float] = None
    note_count: Optional[int] = None
    reasons: dict[str, str] = field(default_factory=dict)


@dataclass
class RhythmMetrics:
    onset_count: Optional[int] = None
    tempo_bpm: Optional[float] = None
    tempo_stability_cv: Optional[float] = None
    tempo_drift_bpm: Optional[float] = None
    mean_abs_timing_error_ms: Optional[float] = None
    pct_onsets_within_30ms: Optional[float] = None
    reasons: dict[str, str] = field(default_factory=dict)


@dataclass
class DynamicsMetrics:
    mean_rms_dbfs: Optional[float] = None
    dynamic_range_db: Optional[float] = None
    reasons: dict[str, str] = field(default_factory=dict)


@dataclass
class Scores:
    pitch_score: Optional[float] = None
    rhythm_score: Optional[float] = None
    overall_score: Optional[float] = None
    reasons: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class GridFit:
    """A straight 'metronome line' fitted through the onsets.

    period_s: length of one grid step (one subdivision) in seconds.
    phase_s: time of grid index 0 in seconds.
    indices: grid index assigned to each onset.
    residuals_s: onset time minus its grid time, in seconds (negative = early).
    """
    period_s: float
    phase_s: float
    indices: np.ndarray
    residuals_s: np.ndarray


@dataclass
class PerformanceMetrics:
    duration_s: float
    sample_rate: int
    pitch_fmin_hz: Optional[float]
    pitch_fmax_hz: Optional[float]
    pitch: PitchMetrics
    rhythm: RhythmMetrics
    dynamics: DynamicsMetrics
    scores: Scores
    notes: list[Note]

    def to_flat_dict(self) -> dict:
        """All metrics in one flat dict, plus ``notes`` and ``unavailable_reasons``."""
        flat: dict = {
            "duration_s": self.duration_s,
            "sample_rate": self.sample_rate,
            "pitch_fmin_hz": self.pitch_fmin_hz,
            "pitch_fmax_hz": self.pitch_fmax_hz,
        }
        reasons: dict[str, str] = {}
        for group in (self.pitch, self.rhythm, self.dynamics, self.scores):
            values = dict(vars(group))
            reasons.update(values.pop("reasons"))
            flat.update(values)
        flat["notes"] = [vars(note).copy() for note in self.notes]
        flat["unavailable_reasons"] = reasons
        return flat


# --- Pitch --------------------------------------------------------------------------------

def pitch_range_for(instrument: Optional[str]) -> tuple[float, float]:
    """Return the (fmin, fmax) pYIN search range in Hz for an instrument name.

    Unknown or missing instruments use DEFAULT_PITCH_RANGE (C2–C7, 65–2093 Hz).
    """
    key = (instrument or "").strip().upper()
    low, high = INSTRUMENT_PITCH_RANGES.get(key, DEFAULT_PITCH_RANGE)
    return float(librosa.note_to_hz(low)), float(librosa.note_to_hz(high))


def track_pitch(
    y: np.ndarray,
    sr: int,
    fmin: float,
    fmax: float,
    hop_length: int = HOP_LENGTH,
) -> PitchTrack:
    """Estimate the fundamental frequency of every frame with pYIN, refined by YIN.

    1. pYIN (probabilistic YIN, Mauch & Dixon 2014) finds periodicity candidates per frame
       and picks the most likely pitch path with a hidden Markov model. It decides which
       frames are voiced and roughly where the pitch is.
    2. librosa's pYIN reports pitch on a 10-cent grid, too coarse for intonation. So each
       voiced frame takes plain YIN's estimate instead (parabolic interpolation, sub-cent
       resolution), as long as YIN agrees with pYIN to within 50 cents. Otherwise the pYIN
       value is kept. YIN's interpolation adds a small bias (≈ +1.5 cents at 440 Hz).

    A frame counts as voiced only if pYIN flags it AND its voiced probability is at least
    MIN_VOICED_PROBABILITY; pYIN's flag alone marks up to half of white-noise frames voiced.
    Unvoiced frames get NaN.
    """
    f0, voiced_flag, voiced_prob = librosa.pyin(
        y, fmin=fmin, fmax=fmax, sr=sr, frame_length=FRAME_LENGTH, hop_length=hop_length
    )
    voiced_prob = np.nan_to_num(voiced_prob)
    voiced = voiced_flag & (voiced_prob >= MIN_VOICED_PROBABILITY)

    yin_f0 = librosa.yin(y, fmin=fmin, fmax=fmax, sr=sr, frame_length=FRAME_LENGTH,
                         hop_length=hop_length)
    with np.errstate(divide="ignore", invalid="ignore"):
        yin_agrees = np.abs(1200 * np.log2(yin_f0 / f0)) < 50
    f0 = np.where(voiced, np.where(yin_agrees, yin_f0, f0), np.nan)
    times = librosa.times_like(f0, sr=sr, hop_length=hop_length)
    return PitchTrack(
        times=times,
        f0_hz=f0,
        voiced_probability=voiced_prob,
        frame_period_s=hop_length / sr,
    )


def hz_to_midi_float(f0_hz: np.ndarray) -> np.ndarray:
    """Convert Hz to fractional MIDI numbers: midi = 69 + 12 · log2(f / 440). NaN stays NaN."""
    with np.errstate(divide="ignore", invalid="ignore"):
        return A4_MIDI + 12.0 * np.log2(np.asarray(f0_hz, dtype=float) / A4_HZ)


def cents_from_nearest_semitone(f0_hz: np.ndarray) -> np.ndarray:
    """Deviation of each frequency from the nearest equal-tempered note, in cents.

    cents = 100 · (midi − round(midi)), so the result is always in [−50, +50].
    Positive = sharp, negative = flat. NaN (unvoiced) frames stay NaN.
    """
    midi = hz_to_midi_float(f0_hz)
    return 100.0 * (midi - np.round(midi))


def segment_notes(
    track: PitchTrack, min_duration_s: float = MIN_NOTE_DURATION_S
) -> list[Note]:
    """Group consecutive voiced frames that share the same nearest MIDI note into notes.

    A run of frames becomes a note if it lasts at least ``min_duration_s`` (default 80 ms);
    shorter runs are glides or detection blips and are dropped. An unvoiced frame always
    ends a note, so a repeated note with a gap between is counted twice.
    """
    midi = np.round(hz_to_midi_float(track.f0_hz))
    cents = cents_from_nearest_semitone(track.f0_hz)
    notes: list[Note] = []

    start = 0
    for i in range(1, len(midi) + 1):
        run_continues = i < len(midi) and midi[i] == midi[start]  # NaN != NaN ends runs
        if run_continues:
            continue
        if not np.isnan(midi[start]):
            duration = (i - start) * track.frame_period_s
            if duration >= min_duration_s:
                note_midi = int(midi[start])
                run_cents = cents[start:i]
                notes.append(Note(
                    start=round(float(track.times[start]), 3),
                    end=round(float(track.times[i - 1] + track.frame_period_s), 3),
                    midi=note_midi,
                    note_name=librosa.midi_to_note(note_midi, unicode=False),
                    mean_cents=round(float(np.mean(run_cents)), 2),
                    cents_std=round(float(np.std(run_cents)), 2),
                ))
        start = i
    return notes


def compute_pitch_metrics(track: PitchTrack, notes: list[Note]) -> PitchMetrics:
    """Intonation metrics from a pitch track and its segmented notes.

    voiced_ratio               voiced frames / all frames (0..1).
    mean_abs_cents             mean |cents from nearest semitone| over voiced frames.
    median_abs_cents           median of the same; less sensitive to glides between notes.
    mean_signed_cents          mean signed deviation; > 0 means the take sits sharp overall.
    pct_frames_within_25_cents % of voiced frames with |cents| ≤ 25.
    pitch_stability_cents      mean, over sustained notes (≥ 200 ms), of the standard
                               deviation of cents inside each note. Lower = steadier.
    note_count                 number of segmented notes.

    If voiced_ratio < 0.2 there is not enough pitched audio and everything except
    voiced_ratio is None, with a reason.
    """
    result = PitchMetrics()
    total = len(track.f0_hz)
    if total == 0:
        result.reasons["voiced_ratio"] = "The audio is too short to track pitch."
        return result

    voiced = ~np.isnan(track.f0_hz)
    voiced_ratio = float(np.mean(voiced))
    result.voiced_ratio = round(voiced_ratio, 3)

    if voiced_ratio < MIN_VOICED_RATIO:
        reason = (
            f"Only {voiced_ratio:.0%} of the recording has a detectable pitch "
            f"(at least {MIN_VOICED_RATIO:.0%} is needed)."
        )
        for name in ("mean_abs_cents", "median_abs_cents", "mean_signed_cents",
                     "pct_frames_within_25_cents", "pitch_stability_cents", "note_count"):
            result.reasons[name] = reason
        return result

    cents = cents_from_nearest_semitone(track.f0_hz[voiced])
    abs_cents = np.abs(cents)
    result.mean_abs_cents = round(float(np.mean(abs_cents)), 2)
    result.median_abs_cents = round(float(np.median(abs_cents)), 2)
    result.mean_signed_cents = round(float(np.mean(cents)), 2)
    result.pct_frames_within_25_cents = round(float(np.mean(abs_cents <= IN_TUNE_CENTS) * 100), 1)
    result.note_count = len(notes)

    sustained = [n for n in notes if n.end - n.start >= SUSTAINED_NOTE_S]
    if sustained:
        result.pitch_stability_cents = round(float(np.mean([n.cents_std for n in sustained])), 2)
    else:
        result.reasons["pitch_stability_cents"] = (
            f"No sustained notes (≥ {SUSTAINED_NOTE_S * 1000:.0f} ms) were found."
        )
    return result


# --- Rhythm -------------------------------------------------------------------------------

def detect_onsets_and_tempo(
    y: np.ndarray, sr: int, hop_length: int = ONSET_HOP_LENGTH
) -> tuple[np.ndarray, float]:
    """Detect note onsets (seconds) and a global tempo estimate (BPM).

    Onsets: librosa.onset.onset_detect on the spectral-flux onset envelope, with
    backtrack=True so each onset is moved back to the energy minimum just before the attack.
    Tempo: librosa.beat.beat_track on the same envelope. Returns 0.0 if no tempo is found.
    """
    envelope = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
    onsets = librosa.onset.onset_detect(
        onset_envelope=envelope, sr=sr, hop_length=hop_length, backtrack=True, units="time"
    )
    tempo, _ = librosa.beat.beat_track(onset_envelope=envelope, sr=sr, hop_length=hop_length)
    return np.asarray(onsets, dtype=float), float(np.atleast_1d(tempo)[0])


def fit_beat_grid(
    onsets_s: np.ndarray,
    tempo_bpm: float,
    subdivisions: int = GRID_SUBDIVISIONS,
    iterations: int = 2,
) -> GridFit:
    """Fit a steady grid (a perfect metronome at one tempo) through the onsets.

    1. Start from a grid step of 60 / tempo / subdivisions seconds.
    2. Walk through the onsets and give each one a grid index: the previous index plus the
       number of grid steps in the inter-onset interval, rounded.
    3. Least-squares fit onset_time = phase + index · period (a straight line).
    4. Repeat 2–3 with the refined period.

    The residuals are each onset's timing error against that steady grid. Because the grid
    is fitted to the player's own onsets, a constant delay (e.g. audio latency) is absorbed
    into the phase and does not count as error.
    """
    period = 60.0 / tempo_bpm / subdivisions
    phase = float(onsets_s[0])
    indices = np.zeros(len(onsets_s))
    for _ in range(iterations):
        steps = np.maximum(np.round(np.diff(onsets_s) / period), 0)
        indices = np.concatenate([[0.0], np.cumsum(steps)])
        if len(np.unique(indices)) < 2:
            break
        period, phase = np.polyfit(indices, onsets_s, 1)
    residuals = onsets_s - (phase + indices * period)
    return GridFit(float(period), float(phase), indices, residuals)


def grid_tempo_bpm(period_s: float, subdivisions: int = GRID_SUBDIVISIONS) -> float:
    """Tempo in BPM implied by a grid step: 60 / (period · subdivisions)."""
    return 60.0 / (period_s * subdivisions)


def tempo_stability_cv(
    onsets_s: np.ndarray, indices: np.ndarray, window: int = STABILITY_WINDOW
) -> Optional[float]:
    """Median coefficient of variation of grid-normalised inter-onset intervals.

    Each inter-onset interval is divided by the number of grid steps it spans, so a quarter
    note and an eighth note at the same tempo give the same value. In every rolling window of
    ``window`` intervals we take CV = std / mean; the result is the median CV (unitless,
    0 = perfectly even pulse). Returns None if no interval spans at least one grid step.
    """
    steps = np.diff(indices)
    valid = steps > 0
    if not np.any(valid):
        return None
    per_step = np.diff(onsets_s)[valid] / steps[valid]
    if len(per_step) <= window:
        windows = [per_step]
    else:
        windows = [per_step[i:i + window] for i in range(len(per_step) - window + 1)]
    return float(np.median([np.std(w) / np.mean(w) for w in windows]))


def tempo_drift_bpm(
    onsets_s: np.ndarray, tempo_bpm: float, subdivisions: int = GRID_SUBDIVISIONS
) -> Optional[float]:
    """Tempo of the second half of the take minus tempo of the first half, in BPM.

    Each half gets its own steady-grid fit (fit_beat_grid). Positive = speeding up (rushing),
    negative = slowing down (dragging). Returns None if either half has fewer than
    MIN_ONSETS_PER_HALF onsets.
    """
    midpoint = (onsets_s[0] + onsets_s[-1]) / 2
    halves = [onsets_s[onsets_s < midpoint], onsets_s[onsets_s >= midpoint]]
    if any(len(h) < MIN_ONSETS_PER_HALF for h in halves):
        return None
    tempos = [grid_tempo_bpm(fit_beat_grid(h, tempo_bpm, subdivisions).period_s, subdivisions)
              for h in halves]
    return tempos[1] - tempos[0]


def compute_rhythm_metrics(onsets_s: np.ndarray, librosa_tempo_bpm: float) -> RhythmMetrics:
    """Timing metrics from onset times and an initial tempo estimate.

    onset_count               number of detected onsets.
    tempo_bpm                 tempo of the steady grid fitted through the onsets
                              (fit_beat_grid, started from librosa's beat_track estimate).
    tempo_stability_cv        see tempo_stability_cv(); lower = steadier pulse.
    tempo_drift_bpm           see tempo_drift_bpm(); > 0 rushing, < 0 dragging.
    mean_abs_timing_error_ms  mean |onset − nearest grid point| (sixteenth-note grid), ms.
    pct_onsets_within_30ms    % of onsets within ±30 ms of the grid.

    Needs at least MIN_ONSETS onsets and a non-zero tempo, otherwise all values except
    onset_count are None with a reason.
    """
    result = RhythmMetrics(onset_count=int(len(onsets_s)))
    names = ("tempo_bpm", "tempo_stability_cv", "tempo_drift_bpm",
             "mean_abs_timing_error_ms", "pct_onsets_within_30ms")

    if len(onsets_s) < MIN_ONSETS:
        reason = f"Only {len(onsets_s)} note onsets were detected (at least {MIN_ONSETS} are needed)."
        result.reasons.update({name: reason for name in names})
        return result
    if librosa_tempo_bpm <= 0:
        reason = "No steady beat could be detected."
        result.reasons.update({name: reason for name in names})
        return result

    grid = fit_beat_grid(onsets_s, librosa_tempo_bpm)
    tempo = grid_tempo_bpm(grid.period_s)
    abs_error_ms = np.abs(grid.residuals_s) * 1000

    result.tempo_bpm = round(tempo, 2)
    result.mean_abs_timing_error_ms = round(float(np.mean(abs_error_ms)), 2)
    result.pct_onsets_within_30ms = round(float(np.mean(abs_error_ms <= ON_TIME_MS) * 100), 1)

    cv = tempo_stability_cv(onsets_s, grid.indices)
    if cv is None:
        result.reasons["tempo_stability_cv"] = "Onsets are too close together to measure the pulse."
    else:
        result.tempo_stability_cv = round(cv, 4)

    drift = tempo_drift_bpm(onsets_s, tempo)
    if drift is None:
        result.reasons["tempo_drift_bpm"] = (
            f"Each half of the take needs at least {MIN_ONSETS_PER_HALF} onsets to compare tempos."
        )
    else:
        result.tempo_drift_bpm = round(drift, 2)
    return result


# --- Dynamics -----------------------------------------------------------------------------

def compute_dynamics_metrics(y: np.ndarray, hop_length: int = HOP_LENGTH) -> DynamicsMetrics:
    """Loudness statistics (descriptive only; not used in any score).

    Frame RMS is converted to dBFS: 20 · log10(rms). Frames more than 60 dB below the loudest
    frame are treated as silence and ignored.

    mean_rms_dbfs     mean frame level in dBFS (a full-scale sine is about −3 dBFS).
    dynamic_range_db  95th percentile − 5th percentile of frame levels, in dB.
    """
    result = DynamicsMetrics()
    rms = librosa.feature.rms(y=y, frame_length=FRAME_LENGTH, hop_length=hop_length)[0]
    if rms.size == 0 or float(np.max(rms)) <= 0:
        reason = "The recording is silent."
        result.reasons.update({"mean_rms_dbfs": reason, "dynamic_range_db": reason})
        return result

    level_db = 20 * np.log10(np.maximum(rms, 1e-10))
    active = level_db[level_db >= level_db.max() - SILENCE_GATE_DB]
    result.mean_rms_dbfs = round(float(np.mean(active)), 2)
    result.dynamic_range_db = round(float(np.percentile(active, 95) - np.percentile(active, 5)), 2)
    return result


# --- Scores -------------------------------------------------------------------------------

def pitch_score(mean_abs_cents: float) -> float:
    """pitch_score = clip(100 − 2 · mean_abs_cents, 0, 100).

    0 cents → 100. 25 cents (what random tuning averages) → 50. 50 cents → 0.
    """
    return float(np.clip(100 - 2 * mean_abs_cents, 0, 100))


def rhythm_score(mean_abs_timing_error_ms: float) -> float:
    """rhythm_score = clip(100 − 2 · mean_abs_timing_error_ms, 0, 100).

    0 ms → 100. 25 ms → 50. 50 ms or more → 0.
    """
    return float(np.clip(100 - 2 * mean_abs_timing_error_ms, 0, 100))


def compute_scores(pitch: PitchMetrics, rhythm: RhythmMetrics) -> Scores:
    """0–100 scores that are direct, documented mappings of measured metrics.

    overall_score is the plain mean of whichever of pitch_score and rhythm_score exist.
    A score is None (with the underlying metric's reason) when its metric is None.
    """
    scores = Scores()
    if pitch.mean_abs_cents is not None:
        scores.pitch_score = round(pitch_score(pitch.mean_abs_cents), 1)
    else:
        scores.reasons["pitch_score"] = pitch.reasons.get("mean_abs_cents", "Pitch was not measured.")

    if rhythm.mean_abs_timing_error_ms is not None:
        scores.rhythm_score = round(rhythm_score(rhythm.mean_abs_timing_error_ms), 1)
    else:
        scores.reasons["rhythm_score"] = rhythm.reasons.get(
            "mean_abs_timing_error_ms", "Rhythm was not measured.")

    available = [s for s in (scores.pitch_score, scores.rhythm_score) if s is not None]
    if available:
        scores.overall_score = round(float(np.mean(available)), 1)
    else:
        scores.reasons["overall_score"] = "Neither pitch nor rhythm could be measured."
    return scores


# --- Entry point --------------------------------------------------------------------------

def analyze_performance(y: np.ndarray, sr: int, instrument: Optional[str] = None) -> PerformanceMetrics:
    """Run every measurement on a mono signal and return all metrics.

    Pitch is skipped (with a reason) for unpitched instruments such as drums.
    """
    y = np.asarray(y, dtype=np.float32)
    duration_s = round(len(y) / sr, 3)
    is_unpitched = (instrument or "").strip().upper() in UNPITCHED_INSTRUMENTS

    if is_unpitched or len(y) == 0:
        reason = ("Pitch is not measured for unpitched instruments." if is_unpitched
                  else "The audio is empty.")
        fmin = fmax = None
        pitch = PitchMetrics(reasons={name: reason for name in (
            "voiced_ratio", "mean_abs_cents", "median_abs_cents", "mean_signed_cents",
            "pct_frames_within_25_cents", "pitch_stability_cents", "note_count")})
        notes: list[Note] = []
    else:
        fmin, fmax = pitch_range_for(instrument)
        track = track_pitch(y, sr, fmin, fmax)
        notes = segment_notes(track)
        pitch = compute_pitch_metrics(track, notes)
        if pitch.mean_abs_cents is None:
            notes = []  # too little pitched audio for the notes to mean anything

    if len(y) == 0:
        onsets, tempo = np.array([]), 0.0
    else:
        onsets, tempo = detect_onsets_and_tempo(y, sr)
    rhythm = compute_rhythm_metrics(onsets, tempo)
    dynamics = compute_dynamics_metrics(y) if len(y) else DynamicsMetrics(
        reasons={"mean_rms_dbfs": "The audio is empty.", "dynamic_range_db": "The audio is empty."})

    return PerformanceMetrics(
        duration_s=duration_s,
        sample_rate=sr,
        pitch_fmin_hz=round(fmin, 2) if fmin else None,
        pitch_fmax_hz=round(fmax, 2) if fmax else None,
        pitch=pitch,
        rhythm=rhythm,
        dynamics=dynamics,
        scores=compute_scores(pitch, rhythm),
        notes=notes,
    )
