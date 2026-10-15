# Service contracts

JSON examples of the exact messages Spring and the AI service exchange. Both test suites
read these files, so if either side changes its format, a test fails on that side:

| File | Sent by | Checked by |
|---|---|---|
| `ai-analyze-request.json` | Spring → `POST /api/ai/analyze` on the AI service | `AIServiceContractTest` (Spring serialises to exactly this) and `tests/test_contract.py` (FastAPI accepts it) |
| `ai-analyze-response.json` | AI service → Spring | `tests/test_contract.py` (FastAPI returns these keys) and `AIServiceContractTest` (Spring reads every field) |
| `ai-compare-request.json` | Spring → `POST /api/ai/compare` | `AIServiceContractTest` and `tests/test_contract.py` |
| `ai-compare-response.json` | AI service → Spring → frontend (passed through) | `tests/test_contract.py` |

Rules: the AI service API is snake_case. `audio_file` / `video_file` are plain file names
inside the shared upload directory, never URLs or paths (`music-mash-ai/app/core/uploads.py`).
