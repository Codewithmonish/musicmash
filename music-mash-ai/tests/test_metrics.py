"""
Tests for app/services/audio/metrics.py.

All test audio is generated here (sines, click tracks, noise), so the expected answer is
known exactly and no audio files need to be downloaded.
"""
import numpy as np
import pytest

from app.services.audio import metrics as m

SR = 22050
A4 = 440.0


# --- Signal generators --------------------------------------------------------------------

def sine(freq_hz: float, seconds: float, amplitude: float = 0.5) -> np.ndarray:
    t = np.arange(int(SR * seconds)) / SR
    return (amplitude * np.sin(2 * np.pi * freq_hz * t)).astype(np.float32)


def detune(freq_hz: float, cents: float) -> float:
    return freq_hz * 2 ** (cents / 1200)


def melody(freqs_hz: list[float], note_seconds: float) -> np.ndarray:
    """Phase-continuous sine melody (no clicks between notes)."""
    per_sample = np.repeat(freqs_hz, int(SR * note_seconds))
    phase = 2 * np.pi * np.cumsum(per_sample) / SR
    return (0.5 * np.sin(phase)).astype(np.float32)


def click_track(click_times_s: np.ndarray, seconds: float) -> np.ndarray:
    """Short decaying 1 kHz bursts at the given times."""
    y = np.zeros(int(SR * seconds), dtype=np.float32)
    n = int(0.01 * SR)
    burst = np.sin(2 * np.pi * 1000 * np.arange(n) / SR) * np.exp(-np.arange(n) / (0.002 * SR))
    for t in click_times_s:
        i = int(round(t * SR))
        y[i:i + n] += burst[: len(y[i:i + n])]
    return y


def beat_times(bpm: float, count: int, start_s: float = 0.5) -> np.ndarray:
    return start_s + np.arange(count) * 60.0 / bpm


C_MAJOR = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]


# --- Analysed fixtures (each signal analysed once per test module) -------------------------

@pytest.fixture(scope="module")
def in_tune():
    return m.analyze_performance(sine(A4, 2.0), SR)


@pytest.fixture(scope="module")
def sharp_30():
    return m.analyze_performance(sine(detune(A4, 30), 2.0), SR)


@pytest.fixture(scope="module")
def scale():
    freqs = [float(f) for f in m.librosa.note_to_hz(C_MAJOR)]
    return m.analyze_performance(melody(freqs, 0.4), SR)


@pytest.fixture(scope="module")
def clean_clicks():
    return m.analyze_performance(click_track(beat_times(120, 16), 9.0), SR)


@pytest.fixture(scope="module")
def jittered_clicks():
    rng = np.random.default_rng(seed=0)
    times = beat_times(120, 16) + rng.uniform(-0.040, 0.040, size=16)
    return m.analyze_performance(click_track(times, 9.0), SR)


# --- Pure helper functions ----------------------------------------------------------------

def test_cents_from_nearest_semitone_exact_values():
    freqs = np.array([A4, detune(A4, 30), detune(A4, -12), detune(A4, 70), np.nan])
    cents = m.cents_from_nearest_semitone(freqs)
    np.testing.assert_allclose(cents[:4], [0, 30, -12, -30], atol=1e-9)  # +70 → A#4 −30
    assert np.isnan(cents[4])


def test_scores_are_documented_linear_mappings():
    assert m.pitch_score(0) == 100
    assert m.pitch_score(10) == 80
    assert m.pitch_score(60) == 0
    assert m.rhythm_score(5) == 90
    assert m.rhythm_score(80) == 0


def test_fit_beat_grid_recovers_period_and_errors():
    onsets = beat_times(100, 12)
    onsets[5] += 0.020  # one onset 20 ms late
    grid = m.fit_beat_grid(onsets, tempo_bpm=98)  # deliberately wrong starting tempo
    assert m.grid_tempo_bpm(grid.period_s) == pytest.approx(100, abs=0.5)
    assert np.argmax(grid.residuals_s) == 5
    assert grid.residuals_s[5] * 1000 == pytest.approx(20, abs=3)


def test_tempo_drift_detects_rushing():
    first = 0.5 + np.arange(8) * 0.6           # 100 BPM
    second = first[-1] + 0.5 + np.arange(8) * 0.5  # 120 BPM
    drift = m.tempo_drift_bpm(np.concatenate([first, second]), tempo_bpm=110)
    assert drift == pytest.approx(20, abs=2)


# --- Pitch on generated audio -------------------------------------------------------------

def test_in_tune_sine_has_small_deviation(in_tune):
    assert in_tune.pitch.voiced_ratio > 0.9
    assert in_tune.pitch.mean_abs_cents < 5
    assert in_tune.pitch.pct_frames_within_25_cents > 95
    assert in_tune.scores.pitch_score > 90


def test_detuned_sine_measures_plus_30_cents(sharp_30):
    assert sharp_30.pitch.mean_signed_cents == pytest.approx(30, abs=5)
    assert sharp_30.pitch.mean_abs_cents == pytest.approx(30, abs=5)
    assert sharp_30.pitch.pct_frames_within_25_cents < 5


def test_steady_sine_is_stable(in_tune):
    assert in_tune.pitch.pitch_stability_cents < 3


def test_c_major_scale_is_segmented_into_8_named_notes(scale):
    assert [n.note_name for n in scale.notes] == C_MAJOR
    assert scale.pitch.note_count == 8
    for note in scale.notes:
        assert note.end - note.start == pytest.approx(0.4, abs=0.1)
        assert abs(note.mean_cents) < 5


# --- Rhythm on generated audio ------------------------------------------------------------

def test_clean_click_track_tempo_and_timing(clean_clicks):
    rhythm = clean_clicks.rhythm
    assert rhythm.onset_count == 16
    assert rhythm.tempo_bpm == pytest.approx(120, abs=3)
    assert rhythm.mean_abs_timing_error_ms < 10
    assert rhythm.pct_onsets_within_30ms == 100
    assert rhythm.tempo_stability_cv < 0.02


def test_jittered_clicks_have_clearly_higher_timing_error(clean_clicks, jittered_clicks):
    clean = clean_clicks.rhythm.mean_abs_timing_error_ms
    jittered = jittered_clicks.rhythm.mean_abs_timing_error_ms
    assert jittered > 15
    assert jittered > 3 * clean
    assert jittered_clicks.scores.rhythm_score < clean_clicks.scores.rhythm_score


def test_click_track_has_no_pitch_metrics(clean_clicks):
    assert clean_clicks.pitch.mean_abs_cents is None
    assert "detectable pitch" in clean_clicks.pitch.reasons["mean_abs_cents"]
    assert clean_clicks.scores.pitch_score is None
    assert clean_clicks.scores.overall_score == clean_clicks.scores.rhythm_score


# --- Silence, noise and edge cases ---------------------------------------------------------

def test_silence_returns_nulls_with_reasons_and_does_not_crash():
    result = m.analyze_performance(np.zeros(SR * 2, dtype=np.float32), SR)
    flat = result.to_flat_dict()
    for name in ("mean_abs_cents", "pitch_stability_cents", "tempo_bpm",
                 "mean_abs_timing_error_ms", "mean_rms_dbfs", "pitch_score", "overall_score"):
        assert flat[name] is None
        assert flat["unavailable_reasons"][name]
    assert flat["voiced_ratio"] == 0
    assert flat["notes"] == []


@pytest.mark.parametrize("seed", [0, 1, 2])
def test_white_noise_returns_null_pitch_with_reason(seed):
    noise = 0.1 * np.random.default_rng(seed).standard_normal(SR * 2).astype(np.float32)
    result = m.analyze_performance(noise, SR)
    assert result.pitch.voiced_ratio < m.MIN_VOICED_RATIO
    assert result.pitch.mean_abs_cents is None
    assert result.pitch.reasons["mean_abs_cents"]
    assert result.scores.pitch_score is None
    assert result.notes == []


def test_empty_audio_does_not_crash():
    flat = m.analyze_performance(np.array([], dtype=np.float32), SR).to_flat_dict()
    assert flat["duration_s"] == 0
    assert flat["overall_score"] is None
    assert flat["unavailable_reasons"]["mean_abs_cents"] == "The audio is empty."


def test_unpitched_instrument_skips_pitch():
    result = m.analyze_performance(sine(A4, 1.0), SR, instrument="DRUMS")
    assert result.pitch.mean_abs_cents is None
    assert "unpitched" in result.pitch.reasons["mean_abs_cents"]


def test_instrument_pitch_ranges():
    assert m.pitch_range_for("guitar") == pytest.approx((82.41, 1318.51), abs=0.01)
    assert m.pitch_range_for(None) == m.pitch_range_for("UNKNOWN_INSTRUMENT")


def test_dynamics_of_a_sine():
    result = m.analyze_performance(sine(A4, 1.0, amplitude=1.0), SR)
    assert result.dynamics.mean_rms_dbfs == pytest.approx(-3.0, abs=0.5)  # full-scale sine
    # A constant tone has no real dynamics; the ~1 dB left comes from the zero-padded
    # RMS frames at the very start and end of the clip.
    assert result.dynamics.dynamic_range_db < 2
