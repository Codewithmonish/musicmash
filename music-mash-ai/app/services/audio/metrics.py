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
NOTE_EDGE_FRAMES = 2         # frames dropped at each end of a note for its cents stats
                             # (half a 2048-sample window: those frames hear the neighbour)
IN_TUNE_CENTS = 25.0         # threshold for pct_frames_within_25_cents

GRID_SUBDIVISIONS = 4        # beat grid resolution: 4 = sixteenth notes
ON_TIME_MS = 30.0            # threshold for pct_onsets_within_30ms
MIN_ONSETS = 8               # below this, rhythm metrics are not reported
STABILITY_WINDOW = 8         # inter-onset intervals per rolling window for tempo_stability_cv
MIN_BEATS = 4                # below this, rhythm metrics are not reported
MIN_BEATS_PER_HALF = 4       # needed in each half of the take to measure tempo drift

SILENCE_GATE_DB = 60.0       # RMS frames this far below the loudest frame count as silence

CONTOUR_MAX_POINTS = 1500    # the stored pitch contour is downsampled to at most this many points

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
    """A steady grid (perfect metronome) and each onset's distance from it.

    period_s: length of one grid step (one subdivision) in seconds.
    phase_s: time of grid index 0 in seconds.
    indices: grid index assigned to each onset.
    residuals_s: onset time minus its grid time, in seconds (negative = early).
    """
    period_s: float
    phase_s: float
    indices: np.ndarray
    residuals_s: np.ndarray


@dataclass(frozen=True)
class ContourPoint:
    """One point of the downsampled pitch contour.

    t: time in seconds. voiced: whether this stretch has a pitch.
    midi_float: fractional MIDI pitch (69.0 = A4 exactly), None when unvoiced.
    cents_off: deviation from the nearest semitone in cents (+ = sharp), None when unvoiced.
    """
    t: float
    midi_float: Optional[float]
    cents_off: Optional[float]
    voiced: bool


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
    pitch_contour: list[ContourPoint] = field(default_factory=list)

    def to_flat_dict(self) -> dict:
        """All metrics in one flat dict, plus ``notes``, ``pitch_contour`` and
        ``unavailable_reasons``."""
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
        flat["pitch_contour"] = [vars(point).copy() for point in self.pitch_contour]
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

    mean_cents and cents_std use the note's interior: NOTE_EDGE_FRAMES frames are dropped at
    each end, because their analysis window overlaps the neighbouring note (short notes
    keep all their frames).
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
                if len(run_cents) > 2 * NOTE_EDGE_FRAMES + 2:
                    run_cents = run_cents[NOTE_EDGE_FRAMES:-NOTE_EDGE_FRAMES]
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


def downsample_contour(track: PitchTrack, max_points: int = CONTOUR_MAX_POINTS) -> list[ContourPoint]:
    """Shrink the frame-wise pitch track to at most ``max_points`` points for plotting.

    Frames are split into consecutive buckets of ceil(frames / max_points) frames (one frame
    per bucket if the track is already short enough). Each bucket becomes one point:
      t          = mean frame time of the bucket
      voiced     = at least half of its frames are voiced
      midi_float = median fractional MIDI pitch of its voiced frames (a median keeps a
                   bucket that straddles two notes on one of them instead of in between)
      cents_off  = 100 · (midi_float − round(midi_float))
    No pitch value is invented: unvoiced buckets have midi_float and cents_off None.
    """
    n = len(track.f0_hz)
    if n == 0:
        return []
    bucket = int(np.ceil(n / max_points))
    midi = hz_to_midi_float(track.f0_hz)
    points: list[ContourPoint] = []
    for start in range(0, n, bucket):
        bucket_midi = midi[start:start + bucket]
        voiced_midi = bucket_midi[~np.isnan(bucket_midi)]
        t = round(float(np.mean(track.times[start:start + bucket])), 3)
        if len(voiced_midi) * 2 >= len(bucket_midi):
            midi_float = float(np.median(voiced_midi))
            cents = 100.0 * (midi_float - round(midi_float))
            points.append(ContourPoint(t, round(midi_float, 3), round(cents, 1), True))
        else:
            points.append(ContourPoint(t, None, None, False))
    return points


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

def detect_onsets_and_beats(
    y: np.ndarray, sr: int, hop_length: int = ONSET_HOP_LENGTH
) -> tuple[np.ndarray, np.ndarray]:
    """Detect note onsets and beats, both in seconds.

    Onsets: librosa.onset.onset_detect on the spectral-flux onset envelope, with
    backtrack=True so each onset is moved back to the energy minimum just before the attack.
    Beats: librosa.beat.beat_track on the same envelope (dynamic-programming beat tracker;
    consecutive beats are one beat apart, even through rests).
    """
    envelope = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
    onsets = librosa.onset.onset_detect(
        onset_envelope=envelope, sr=sr, hop_length=hop_length, backtrack=True, units="time"
    )
    _, beats = librosa.beat.beat_track(
        onset_envelope=envelope, sr=sr, hop_length=hop_length, units="time"
    )
    return np.asarray(onsets, dtype=float), np.asarray(beats, dtype=float)


def fit_line_tempo(beats_s: np.ndarray) -> tuple[float, float]:
    """Least-squares line through beat times: beat_k = phase + k · period (k = 0, 1, 2, ...).

    Returns (period_s, phase_s). The tempo is 60 / period_s BPM.
    """
    period, phase = np.polyfit(np.arange(len(beats_s)), beats_s, 1)
    return float(period), float(phase)


def fit_beat_grid(
    beats_s: np.ndarray, onsets_s: np.ndarray, subdivisions: int = GRID_SUBDIVISIONS
) -> GridFit:
    """Build a steady grid from the tracked beats and measure each onset against it.

    1. Fit a straight line through the beat times (fit_line_tempo): a perfect metronome at
       the performance's average tempo.
    2. Split every beat into ``subdivisions`` grid steps (4 = sixteenth notes).
    3. Each onset's residual = onset time − nearest grid time (negative = early).
    4. Remove the median residual. The onset detector marks the start of an attack and the
       beat tracker its peak, so there is a constant offset between them; that offset (and
       any constant audio latency) is not the player's timing error.
    """
    beat_period, phase = fit_line_tempo(beats_s)
    step = beat_period / subdivisions

    def residuals_for(grid_phase: float) -> tuple[np.ndarray, np.ndarray]:
        indices = np.round((onsets_s - grid_phase) / step)
        return indices, onsets_s - (grid_phase + indices * step)

    _, residuals = residuals_for(phase)
    phase += float(np.median(residuals))
    indices, residuals = residuals_for(phase)
    return GridFit(float(step), phase, indices, residuals)


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


def tempo_drift_bpm(beats_s: np.ndarray) -> Optional[float]:
    """Tempo of the second half of the take minus tempo of the first half, in BPM.

    The beats are split at the midpoint in time and each half gets its own straight-line
    tempo fit (fit_line_tempo). Positive = speeding up (rushing), negative = slowing down
    (dragging). Returns None if either half has fewer than MIN_BEATS_PER_HALF beats.
    """
    midpoint = (beats_s[0] + beats_s[-1]) / 2
    halves = (beats_s[beats_s < midpoint], beats_s[beats_s >= midpoint])
    if any(len(half) < MIN_BEATS_PER_HALF for half in halves):
        return None
    first, second = (60.0 / fit_line_tempo(half)[0] for half in halves)
    return float(second - first)


def compute_rhythm_metrics(onsets_s: np.ndarray, beats_s: np.ndarray) -> RhythmMetrics:
    """Timing metrics from onset and beat times.

    onset_count               number of detected onsets.
    tempo_bpm                 60 / period of the straight line through the beats.
    tempo_stability_cv        see tempo_stability_cv(); lower = steadier pulse.
    tempo_drift_bpm           see tempo_drift_bpm(); > 0 rushing, < 0 dragging.
    mean_abs_timing_error_ms  mean |onset − nearest grid point| on a steady sixteenth-note
                              grid (fit_beat_grid), in ms.
    pct_onsets_within_30ms    % of onsets within ±30 ms of that grid.

    Needs at least MIN_ONSETS onsets and MIN_BEATS beats, otherwise all values except
    onset_count are None with a reason.
    """
    result = RhythmMetrics(onset_count=int(len(onsets_s)))
    names = ("tempo_bpm", "tempo_stability_cv", "tempo_drift_bpm",
             "mean_abs_timing_error_ms", "pct_onsets_within_30ms")

    if len(onsets_s) < MIN_ONSETS:
        reason = f"Only {len(onsets_s)} note onsets were detected (at least {MIN_ONSETS} are needed)."
        result.reasons.update({name: reason for name in names})
        return result
    if len(beats_s) < MIN_BEATS:
        reason = "No steady beat could be detected."
        result.reasons.update({name: reason for name in names})
        return result

    grid = fit_beat_grid(beats_s, onsets_s)
    abs_error_ms = np.abs(grid.residuals_s) * 1000

    result.tempo_bpm = round(60.0 / (grid.period_s * GRID_SUBDIVISIONS), 2)
    result.mean_abs_timing_error_ms = round(float(np.mean(abs_error_ms)), 2)
    result.pct_onsets_within_30ms = round(float(np.mean(abs_error_ms <= ON_TIME_MS) * 100), 1)

    cv = tempo_stability_cv(onsets_s, grid.indices)
    if cv is None:
        result.reasons["tempo_stability_cv"] = "Onsets are too close together to measure the pulse."
    else:
        result.tempo_stability_cv = round(cv, 4)

    drift = tempo_drift_bpm(beats_s)
    if drift is None:
        result.reasons["tempo_drift_bpm"] = (
            f"Each half of the take needs at least {MIN_BEATS_PER_HALF} beats to compare tempos."
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
        contour: list[ContourPoint] = []
    else:
        fmin, fmax = pitch_range_for(instrument)
        track = track_pitch(y, sr, fmin, fmax)
        notes = segment_notes(track)
        contour = downsample_contour(track, CONTOUR_MAX_POINTS)
        pitch = compute_pitch_metrics(track, notes)
        if pitch.mean_abs_cents is None:
            # Too little pitched audio for the notes or the curve to mean anything.
            notes, contour = [], []

    if len(y) == 0:
        onsets, beats = np.array([]), np.array([])
    else:
        onsets, beats = detect_onsets_and_beats(y, sr)
    rhythm = compute_rhythm_metrics(onsets, beats)
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
        pitch_contour=contour,
    )
