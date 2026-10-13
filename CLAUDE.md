# MusicMash — Project Guide for Claude Code

## What this project is
A music-practice and performance platform. Musicians record or upload performances, judges score them,
users join competitions, and an AI service measures pitch and rhythm and coaches the user.

**Current goal:** rebuild the AI layer so that every number it shows is genuinely measured ("Tier 1").
The old AI scores were made-up formulas. The new ones must be real, explainable and tested.

## Architecture (keep it for now)
```
music-mash-frontend/   React 18 + Vite + Tailwind (JSX)        → talks only to the Spring backend
music-mash-backend/    Spring Boot (Java), MySQL, JWT, port 8081 → proxies /api/ai/** to the AI service
music-mash-ai/         FastAPI (Python), SQLite, port 8000      → audio analysis, ML, AI coach
```
- Put all Tier 1 AI work in `music-mash-ai/`.
- Only touch Java to add or extend proxy endpoints in `AIController` / `AIIntegrationService` and DTOs.
- Developer machine is **Windows** (VS Code). Shell commands must work in Git Bash or PowerShell.

## Owner's tech stack — rules for libraries
The owner knows: Python, JS/TS, React, Tailwind, Vite, FastAPI, Flask, Django, MongoDB, PostgreSQL/Supabase,
scikit-learn, LangChain, LangGraph, Transformers, Pandas, Redis, Celery, Git.

**Pre-approved for Tier 1** (OK to use without asking):
- librosa, numpy, scipy, soundfile, scikit-learn, joblib, pandas, matplotlib (training reports only)
- LangChain, `langchain-community`, plus one LLM provider package (see `.env.example` → `LLM_PROVIDER`)
- `chromadb` (local vector store for the AI coach). This is NEW to the owner, so explain it briefly in the README.
- `sentence-transformers` for local embeddings
- recharts (already in the frontend)

**Any other new library or framework:** stop and ask the owner first, and explain WHY it's needed.

## The honesty rule (most important)
- Never show a random, hardcoded or placeholder number as if it were measured.
  Ban `Math.random()` for scores, `score = 0.8  # placeholder`, and similar.
- If a metric can't be computed (e.g. no pitched notes found), return `null` with a `reason`,
  and have the UI show "Not available" with that reason.
- Every metric must have a docstring explaining exactly how it's computed and what its unit is.
- If a feature isn't implemented, remove it from the UI. Don't fake it.

## Coding standards
- Python: type hints, small pure functions, docstrings, `pathlib`. Keep signal-processing math in
  `app/services/audio/` as pure functions (array in, numbers out) so it's easy to test.
- Pydantic schemas for every API request/response.
- React: functional components and hooks. Reuse the existing `ui/` components and visual style.
- Clean, readable, interview-friendly code. No over-engineering.

## Testing
- Use `pytest` in `music-mash-ai/tests/`.
- **Test audio is generated in code, not downloaded.** Example: a 440 Hz sine wave detuned by +30 cents
  must produce a measured deviation of about +30 cents. Clicks at 120 BPM with ±20 ms jitter must
  produce the expected timing error.
- Run the full test suite before every commit. Never commit with failing tests.
- Frontend: `npm run build` must pass before committing frontend changes.

## Git workflow (automatic)
- Work on branch `rebuild/tier1-ai`. Create it if it doesn't exist. Never commit directly to `main` (the only exception is the Phase 0 initial import).
- After **each completed task** (tests passing): `git add -A`, commit, then `git push`.
- Commit messages use Conventional Commits, e.g. `feat(ai): add pYIN pitch accuracy in cents`,
  `test(ai): add synthetic sine fixtures`, `fix(frontend): remove random accuracy`.
- Never force-push. Never rewrite history. Never commit secrets, `.env`, uploads, datasets,
  or model files larger than 20 MB. Check `git status` before every commit.
- If a push fails, report it and keep working locally. Don't try workarounds.

## Secrets
- All secrets come from environment variables. Each service has a `.env.example` with placeholder values.
- Spring: `application.properties` uses `${DB_PASSWORD}` / `${JWT_SECRET}` style placeholders.

## Datasets and models
- Datasets go in `music-mash-ai/data/` (gitignored). Each dataset gets a download script in `music-mash-ai/scripts/`.
- Trained models go in `music-mash-ai/models/` (gitignored), with a training script that can rebuild them.
- Every trained model gets a report in `music-mash-ai/reports/<model>.md` (committed): dataset,
  train/test split, metrics (accuracy, macro-F1, confusion matrix), and known limitations.

## Progress log
Update this list at the end of each phase (one line per item).
- [x] Phase 0 — cleanup, secrets, git setup
- [x] Phase 1 — real pitch and rhythm metrics
- [x] Phase 2 — pitch contour visualizer
- [ ] Phase 3 — reference-track comparison (DTW)
- [ ] Phase 4 — RAG AI coach
- [ ] Phase 5 — instrument auto-detection model
- [ ] Phase 6 — skill-level model
- [ ] Phase 7 — integration, cleanup, README
