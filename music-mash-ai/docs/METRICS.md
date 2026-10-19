# Audio metrics: what we measure and how

Every number the AI service reports comes from `app/services/audio/metrics.py`. This page
documents each formula, its unit, and what it does **not** capture.

**Honesty rule:** if a metric can't be measured it is `null`, and the reason is stored in
`unavailable_reasons[<metric name>]`. The UI then shows "Not available" with that reason.
Nothing is ever filled in with a default guess.

## Pipeline

1. **Load** the file as mono at 22 050 Hz (`AudioPreprocessor`).
2. **Trim** leading and trailing silence (anything 40 dB below the peak). Silence *inside*
   the take is kept. The level is not normalised.
3. **Pitch:** pYIN, refined by YIN → cents deviation → notes → pitch metrics.
4. **Rhythm:** onsets and beats → steady beat grid → timing metrics.
5. **Dynamics:** frame RMS → dBFS statistics (descriptive only).
6. **Scores:** fixed linear mappings of one metric each.

| Constant | Value | Meaning |
|---|---|---|
| `FRAME_LENGTH` / `HOP_LENGTH` | 2048 / 512 samples (93 / 23 ms) | Pitch and RMS frames |
| `ONSET_HOP_LENGTH` | 128 samples (5.8 ms) | Onset and beat resolution |
| Reference pitch | A4 = 440 Hz, 12-tone equal temperament | |

---

## 1. Pitch tracking

**`track_pitch`.** [pYIN](https://www.eecs.qmul.ac.uk/~simond/pub/2014/MauchDixon-PYIN-ICASSP2014.pdf)
(probabilistic YIN) estimates the fundamental frequency (f0) of each frame and decides
which frames are voiced (have a pitch).

- **Search range** depends on the instrument. pYIN only looks for f0 inside it:

  | Instrument | Range | | Instrument | Range |
  |---|---|---|---|---|
  | VOCALS | C2–C6 | | CELLO | C2–A5 |
  | GUITAR | E2–E6 | | FLUTE | C4–C7 |
  | BASS | B0–G4 | | SAXOPHONE | A2–F5 |
  | PIANO | A1–C7 | | TRUMPET | E3–C6 |
  | VIOLIN | G3–E7 | | *other / unknown* | C2–C7 |

  DRUMS and PERCUSSION skip pitch entirely (reason: "unpitched instrument").
- **Voiced** means pYIN flags the frame *and* its voiced probability is ≥ 0.5. On white
  noise, pYIN's flag alone marks up to 55% of frames as voiced; with the probability
  threshold the share drops to 0%.
- **Precision:** librosa's pYIN snaps f0 to a 10-cent grid, so a +7-cent detune would read
  as +10. Each voiced frame therefore uses plain YIN's estimate instead (sub-cent
  resolution through parabolic interpolation), as long as YIN agrees with pYIN to within
  50 cents. YIN adds a small, consistent bias of about **+1.5 cents** at 440 Hz.

## 2. Intonation: cents from the nearest note

> **Intonation, not note accuracy.** Without a reference melody we don't know which note
> the player *meant*, so every frame is compared to the **nearest** equal-tempered note.
> That distance can never exceed ±50 cents (halfway to the next note). A wrong note played
> perfectly in tune therefore scores as perfect intonation. These metrics answer "how well
> centred are the notes you played?", not "did you play the right notes?". Note accuracy
> needs a reference track and arrives with Phase 3 (reference comparison).

For each voiced frame:

```
midi  = 69 + 12 · log2(f0 / 440)
cents = 100 · (midi − round(midi))          ∈ [−50, +50], + = sharp
```

| Metric | Formula | Unit |
|---|---|---|
| `voiced_ratio` | voiced frames / all frames | 0–1 |
| `mean_abs_cents` | mean of \|cents\| over voiced frames | cents |
| `median_abs_cents` | median of \|cents\| over voiced frames (robust to slides between notes) | cents |
| `mean_signed_cents` | mean of cents; > 0 means the take sits sharp overall | cents |
| `pct_frames_within_25_cents` | % of voiced frames with \|cents\| ≤ 25 | % |
| `pitch_stability_cents` | mean over sustained notes (≥ 200 ms) of the std of cents within each note; lower = steadier | cents |
| `note_count` | number of segmented notes (§3) | count |

**Gate:** if `voiced_ratio` < 0.2, every pitch metric except `voiced_ratio` is `null`
("Only N% of the recording has a detectable pitch").

**What these do NOT capture**

- **Wrong notes.** See the box above: deviation is measured from the *nearest*
  semitone (max ±50¢), so a confidently played wrong note scores as perfectly in tune.
  Phase 3 (reference-track comparison) addresses this.
- **Non-equal-temperament tuning.** Just intonation, maqam, blue notes, or a band tuned
  to A = 442 Hz all count as "out of tune". At A = 442 every note reads about +8 cents.
- **Vibrato.** Expressive vibrato raises `mean_abs_cents` and `pitch_stability_cents`
  just like unintended wobble.
- **Wrap-around.** A note 45 cents sharp of C is 55 cents flat of C#, so it reads as −45
  near the boundary. Deviations close to ±50 are ambiguous.
- **Polyphony.** pYIN tracks one pitch. Chords, piano accompaniment or a backing track
  confuse it.
- Slides between notes count toward `mean_abs_cents`. Use `median_abs_cents` for a
  view that mostly ignores them.

## 3. Note segmentation

**`segment_notes`.** Consecutive voiced frames that share the same nearest MIDI note form a
note. Runs shorter than **80 ms** are dropped as glides or detection blips. An unvoiced
frame always ends a note.

Each note is `{start, end, midi, note_name, mean_cents, cents_std}` (times in seconds).
`mean_cents` and `cents_std` skip **2 frames at each end** of the note: those frames'
93 ms analysis window overlaps the neighbouring note. Without this, a perfectly steady
synthetic scale reads ±11 cents of "wobble"; with it, ±0.5.

*Doesn't capture:* repeated notes with no gap (legato repeated notes merge into one),
and notes with vibrato wider than ±50 cents (they split).

### Pitch contour (for the chart)

**`downsample_contour`.** The frame-wise pitch track (one frame per 23 ms) is shrunk to at
most **1500 points**, computed during analysis, stored as JSON, and served by
`GET /api/ai/result/{id}/pitch-contour`. Frames are grouped into consecutive buckets of
`ceil(frames / 1500)`. Each bucket becomes one point:

| Field | Formula |
|---|---|
| `t` | mean frame time in the bucket (s) |
| `voiced` | at least half of the bucket's frames are voiced |
| `midi_float` | **median** fractional MIDI pitch of the voiced frames. A median keeps a bucket that spans two notes on one of them, instead of averaging to a pitch nobody sang. |
| `cents_off` | `100 · (midi_float − round(midi_float))`, so always within ±50 |

Unvoiced points have `midi_float` and `cents_off` = `null`.

**Chart colour bands** (`PitchContourChart`, `mode` prop):

| Mode | Green | Amber | Red | Used when |
|---|---|---|---|---|
| `reference-free` (default) | ≤ 20¢ | 20–35¢ | > 35¢ | Comparing to the nearest note (now). Bands sit inside the ±50¢ that is possible. |
| `reference` | ≤ 25¢ | 25–50¢ | > 50¢ | Comparing to a reference melody (Phase 3), where a wrong note can be 100¢+ off. | If pitch metrics are unavailable
(the voiced-ratio gate in §2), the contour is empty and the endpoint returns the same reason.
*Doesn't capture:* recordings longer than ~35 s lose time resolution (a 3-minute take
gives one point per ~140 ms), so very fast ornaments are smoothed out of the chart. The
metrics in §2 always use every frame.

## 4. Rhythm

**`detect_onsets_and_beats`**
- **Onsets:** `librosa.onset.onset_detect` on the spectral-flux envelope, with
  `backtrack=True` (each onset moves back to the energy minimum before the attack).
- **Beats:** `librosa.beat.beat_track` on the same envelope. Beat *k* is always one beat
  after beat *k−1*, which keeps the steady-grid fit simple and unambiguous.

**`fit_beat_grid`.** The steady grid:
1. Least-squares line through the beat times: `beat_k = phase + k · period`. This is a
   perfect metronome at the take's average tempo.
2. Split each beat into 4 (a **sixteenth-note grid**).
3. Residual = onset time − nearest grid time (negative = early).
4. Subtract the **median** residual. The onset detector marks the start of an attack and
   the beat tracker its peak, so there's a constant offset between them. That offset (and
   any constant recording latency) isn't the player's error.

| Metric | Formula | Unit |
|---|---|---|
| `onset_count` | number of detected onsets | count |
| `tempo_bpm` | 60 / period of the line through the beats | BPM |
| `mean_abs_timing_error_ms` | mean \|residual\| | ms |
| `pct_onsets_within_30ms` | % of onsets with \|residual\| ≤ 30 ms | % |
| `tempo_stability_cv` | each inter-onset interval ÷ the grid steps it spans; CV = std/mean in rolling windows of 8; median of the windows | unitless (0 = even) |
| `tempo_drift_bpm` | line-fit tempo of the second half of the beats − first half; > 0 rushing, < 0 dragging | BPM |

**Gate:** fewer than 8 onsets or 4 beats → all rhythm metrics `null` with a reason.
`tempo_drift_bpm` additionally needs 4 beats in each half.

**What these do NOT capture**

- **Intentional rubato and tempo changes.** The grid is a single steady tempo, so a
  deliberate ritardando or a section change counts as timing error.
- **Swing and triplets.** Swung eighths and triplets don't sit on a sixteenth grid and
  will show error even when played well.
- **Which grid position was intended.** An onset is compared to the *nearest* sixteenth.
  An onset more than half a sixteenth late (1/8 of a beat, 62 ms at 120 BPM) snaps to
  the next grid point and looks early.
- **Tempo octave errors.** The beat tracker can lock onto half or double the felt tempo.
  The grid is still valid for timing, but `tempo_bpm` will be off by ×2.
- **Abrupt note endings.** A note cut off within ~10 ms is effectively a click, and the
  onset detector reports it as a second onset (found in the live demo: 24 onsets for 12
  notes and a false "uneven pulse"). Natural decays and the demo's 40 ms release are fine.
- **Short takes.** With only a few beats per half, `tempo_drift_bpm` is noisy: on 8 s of
  randomly jittered clicks it read +2.4 BPM with no real drift.
- Being "early" or "late" relative to a band or backing track. There is no external
  reference here; that's Phase 3.

## 5. Dynamics (descriptive only)

Frame RMS → `level_db = 20 · log10(rms)` (dB relative to full scale). Frames more than
60 dB below the loudest frame count as silence and are excluded.

| Metric | Formula | Unit |
|---|---|---|
| `mean_rms_dbfs` | mean of `level_db` | dBFS (a full-scale sine ≈ −3) |
| `dynamic_range_db` | 95th − 5th percentile of `level_db` | dB |

These feed **no** score. A dynamic range isn't good or bad without knowing the music.
*Doesn't capture:* perceived loudness (no frequency weighting), or anything that
depends on microphone distance or gain, which changes both numbers.

## 6. Scores (0–100)

Each score maps one metric through a fixed linear formula, so anyone can recompute it:

| Score | Formula | Examples |
|---|---|---|
| `intonation_score` | `clip(100 − 4 × mean_abs_cents, 0, 100)` | 0 ¢ → 100 · 5 ¢ → 80 · 12.5 ¢ → 50 · ≥ 25 ¢ → 0 |
| `rhythm_score` | `clip(100 − 2 × mean_abs_timing_error_ms, 0, 100)` | 0 ms → 100 · 10 ms → 80 · 25 ms → 50 · ≥ 50 ms → 0 |
| `overall_score` | mean of whichever of the two above exist | |

A score is `null` when its metric is `null`.

**Why ×4 for intonation.** Nearest-note cents are bounded at 50, and completely random
tuning already averages 25 cents. With ×2, "no better than chance" would still score 50.
With ×4, chance scores **0**, and the scale spends its range where real playing lives:
a well-tuned player at 5¢ scores 80, and 12.5¢ (clearly audible) scores 50.

## 7. Skill level and feedback (rule-based)

`app/services/skill_prediction_service.py`. Phase 6 replaces the level rule with a
trained model.

**Level from `overall_score`:** Beginner < 50 ≤ Intermediate < 70 ≤ Advanced < 85 ≤ Expert.
`null` when there is no score.

**Strengths and weaknesses.** Each message quotes the measured number. A metric that is
`null` produces no statement.

| Metric | Strength if | Weakness if | Drill suggested for the weakness |
|---|---|---|---|
| `mean_abs_cents` | ≤ 10 | > 20 | Long tones against a drone or tuner |
| `mean_signed_cents` | — | \|x\| > 10 ("tends sharp/flat") | Check tuning, centre held notes |
| `pitch_stability_cents` | ≤ 5 | > 15 | Hold notes 4 beats watching a tuner |
| each note's `mean_cents` | — | \|x\| > 25 ("Out-of-tune notes: E4 at 1.0 s (+42¢ sharp)", worst 3 listed) | Loop the bars around those notes against a drone |
| `mean_abs_timing_error_ms` | ≤ 15 | > 30 | Metronome at 90% of the measured tempo |
| `tempo_drift_bpm` | — | \|x\| > 3 ("rushes" / "drags") | Metronome on for the whole piece |
| `tempo_stability_cv` | ≤ 0.02 | > 0.05 | Tap along, then play with every second click |

## 8. Validation on generated audio

`tests/test_metrics.py` builds every test signal in code. Measured values:

| Signal | Expected | Measured |
|---|---|---|
| 440 Hz sine | ≈ 0 cents | 1.45 cents (YIN bias), intonation score 94.2 |
| 440 Hz + 30 cents | +30 ± 5 | +31.4 cents, intonation score 0 |
| C-major scale, 8 sine notes × 0.4 s | C4 D4 E4 F4 G4 A4 B4 C5 | all 8 correct, note wobble ±0.5 cents |
| Clicks at 120 BPM | 120 ± 3 BPM, error < 10 ms | 119.99 BPM, 1.45 ms, rhythm score 97.1 |
| Same clicks, ±40 ms uniform jitter (seed 0) | ≈ 20 ms error, tempo still 120 | 23.8 ms, 119.95 BPM, rhythm score 52.4 |
| Silence, white noise, empty array | pitch `null` with a reason, no crash | ✓ |
| Live demo (`scripts/demo_seed.py`): 12-note melody, E4 +40¢, through Spring | E4 ≈ +40¢, others ≈ 0, 120 BPM | E4 +41.5¢, others +1.2 to +2.1¢, 120.1 BPM, 5.4 ms, intonation 80.4, rhythm 89.3 |
