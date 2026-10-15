"""
"How close am I to the original?": compare a performance with a reference recording.

Dynamic Time Warping (DTW) finds which moment of the performance corresponds to which moment
of the reference, even when the player is faster, slower or uneven. Once the two are aligned,
everything else is a direct comparison at matching moments: pitch in cents, local tempo, and
whether notes are there at all. See docs/ALIGNMENT.md for a plain-language explanation.

Every function here is pure (arrays in, numbers out), so it is tested with generated audio
in tests/test_alignment.py.

Units: seconds, cents (1/100 semitone), tempo ratio (unitless; > 1 = the performance is
faster than the reference), similarity 0-100.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional

import librosa
import numpy as np
from scipy.spatial.distance import cdist

from app.services.audio.metrics import track_pitch

# --- Constants --------------------------------------------------------------------------

ANALYSIS_SR = 22050          # every recording is loaded at this rate (AudioPreprocessor)
FEATURE_HOP = 2048           # chroma / onset frames: 93 ms at 22 050 Hz (~10.8 frames per s).
                             # Keeps a 3-minute DTW cost matrix at ~1 950 x 1 950 (30 MB).
PITCH_HOP = 1024             # pYIN hop for comparison: 46 ms; half the work of the 23 ms hop
MAX_SECONDS = 180.0          # longer recordings are cut to their first 3 minutes
ONSET_WEIGHT = 0.5           # weight of the onset-strength row next to the 12 chroma rows
DTW_BAND = 0.25              # Sakoe-Chiba band: the path may stray at most 25% off the diagonal

SEGMENT_S = 4.0              # reference time is compared in 4-second segments
TEMPO_WINDOW_S = 4.0         # local tempo = slope of the path over a 4-second window ...
TEMPO_STEP_S = 1.0           # ... evaluated every second (the tempo-drift curve)
PITCH_ISSUE_CENTS = 25.0     # median |cents| above this in a segment → pitch_sharp / pitch_flat
TEMPO_ISSUE_RATIO = 1.10     # local tempo 10% faster / slower → rushing / dragging
MIN_VOICED_SHARE = 0.3       # a segment needs this share of pitched reference frames to judge pitch
MISSING_SHARE = 0.5          # performance pitched/onsets below half the reference's → missing_notes
MIN_RELIABLE_SIMILARITY = 60.0  # played_similarity below this → probably a different piece
SILENCE_DB = 40.0            # frames this far below the loudest frame count as not playing


# --- Data -------------------------------------------------------------------------------

@dataclass
class TrackFeatures:
    """Everything the comparison needs from one recording (precomputed for references).

    chroma: (12, frames) chroma_cqt at FEATURE_HOP, each frame L2-normalised.
    onset_env: (frames,) onset strength at FEATURE_HOP, scaled to 0..1.
    sounding: (frames,) True where the frame is within SILENCE_DB of the loudest frame.
    pitch_times / f0_hz: pYIN pitch track at PITCH_HOP (NaN = no pitch).
    onsets_s: note onset times in seconds.
    """
    duration_s: float
    chroma: np.ndarray
    onset_env: np.ndarray
    sounding: np.ndarray
    pitch_times: np.ndarray
    f0_hz: np.ndarray
    onsets_s: np.ndarray
    truncated: bool = False

    def save(self, path: Path) -> None:
        np.savez_compressed(path, **{k: np.asarray(v) for k, v in asdict(self).items()})

    @classmethod
    def load(cls, path: Path) -> "TrackFeatures":
        with np.load(path) as data:
            return cls(
                duration_s=float(data["duration_s"]), chroma=data["chroma"],
                onset_env=data["onset_env"], sounding=data["sounding"], pitch_times=data["pitch_times"],
                f0_hz=data["f0_hz"], onsets_s=data["onsets_s"], truncated=bool(data["truncated"]),
            )


@dataclass
class Segment:
    """One SEGMENT_S window of reference time and what happened in the matching performance span.

    median_cents: median of (performance pitch − reference pitch) over frames where both have
    a pitch, octave-folded to ±600 cents; None if too few such frames.
    tempo_ratio: reference seconds ÷ performance seconds over the segment (> 1 = faster).
    """
    ref_start: float
    ref_end: float
    user_start: float
    user_end: float
    median_cents: Optional[float]
    tempo_ratio: float
    ref_voiced_share: float
    user_voiced_share: Optional[float]
    ref_onsets: int
    user_onsets: int


@dataclass
class ProblemSection:
    ref_start: float
    ref_end: float
    user_start: float
    user_end: float
    issue: str     # pitch_flat | pitch_sharp | rushing | dragging | missing_notes
    detail: str


@dataclass
class ComparisonResult:
    similarity: float                    # 0-100, see similarity_score()
    played_similarity: Optional[float]   # same, only where the performance is sounding
    mean_path_cost: float                # mean cosine distance along the DTW path
    baseline_cost: float                 # mean cosine distance over ALL frame pairs
    tempo_ratio: float                   # whole take: reference duration ÷ performance duration
    ref_duration_s: float
    user_duration_s: float
    truncated: bool
    reliable: bool = True                # False → problem_sections withheld, see unreliable_reason
    unreliable_reason: Optional[str] = None
    tempo_curve: list[dict] = field(default_factory=list)       # [{ref_time, tempo_ratio}]
    segments: list[dict] = field(default_factory=list)
    problem_sections: list[dict] = field(default_factory=list)
    path: list[list[float]] = field(default_factory=list)       # downsampled [[ref_s, user_s], ...]

    def to_dict(self) -> dict:
        return asdict(self)


# --- Feature extraction -----------------------------------------------------------------

def extract_features(y: np.ndarray, sr: int, fmin: float, fmax: float) -> TrackFeatures:
    """Compute chroma, onset strength, pitch and onsets for one recording.

    Audio longer than MAX_SECONDS is cut to its first MAX_SECONDS (``truncated`` = True).
    """
    max_samples = int(MAX_SECONDS * sr)
    truncated = len(y) > max_samples
    y = np.asarray(y[:max_samples], dtype=np.float32)

    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=FEATURE_HOP)
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=FEATURE_HOP)
    rms = librosa.feature.rms(y=y, frame_length=FEATURE_HOP * 2, hop_length=FEATURE_HOP)[0]
    frames = min(chroma.shape[1], len(onset_env), len(rms))
    peak = float(onset_env.max()) if onset_env.size else 0.0
    onset_env = onset_env[:frames] / peak if peak > 0 else onset_env[:frames]
    level_db = 20 * np.log10(np.maximum(rms[:frames], 1e-10))
    sounding = level_db >= level_db.max() - SILENCE_DB if frames else np.zeros(0, dtype=bool)

    track = track_pitch(y, sr, fmin, fmax, hop_length=PITCH_HOP)
    onsets = librosa.onset.onset_detect(y=y, sr=sr, hop_length=512, backtrack=True, units="time")
    return TrackFeatures(
        duration_s=len(y) / sr,
        chroma=chroma[:, :frames],
        onset_env=onset_env,
        sounding=sounding,
        pitch_times=track.times,
        f0_hz=track.f0_hz,
        onsets_s=np.asarray(onsets, dtype=float),
        truncated=truncated,
    )


def feature_matrix(features: TrackFeatures, onset_weight: float = ONSET_WEIGHT) -> np.ndarray:
    """Stack chroma (12 rows) with the weighted onset strength (1 row); L2-normalise each frame.

    A small constant is added first, so silent frames become a flat (not a zero) vector and
    the cosine distance stays defined: silence matches silence.
    """
    stacked = np.vstack([features.chroma, onset_weight * features.onset_env[np.newaxis, :]]) + 1e-3
    return stacked / np.linalg.norm(stacked, axis=0, keepdims=True)


# --- Alignment --------------------------------------------------------------------------

def frames_to_seconds(frames: np.ndarray) -> np.ndarray:
    return np.asarray(frames, dtype=float) * FEATURE_HOP / ANALYSIS_SR


def align(ref: np.ndarray, user: np.ndarray, band: float = DTW_BAND) -> tuple[np.ndarray, np.ndarray, float]:
    """DTW between two feature matrices (features × frames).

    1. Cost matrix C[i, j] = cosine distance between reference frame i and performance frame j
       (0 = identical, 1 = nothing in common).
    2. librosa.sequence.dtw finds the cheapest monotonic path from (0, 0) to (end, end), with a
       Sakoe-Chiba band so the path cannot wander unrealistically far from the diagonal.

    Returns (path, path_costs, baseline_cost): path is an (n, 2) array of
    [reference_frame, performance_frame] pairs in time order; path_costs is C at each path
    point; baseline_cost is the mean of C over all frame pairs (what a random pairing would
    cost).
    """
    cost = cdist(ref.T, user.T, metric="cosine")
    _, path = librosa.sequence.dtw(C=cost, global_constraints=True, band_rad=band)
    path = path[::-1]
    return path, cost[path[:, 0], path[:, 1]], float(cost.mean())


def similarity_score(mean_path_cost: float, baseline_cost: float) -> float:
    """similarity = 100 × clip(1 − mean_path_cost / baseline_cost, 0, 1).

    "How much cheaper the best alignment is than pairing frames at random." Identical
    recordings align at zero cost → 100. A performance no closer to the reference than random
    frames → 0. Because the baseline comes from the same two recordings, the scale adapts to
    the instrument and timbre instead of relying on a fixed threshold.
    """
    if baseline_cost <= 0:
        return 100.0
    return float(np.clip(1 - mean_path_cost / baseline_cost, 0, 1) * 100)


def path_seconds(path: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """The path as two increasing arrays of seconds (reference, performance).

    Where the path moves straight up or across (one frame matched to several), the matching
    times are averaged so the reference times are strictly increasing for interpolation.
    """
    ref_frames, inverse = np.unique(path[:, 0], return_inverse=True)
    user_frames = np.bincount(inverse, weights=path[:, 1]) / np.bincount(inverse)
    return frames_to_seconds(ref_frames), frames_to_seconds(user_frames)


def local_tempo_ratio(ref_s: np.ndarray, user_s: np.ndarray, start: float, end: float) -> Optional[float]:
    """Reference seconds per performance second between ``start`` and ``end`` (reference time).

    The slope of a least-squares line user_time = a + b · ref_time over that window; the
    ratio is 1 / b. 1.2 = the performance went 20% faster than the reference there.
    """
    inside = (ref_s >= start) & (ref_s <= end)
    if np.sum(inside) < 3:
        return None
    slope, _ = np.polyfit(ref_s[inside], user_s[inside], 1)
    return float(1 / slope) if slope > 0 else None


def tempo_curve(ref_s: np.ndarray, user_s: np.ndarray,
                window_s: float = TEMPO_WINDOW_S, step_s: float = TEMPO_STEP_S) -> list[dict]:
    """Local tempo ratio every ``step_s`` seconds of reference time, over a centred window."""
    curve = []
    for centre in np.arange(window_s / 2, ref_s[-1] - window_s / 2 + 1e-9, step_s):
        ratio = local_tempo_ratio(ref_s, user_s, centre - window_s / 2, centre + window_s / 2)
        if ratio is not None:
            curve.append({"ref_time": round(float(centre), 2), "tempo_ratio": round(ratio, 3)})
    return curve


# --- Segment comparison -----------------------------------------------------------------

def cents_difference(user_hz: np.ndarray, ref_hz: np.ndarray) -> np.ndarray:
    """1200 · log2(user / reference), folded into ±600 cents so a part sung an octave lower
    (or a pitch tracker octave error) is compared by pitch class, not flagged as 1200 cents."""
    with np.errstate(divide="ignore", invalid="ignore"):
        cents = 1200 * np.log2(user_hz / ref_hz)
    return cents - 1200 * np.round(cents / 1200)


def user_pitch_at_ref_times(ref: TrackFeatures, user: TrackFeatures,
                            ref_s: np.ndarray, user_s: np.ndarray) -> np.ndarray:
    """For every reference pitch frame, the performance's f0 at the aligned moment (NaN if none)."""
    aligned_user_times = np.interp(ref.pitch_times, ref_s, user_s)
    frame = np.clip(np.round(np.interp(aligned_user_times, user.pitch_times,
                                       np.arange(len(user.pitch_times)))).astype(int),
                    0, len(user.f0_hz) - 1)
    return user.f0_hz[frame]


def compare_segments(ref: TrackFeatures, user: TrackFeatures, ref_s: np.ndarray,
                     user_s: np.ndarray, segment_s: float = SEGMENT_S) -> list[Segment]:
    """Cut reference time into ``segment_s`` windows and compare each with its aligned span."""
    user_f0 = user_pitch_at_ref_times(ref, user, ref_s, user_s)
    cents = cents_difference(user_f0, ref.f0_hz)
    segments = []
    for start in np.arange(0.0, ref.duration_s, segment_s):
        end = min(start + segment_s, ref.duration_s)
        if end - start < segment_s / 2 and segments:
            break  # a short tail is not judged on its own
        user_start, user_end = (float(t) for t in np.interp([start, end], ref_s, user_s))
        in_seg = (ref.pitch_times >= start) & (ref.pitch_times < end)
        ref_voiced = in_seg & ~np.isnan(ref.f0_hz)
        both = ref_voiced & ~np.isnan(user_f0)
        ref_voiced_share = float(ref_voiced.sum() / max(in_seg.sum(), 1))
        segments.append(Segment(
            ref_start=round(float(start), 2), ref_end=round(float(end), 2),
            user_start=round(user_start, 2), user_end=round(user_end, 2),
            median_cents=(round(float(np.median(cents[both])), 1)
                          if both.sum() >= max(3, MIN_VOICED_SHARE * in_seg.sum()) else None),
            tempo_ratio=round(local_tempo_ratio(ref_s, user_s, start, end) or 1.0, 3),
            ref_voiced_share=round(ref_voiced_share, 3),
            user_voiced_share=(round(float(both.sum() / ref_voiced.sum()), 3) if ref_voiced.sum() else None),
            ref_onsets=int(np.sum((ref.onsets_s >= start) & (ref.onsets_s < end))),
            user_onsets=int(np.sum((user.onsets_s >= user_start) & (user.onsets_s < user_end))),
        ))
    return segments


def segment_issues(segment: Segment) -> list[tuple[str, str]]:
    """The documented rules that turn one segment's numbers into (issue, detail) pairs."""
    issues = []
    if segment.ref_voiced_share >= MIN_VOICED_SHARE and segment.user_voiced_share is not None \
            and segment.user_voiced_share < MISSING_SHARE:
        issues.append(("missing_notes", f"The original has notes here, but only {segment.user_voiced_share:.0%} "
                                        "of them were matched by a pitch in your take."))
    elif segment.ref_onsets >= 2 and segment.user_onsets < MISSING_SHARE * segment.ref_onsets:
        issues.append(("missing_notes", f"The original has {segment.ref_onsets} note starts here; "
                                        f"your take has {segment.user_onsets}."))
    if segment.median_cents is not None and abs(segment.median_cents) > PITCH_ISSUE_CENTS:
        issue = "pitch_sharp" if segment.median_cents > 0 else "pitch_flat"
        issues.append((issue, f"{abs(segment.median_cents):.0f} cents {issue.split('_')[1]} of the original "
                              "on average here."))
    if segment.tempo_ratio > TEMPO_ISSUE_RATIO:
        issues.append(("rushing", f"{(segment.tempo_ratio - 1) * 100:.0f}% faster than the original here."))
    elif segment.tempo_ratio < 1 / TEMPO_ISSUE_RATIO:
        issues.append(("dragging", f"{(1 - segment.tempo_ratio) * 100:.0f}% slower than the original here."))
    return issues


def find_problem_sections(segments: list[Segment]) -> list[ProblemSection]:
    """Flag segments by segment_issues(); consecutive segments with the same issue are merged."""
    sections: list[ProblemSection] = []
    for segment in segments:
        for issue, detail in segment_issues(segment):
            last = next((s for s in reversed(sections) if s.issue == issue), None)
            if last is not None and last.ref_end == segment.ref_start:
                last.ref_end, last.user_end = segment.ref_end, segment.user_end
                continue
            sections.append(ProblemSection(segment.ref_start, segment.ref_end,
                                           segment.user_start, segment.user_end, issue, detail))
    return sorted(sections, key=lambda s: (s.ref_start, s.issue))


# --- Entry point ------------------------------------------------------------------------

def compare(ref: TrackFeatures, user: TrackFeatures, max_path_points: int = 400) -> ComparisonResult:
    """Align a performance with a reference and describe the differences.

    similarity scores the whole alignment. played_similarity scores only the path points
    where the performance is sounding: leaving out a passage lowers ``similarity`` but not
    ``played_similarity``, while playing a different piece lowers both.

    If played_similarity is below MIN_RELIABLE_SIMILARITY the take is probably not the same
    piece. DTW still finds *some* path (it warps to whatever matches best), so per-section
    tempo and pitch would be guesswork: problem_sections is then empty and
    unreliable_reason says why. Similarity, segments and the tempo curve are still returned.
    """
    path, path_costs, baseline = align(feature_matrix(ref), feature_matrix(user))
    path_cost = float(path_costs.mean())
    ref_s, user_s = path_seconds(path)
    segments = compare_segments(ref, user, ref_s, user_s)
    similarity = round(similarity_score(path_cost, baseline), 1)
    playing = user.sounding[path[:, 1]]
    played_similarity = (round(similarity_score(float(path_costs[playing].mean()), baseline), 1)
                         if playing.any() else None)
    reliable = played_similarity is not None and played_similarity >= MIN_RELIABLE_SIMILARITY
    step = max(1, len(ref_s) // max_path_points)
    return ComparisonResult(
        similarity=similarity,
        played_similarity=played_similarity,
        mean_path_cost=round(path_cost, 4),
        baseline_cost=round(baseline, 4),
        tempo_ratio=round(ref.duration_s / user.duration_s, 3) if user.duration_s else 1.0,
        ref_duration_s=round(ref.duration_s, 2),
        user_duration_s=round(user.duration_s, 2),
        truncated=ref.truncated or user.truncated,
        reliable=reliable,
        unreliable_reason=None if reliable else (
            "The performance is silent." if played_similarity is None else
            f"Where you play, similarity is only {played_similarity:.0f}/100, so this take may not "
            "be the same piece; section-by-section feedback would be guesswork."),
        tempo_curve=tempo_curve(ref_s, user_s),
        segments=[asdict(s) for s in segments],
        problem_sections=[asdict(s) for s in find_problem_sections(segments)] if reliable else [],
        path=[[round(float(r), 2), round(float(u), 2)] for r, u in zip(ref_s[::step], user_s[::step])],
    )
