"""
Tests for app/services/audio/alignment.py (reference comparison with DTW).

Every recording is a generated sine melody, so the true answer (same piece, 1.2x faster,
one half detuned, different piece) is known exactly.
"""
import librosa
import numpy as np
import pytest

from app.services.audio import alignment as A

SR = 22050
# Search C3-C6: covers every test melody (A3-D5). pYIN cost grows with the square of the range,
# so a wider search would only make the tests slower without testing anything more.
FMIN, FMAX = float(librosa.note_to_hz("C3")), float(librosa.note_to_hz("C6"))
TUNE = ["C4", "E4", "G4", "C5", "B4", "G4", "E4", "D4", "F4", "A4", "C5", "D5", "C5", "A4", "F4", "D4"]
OTHER = ["A3", "C4", "F4", "E4", "D4", "B3", "G4", "F4", "A3", "B3", "E4", "C4", "G4", "D4", "A3", "E4"]


def melody(notes: list[str], note_s: float = 0.5, cents: list[float] | None = None,
           silent: set[int] | None = None) -> np.ndarray:
    """Sine melody: 90% tone + 10% gap per note, 10 ms attack, 40 ms release.

    cents detunes individual notes; notes whose index is in ``silent`` are left out (rests).
    """
    cents = cents or [0.0] * len(notes)
    tone_n = int(SR * note_s * 0.9)
    gap_n = int(SR * note_s) - tone_n
    attack, release = int(SR * 0.01), int(SR * 0.04)
    env = np.ones(tone_n)
    env[:attack] = np.linspace(0, 1, attack)
    env[-release:] = 0.5 * (1 + np.cos(np.linspace(0, np.pi, release)))
    t = np.arange(tone_n) / SR
    parts = []
    for i, (name, c) in enumerate(zip(notes, cents)):
        freq = librosa.note_to_hz(name) * 2 ** (c / 1200)
        tone = np.zeros(tone_n) if silent and i in silent else 0.5 * env * np.sin(2 * np.pi * freq * t)
        parts += [tone, np.zeros(gap_n)]
    return np.concatenate(parts).astype(np.float32)


def features(y: np.ndarray) -> A.TrackFeatures:
    return A.extract_features(y, SR, FMIN, FMAX)


@pytest.fixture(scope="module")
def reference():
    return features(melody(TUNE))


def compare_with(reference, y: np.ndarray) -> A.ComparisonResult:
    return A.compare(reference, features(y))


# --- The four required cases ----------------------------------------------------------------

def test_same_melody_is_about_100_percent_similar(reference):
    result = compare_with(reference, melody(TUNE))
    assert result.similarity > 99
    assert result.tempo_ratio == pytest.approx(1.0, abs=0.01)
    assert result.problem_sections == []
    assert result.reliable


def test_time_stretched_melody_is_similar_and_tempo_ratio_is_detected(reference):
    result = compare_with(reference, melody(TUNE, note_s=0.5 / 1.2))  # 1.2x faster
    assert result.similarity > 90
    assert result.tempo_ratio == pytest.approx(1.2, abs=0.03)
    assert all(point["tempo_ratio"] == pytest.approx(1.2, abs=0.06) for point in result.tempo_curve)
    assert {s["issue"] for s in result.problem_sections} == {"rushing"}


def test_detuned_section_is_flagged_pitch_sharp_and_only_there(reference):
    result = compare_with(reference, melody(TUNE, cents=[0.0] * 8 + [50.0] * 8))  # second half +50c
    sharp = [s for s in result.problem_sections if s["issue"] == "pitch_sharp"]
    assert len(sharp) == 1
    assert (sharp[0]["ref_start"], sharp[0]["ref_end"]) == (4.0, 8.0)
    assert "50 cents sharp" in sharp[0]["detail"]
    assert [s["issue"] for s in result.problem_sections] == ["pitch_sharp"]
    first, second = result.segments
    assert abs(first["median_cents"]) < 5 and second["median_cents"] == pytest.approx(50, abs=5)


def test_different_melody_is_clearly_less_similar_and_not_over_interpreted(reference):
    same = compare_with(reference, melody(TUNE)).similarity
    other = compare_with(reference, melody(OTHER))
    assert other.similarity < same - 30
    assert not other.reliable
    assert other.problem_sections == []           # no invented "rushing here" for another piece
    assert "may not be the same piece" in other.unreliable_reason


# --- Further behaviour ----------------------------------------------------------------------

def test_flat_section_is_flagged_pitch_flat(reference):
    result = compare_with(reference, melody(TUNE, cents=[-40.0] * 8 + [0.0] * 8))
    assert [(s["issue"], s["ref_start"], s["ref_end"]) for s in result.problem_sections] == [("pitch_flat", 0.0, 4.0)]


def test_missing_notes_are_flagged(reference):
    result = compare_with(reference, melody(TUNE, silent=set(range(8, 16))))  # second half left out
    missing = [s for s in result.problem_sections if s["issue"] == "missing_notes"]
    assert missing and missing[0]["ref_start"] == 4.0


def test_features_round_trip_through_a_file(reference, tmp_path):
    path = tmp_path / "ref.npz"
    reference.save(path)
    loaded = A.TrackFeatures.load(path)
    np.testing.assert_array_equal(loaded.chroma, reference.chroma)
    np.testing.assert_array_equal(loaded.f0_hz, reference.f0_hz)
    assert loaded.duration_s == reference.duration_s and loaded.truncated is False


def test_cut_reference_is_matched_inside_a_longer_faster_performance(reference, monkeypatch):
    """Reference cut at MAX_SECONDS; the 1.2x-faster take holds more of the piece in the same
    time. Open-end alignment must still find tempo 1.2 (forcing both ends to meet gave 1.0)."""
    monkeypatch.setattr(A, "MAX_SECONDS", 4.0)
    cut_reference = features(melody(TUNE))
    assert cut_reference.truncated and cut_reference.duration_s == pytest.approx(4.0, abs=0.01)
    result = A.compare(cut_reference, A.extract_features(melody(TUNE, note_s=0.5 / 1.2), SR, FMIN, FMAX,
                                                        max_seconds=A.MAX_PERFORMANCE_SECONDS))
    assert result.truncated
    assert result.tempo_ratio == pytest.approx(1.2, abs=0.05)
    assert result.similarity > 85
    assert result.path[-1][1] < 4.0  # the reference's 4 s end inside the take, not at its end


def test_long_audio_is_truncated_to_max_seconds(monkeypatch):
    monkeypatch.setattr(A, "MAX_SECONDS", 2.0)
    result = features(melody(TUNE[:6]))  # 3 s of audio
    assert result.truncated
    assert result.duration_s == pytest.approx(2.0, abs=0.01)


# --- Pure helpers ---------------------------------------------------------------------------

def test_similarity_mapping():
    assert A.similarity_score(0.0, 0.8) == 100
    assert A.similarity_score(0.4, 0.8) == 50
    assert A.similarity_score(0.9, 0.8) == 0


def test_cents_difference_is_octave_folded():
    ref = np.array([440.0, 440.0, 440.0, 440.0])
    user = np.array([440 * 2 ** (30 / 1200), 220.0, 880 * 2 ** (-20 / 1200), np.nan])
    cents = A.cents_difference(user, ref)
    np.testing.assert_allclose(cents[:3], [30, 0, -20], atol=1e-9)
    assert np.isnan(cents[3])


def test_local_tempo_ratio_is_reference_seconds_per_performance_second():
    ref_s = np.linspace(0, 8, 81)
    user_s = ref_s / 1.25  # performance 25% faster
    assert A.local_tempo_ratio(ref_s, user_s, 0, 8) == pytest.approx(1.25)


def test_consecutive_segments_with_the_same_issue_are_merged():
    def seg(start, cents):
        return A.Segment(start, start + 4, start, start + 4, cents, 1.0, 1.0, 1.0, 8, 8)
    sections = A.find_problem_sections([seg(0, 40), seg(4, 45), seg(8, 0), seg(12, -40)])
    assert [(s.issue, s.ref_start, s.ref_end) for s in sections] == [
        ("pitch_sharp", 0, 8), ("pitch_flat", 12, 16)]
