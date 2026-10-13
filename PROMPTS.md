# MusicMash Tier 1 Rebuild: Setup + Claude Code Prompts

Paste **one prompt at a time** into Claude Code. Let each phase finish (it commits and pushes itself),
check the result, then paste the next prompt. Start a **new conversation** for each phase so the
context stays clean. CLAUDE.md carries the rules between conversations.

---

## Step 0: One-time setup (≈10 minutes, you do this)

1. **Change your MySQL root password** (the old one is in `application.properties`).
   Don't skip this if you use that password anywhere else.
2. Copy these files into the `musicMash/` root folder:
   - `CLAUDE.md`
   - `.gitignore`
   - `.claude/settings.json` (keep the `.claude` folder)
3. Open `musicMash/` in VS Code and install the **Claude Code** extension, then sign in.
4. Create an **empty** GitHub repo called `musicmash`, with no README and no .gitignore.
5. In the VS Code terminal (Git Bash):
   ```bash
   git init
   git branch -M main
   git remote add origin https://github.com/<your-username>/musicmash.git
   ```
   Don't commit yet. Phase 0 removes the secrets first.
6. In the Claude Code panel, click the **mode indicator** and choose **Auto**.
   Claude then works without asking, and a background safety check blocks risky actions.
   If it ever stops to ask about something, read it. That's the safety net working.

---

## Phase 0: Cleanup, secrets, first push

```
Read CLAUDE.md fully first and follow it for this whole session.

Phase 0 — prepare the repo for a clean first push.

1. Security: in music-mash-backend/src/main/resources/application.properties, replace the hardcoded
   DB username/password and jwt.secret with ${DB_USERNAME}, ${DB_PASSWORD}, ${JWT_SECRET} placeholders.
   Create music-mash-backend/.env.example with placeholder values and explain in the README how to set
   them on Windows (PowerShell $env: and IntelliJ/VS Code run configs).
2. Make sure music-mash-frontend/.env is gitignored and create music-mash-frontend/.env.example.
3. Delete junk: music-mash-frontend/NUL (Windows reserved name, so remove it via Git Bash `rm ./NUL`),
   music-mash-frontend/tmp-out.css, music-mash-ai/music_mash_ai.db, music-mash-ai/logs/*.log,
   music-mash-backend/target/, music-mash-frontend/dist/.
4. Remove `celery` and `redis` from music-mash-ai/requirements.txt (unused for now) and unpin
   nothing else. Add `pytest` if it's missing.
5. Run `git status` and confirm that NO secret, .env, .db, target/, dist/ or node_modules is staged.
   Search the staged files for the old password and JWT secret to be certain.
6. Commit on main: "chore: initial import with secrets removed", then push main.
7. Create and push branch rebuild/tier1-ai. All later work happens there.
8. Tick Phase 0 in the CLAUDE.md progress log, commit and push.

Finally, give me a short summary of what changed and the exact env vars I must set to run the backend.
```

---

## Phase 1: Real pitch and rhythm metrics (the foundation)

```
Read CLAUDE.md first and follow it.

Phase 1 — replace the fake skill scores with real, measured audio metrics.

Context: music-mash-ai/app/services/skill_prediction_service.py currently invents scores
(e.g. pitch_accuracy = spectral_centroid / 5000). Spectral centroid measures brightness, not pitch.
That is the core thing we are fixing.

Build music-mash-ai/app/services/audio/metrics.py with pure functions:

1. Pitch tracking: librosa.pyin (fmin/fmax chosen by instrument, with sensible defaults).
   Returns times, f0 (Hz, NaN when unvoiced), voiced_probability.
2. Cents deviation: for each voiced frame, deviation in cents from the nearest equal-tempered semitone
   (A4 = 440 Hz).
   Metrics: mean_abs_cents, median_abs_cents, pct_frames_within_25_cents,
   pitch_stability (std of cents within sustained notes), voiced_ratio.
3. Note segmentation: group consecutive voiced frames with the same nearest MIDI note (min duration
   ~80 ms) into notes: {start, end, midi, note_name, mean_cents}.
4. Rhythm: onsets via librosa.onset.onset_detect (backtrack=True) and tempo/beats via librosa.beat.
   Metrics: tempo_bpm, tempo_stability (CV of inter-onset intervals over a rolling window),
   mean_abs_timing_error_ms (each onset vs the nearest beat-grid subdivision), pct_onsets_within_30ms.
5. Dynamics: RMS in dB, dynamic_range_db (p95 − p5), used only as a descriptive stat.
6. Scores 0–100 that are TRANSPARENT mappings of the metrics above, e.g.
   pitch_score = clip(100 − 2 × mean_abs_cents, 0, 100). Document every formula in its docstring and
   in music-mash-ai/docs/METRICS.md, including what each metric does NOT capture.
   If there's not enough voiced audio (voiced_ratio < 0.2), pitch metrics are null with a reason.

Then:
- Rewrite skill_prediction_service.py to use these metrics. Strengths and weaknesses are generated from
  real thresholds (e.g. "rushes: mean onset 25 ms early"). The skill LEVEL label stays rule-based for now
  (thresholds documented); Phase 6 replaces it with a trained model.
- DELETE cheating_detection_service.py and its DB model, endpoints and frontend references.
  It was a placeholder. Also remove the empty face/hand/pose placeholder functions in
  vision/video_preprocessing.py; keep only frame and metadata extraction.
- Update the AudioFeatures/analysis DB models and the /result response schema to include the new metrics.
- Tests in tests/test_metrics.py using GENERATED audio:
  * 440 Hz sine → mean_abs_cents < 5
  * 440 Hz detuned +30 cents → measured ≈ +30 (±5)
  * C-major scale of sine notes → note segmentation finds 8 notes with correct names
  * click track at 120 BPM → tempo ≈ 120 (±3), timing error < 10 ms
  * click track with ±40 ms random jitter (fixed seed) → timing error clearly higher than the clean case
  * silence / noise → pitch metrics null with a reason, no crash
- Run all tests. Commit in logical steps and push after each one.
- Tick Phase 1 in CLAUDE.md. Summarize the metrics in a table for me.
```

---

## Phase 2: Pitch contour visualizer

```
Read CLAUDE.md first and follow it.

Phase 2 — show the user their pitch curve, like Yousician or SingStar.

Backend (music-mash-ai):
- Add GET /api/ai/result/{id}/pitch-contour returning a DOWNSAMPLED contour (max ~1500 points):
  [{t, midi_float, cents_off, voiced}], plus the note segments from Phase 1
  [{start, end, midi, note_name, mean_cents}]. Compute it during analysis and store it as JSON so the
  endpoint is a fast read.
- Add the proxy endpoint in Spring (AIController + AIIntegrationService), same auth rules as the other
  /api/ai routes.

Frontend (music-mash-frontend, recharts is already installed):
- New component components/ai/PitchContourChart.jsx:
  * x = time (s), y = note (y-axis labels as note names like C4, D4, not raw MIDI numbers)
  * The pitch line is colour-coded: green within ±25 cents, amber 25–50, red >50
  * Note segments drawn as horizontal target bars behind the line
  * Tooltip: time, note name, cents off (e.g. "A4 · +32¢ sharp")
  * Brush/zoom on the time axis for long recordings
- Add it to AIAnalysisPage.jsx with a short legend explaining what cents are (100 cents = 1 semitone).
- Also show the Phase 1 metrics as clean stat cards. Remove any stat on that page that isn't measured.
- `npm run build` must pass. Add a backend test for the contour endpoint (shape and downsampling).
- Commit and push per step. Tick Phase 2 in CLAUDE.md.
```

---

## Phase 3: Reference-track comparison (DTW)

```
Read CLAUDE.md first and follow it.

Phase 3 — "How close am I to the original?" using Dynamic Time Warping.

Backend (music-mash-ai):
1. Reference tracks: a ReferenceTrack table (id, title, artist, instrument, file_path, created_at)
   and an admin/host upload endpoint. Precompute and store the reference's features (chroma_cqt,
   pYIN contour, onsets) on upload.
2. Alignment service app/services/audio/alignment.py:
   - Features: chroma_cqt (+ optional onset strength), normalized
   - librosa.sequence.dtw (cosine metric) → warping path
   - From the path compute:
     * overall_similarity (0–100, documented mapping from the normalized DTW cost)
     * tempo_ratio over time (slope of the path) → "you sped up / slowed down here"
     * per-segment pitch comparison: map the user's f0 onto reference time via the path and compute
       the cents difference per aligned segment (e.g. 4-second windows or detected phrases)
     * a list of problem sections: [{ref_start, ref_end, user_start, user_end, issue, detail}]
       with issue ∈ {"pitch_flat","pitch_sharp","rushing","dragging","missing_notes"}
3. API: POST /api/ai/compare {performance_audio_url, reference_id} runs as a background job like
   /analyze; then status/result endpoints. Add Spring proxy endpoints.
4. Performance guard: limit to ~3 minutes of audio, downsample hop length if needed, and log the timing.

Frontend:
- On upload or in AI Analysis, let the user pick a reference track.
- ComparisonTimeline component: a horizontal bar of the reference duration with problem sections
  highlighted (colour by issue), clickable to show details, plus the similarity score and tempo-drift
  mini chart.

Tests (generated audio):
- the same melody vs itself → similarity ≈ 100
- the same melody time-stretched 1.2× → high similarity, tempo_ratio ≈ 1.2 detected
- the melody with one section detuned +50 cents → that section is flagged as pitch_sharp
- a different melody → clearly lower similarity

Write docs/ALIGNMENT.md explaining DTW in simple words with a diagram (Mermaid is fine), since I'll
be asked about it in interviews. Commit and push per step. Tick Phase 3 in CLAUDE.md.
```

---

## Phase 4: RAG AI coach

```
Read CLAUDE.md first and follow it.

Phase 4 — an LLM coach that gives grounded, personalized practice advice from the MEASURED metrics.

1. Knowledge base: write 25–40 short markdown docs in music-mash-ai/knowledge/ covering practice
   techniques for real problems: intonation (drones, slow scales with tuner), rushing/dragging
   (metronome ladders, subdivision counting), pitch drift on long notes, dynamics, warm-ups, and
   instrument-specific tips for piano, guitar, violin and vocals. Each doc has YAML front-matter:
   {problem_tags, instruments, level}. Write them as original, practical content.
2. Indexing: scripts/build_knowledge_index.py chunks the docs, embeds them with sentence-transformers
   (all-MiniLM-L6-v2), and stores them in a local Chroma DB (music-mash-ai/chroma_db/, gitignored).
   Metadata filtering by instrument and problem tag.
3. Coach service app/services/coach_service.py using LangChain:
   - Input: Phase 1 metrics + Phase 3 problem sections (if any) + user instrument + level
   - Turn the metrics into a short "diagnosis" first (deterministic code, not the LLM),
     e.g. ["intonation: 38¢ mean deviation, mostly sharp", "rushing: onsets 22 ms early"]
   - Retrieve the top-k chunks per diagnosis
   - The LLM generates STRUCTURED output (Pydantic): summary, top_3_issues
     [{issue, evidence (must quote a real metric), exercise, how_long, source_doc}], a 7-day practice plan
   - The prompt must forbid inventing numbers: only metrics passed in may be cited
   - Provider is configurable via .env: LLM_PROVIDER + LLM_API_KEY + LLM_MODEL (add to .env.example).
     Before installing a provider SDK, ask me which provider I'm using.
   - If no API key is set → return the deterministic diagnosis + retrieved exercises without LLM
     text, clearly labelled "basic mode". Never fake LLM output.
4. API: POST /api/ai/coach/{analysis_id} → cache the result in the DB. Add a Spring proxy endpoint.
5. Frontend: "AI Coach" section on AIAnalysisPage with the issues (evidence shown as metric chips),
   exercises with a "source" tag, and the 7-day plan as a checklist.
6. Tests: the diagnosis function (pure, deterministic), retrieval returns intonation docs for an
   intonation problem, the schema validates, and basic mode works without a key. Mock the LLM in tests.
7. docs/AI_COACH.md: architecture diagram (metrics → diagnosis → retrieval → LLM → validated JSON)
   and why grounding prevents hallucinated advice.
Commit and push per step. Tick Phase 4 in CLAUDE.md.
```

---

## Phase 5: Instrument auto-detection model

```
Read CLAUDE.md first and follow it.

Phase 5 — train a real classifier that detects the instrument from audio and auto-fills it on upload.

1. Dataset: IRMAS training set (11 instruments: cello, clarinet, flute, acoustic guitar, electric
   guitar, organ, piano, saxophone, trumpet, violin, voice; ~6.7k 3-second excerpts, ~3 GB).
   Write scripts/download_irmas.py (into data/, gitignored). Print the size and ask me before
   downloading. If the download URL doesn't work, stop and tell me.
2. Features (scripts/extract_features.py): MFCC (mean+std), delta-MFCC, spectral contrast, chroma,
   ZCR, RMS stats → a fixed-length vector, cached to a parquet/npz file.
3. Training (scripts/train_instrument_model.py), scikit-learn:
   - Stratified train/val/test split; IRMAS excerpts come from the same songs, so split by song/file
     group where possible to avoid leakage, and document it
   - Baselines: LogisticRegression, then RandomForest and SVC (RBF) with a small GridSearchCV
   - StandardScaler in a Pipeline; save the best pipeline with joblib to models/instrument_clf.joblib
   - reports/instrument_model.md: accuracy, macro-F1, per-class F1, confusion matrix image,
     comparison table of models, and limitations (e.g. trained on 3-second clips, struggles with mixes)
4. Inference: app/services/instrument_service.py loads the model once (via the existing ModelManager,
   now implemented for real) and predicts on sliding 3-second windows → majority vote + top-3 with
   probabilities. If the model file is missing → return null with reason "model not trained".
5. API: POST /api/ai/detect-instrument plus a Spring proxy. Frontend: after recording or upload,
   pre-select the instrument field and show "Detected: Violin (87%)", which the user can change.
6. Tests: the feature vector has a fixed length, inference works with a tiny dummy model trained in
   the test, and a missing model file is handled gracefully.
Commit and push per step (never the dataset or the model file). Tick Phase 5 in CLAUDE.md.
Give me the final metrics table.
```

---

## Phase 6: Skill-level model

```
Read CLAUDE.md first and follow it.

Phase 6 — replace the rule-based skill label with a trained model, honestly.

The problem: there's no public dataset of performances labelled by skill level. So we build a
controlled dataset by DEGRADING clean performances, and say so clearly in the docs.

1. Clean source audio: use clean monophonic recordings. Prefer reusing the IRMAS solo excerpts or
   synthesized melodies (e.g. sine/karplus-strong renders of simple MIDI-like note lists generated in
   code). Ask me before downloading anything new.
2. Degradation engine scripts/make_skill_dataset.py, with controlled, seeded parameters:
   - pitch error: per-note random detune (σ cents) + slow drift
   - timing error: onset jitter (σ ms) + gradual tempo drift (rushing/dragging)
   - note errors: random dropped or wrong notes
   - Labels: 3 classes (beginner / intermediate / advanced) defined by parameter ranges,
     documented in a table. Also keep the continuous targets (σ cents, σ ms).
3. Features = the Phase 1 metrics (mean_abs_cents, pct_within_25, timing error, tempo stability,
   voiced ratio, etc.). This is the point: the model learns on top of explainable metrics.
4. Train with scikit-learn: classifier (RandomForest / GradientBoosting) + a regressor for an
   overall 0–100 score. Group-aware split by source clip. Save to models/skill_model.joblib.
   reports/skill_model.md: metrics, confusion matrix, feature importances chart, and a
   **Limitations** section explaining the synthetic labels and how we'd retrain on real judge scores.
5. scripts/retrain_from_judge_scores.py: a placeholder-free pipeline that pulls evaluations
   (performance metrics + judge overall score) once enough exist (configurable minimum, e.g. 200),
   and retrains. If there's not enough data, it prints how many more are needed and exits.
6. Wire it into skill_prediction_service.py: model prediction + confidence + the top contributing
   features as the "why". Fall back to the documented rule-based label if the model is missing.
7. Tests: the degradation engine is deterministic with a seed, the model wrapper handles a missing
   file, and the predicted level for a clean vs a heavily degraded sample is ordered correctly.
Commit and push per step. Tick Phase 6 in CLAUDE.md.
```

---

## Phase 7: Integration, cleanup, README

```
Read CLAUDE.md first and follow it.

Phase 7 — make everything consistent, honest and demo-ready.

1. Search the frontend and backend for leftover fakes: Math.random in scores, hardcoded stats,
   placeholder text, references to deleted features (cheating detection, pose/hand). Remove or fix all.
   Practice Arena: the session accuracy must come from the AI service analysing the recorded attempt,
   or the stat is removed. Server-side only: the backend must not accept a client-sent accuracy.
2. Delete unused code: recommendation_service.py (superseded by the coach) and unused imports.
3. End-to-end check: start all three services, upload a generated test WAV through the real API
   flow (login → upload → analyze → result → contour → coach) with a script in scripts/e2e_check.py,
   and fix whatever breaks.
4. Rewrite the root README.md truthfully:
   - one-paragraph pitch, an architecture diagram (Mermaid), a feature list split into
     "Platform" and "AI" (only what really works)
   - an "How the AI works" section linking METRICS.md, ALIGNMENT.md, AI_COACH.md and the model reports
   - setup for Windows (env vars, MySQL, Python venv, npm), and how to train the models
   - a screenshots/GIF placeholder section with TODO notes for me (I'll add them)
   - delete the old overclaiming docs (PHASE_* guides, the microservices API_DESIGN) or move what's
     still accurate into /docs
5. Write docs/INTERVIEW_NOTES.md: 15 likely interview questions about this project (pYIN, cents,
   DTW, RAG grounding, data leakage, synthetic labels, async jobs) with short answers based on the
   actual code.
6. Run all tests and the frontend build. Commit, push, and open a PR from rebuild/tier1-ai to main
   with `gh` if it's installed (otherwise give me the GitHub compare link). Tick Phase 7 in CLAUDE.md.
```

---

## Tips while it runs
- **Check after each phase:** read the summary, run the app once, and look at the commit list on GitHub.
- **If Claude goes off track:** press `Esc` to stop it and tell it what to fix.
- **If a phase is too big for one session:** say "continue Phase N from the progress log".
- Phases 5 and 6 download about 3 GB, so make sure you have the disk space and a good connection.
