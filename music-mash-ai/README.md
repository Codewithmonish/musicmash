# MusicMash AI service

FastAPI service that measures recordings and coaches the player. Only the Spring backend calls
it (it listens on `127.0.0.1:8000`); the browser never talks to it directly. Overview and
screenshots: [main README](../README.md).

## What it does

| Area | Code | Docs |
|---|---|---|
| Pitch (pYIN, cents from the nearest note, note segmentation), timing against a fitted beat grid, tempo and drift, dynamics, 0–100 scores | `app/services/audio/metrics.py` | [docs/METRICS.md](docs/METRICS.md) |
| Reference comparison: chroma + onsets + pitch aligned with DTW, problem sections (sharp, flat, rushing, dragging, missing notes) | `app/services/audio/alignment.py` | [docs/ALIGNMENT.md](docs/ALIGNMENT.md) |
| AI coach: deterministic diagnosis → Chroma retrieval over `knowledge/` → Gemini structured output → grounding check (basic mode without a key) | `app/services/coach/`, `app/services/coach_service.py` | [docs/AI_COACH.md](docs/AI_COACH.md) |
| Rule-based level and feedback from the measured metrics (no trained model yet) | `app/services/skill_prediction_service.py` | METRICS.md §7 |

Signal-processing math is pure functions (array in, numbers out). Every metric is `null` with a
`reason` when it can't be measured; nothing is a placeholder.

## Endpoints

All per-user endpoints need the `X-User-Id` header (Spring sends the logged-in user) and return
404 for another user's data.

| Method | Path | |
|---|---|---|
| POST | `/api/ai/analyze` | Queue an analysis of an uploaded file |
| GET | `/api/ai/status/{id}` · `/api/ai/result/{id}` · `/api/ai/result/{id}/pitch-contour` | Status, measured metrics, pitch curve |
| POST / GET | `/api/ai/references` · `/api/ai/references/{id}` | Shared library of reference recordings |
| POST | `/api/ai/compare` | Compare a take with a reference (DTW) |
| GET | `/api/ai/compare/{id}/status` · `/api/ai/compare/{id}/result` | Comparison status and result |
| POST | `/api/ai/coach/{analysis_id}` | Coaching for an analysis (cached) |
| GET | `/health` | Liveness |

Interactive docs at `http://localhost:8000/docs` while it runs.

## Run it

Normally started by the one-click launcher (`MusicMash.bat`, see [RUN_LOCAL.md](../RUN_LOCAL.md)).
By hand (Windows):

```powershell
cd music-mash-ai
python -m venv .venv
.venv\Scripts\pip install -r requirements-dev.txt
.venv\Scripts\python scripts\build_knowledge_index.py     # coach index (downloads a 90 MB model once)
.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Configuration (`.env`, see `.env.example`): `UPLOAD_DIR` must be the same folder Spring uploads
to. `LLM_PROVIDER`, `LLM_API_KEY` and `LLM_MODEL` are optional; without a key the coach runs in
basic mode. The `Dockerfile` is from the original scaffold and is not maintained or tested.

## Tests

```powershell
.venv\Scripts\python -m pytest                 # fast default suite (CI runs this)
.venv\Scripts\python -m pytest -m slow         # tests that need the real embedding model
```

All test audio is generated in code (sine melodies, click tracks with known jitter, detuned
sections), so every expected value is known exactly.
