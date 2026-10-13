# Music Mash AI Service

AI microservice for the Music Mash platform providing audio/video analysis, skill prediction, and recommendations.

## Overview

This is a standalone Python FastAPI service that processes music performances using AI/ML techniques. It communicates with the Spring Boot backend via REST APIs.

## Features

- **Measured audio metrics**: pitch accuracy in cents (pYIN), note segmentation, timing error
  against a steady beat grid, tempo stability and drift, dynamics. Every formula, unit and
  limitation is documented in [docs/METRICS.md](docs/METRICS.md).
- **Transparent scores**: 0-100 scores that are fixed linear mappings of one metric each.
  A metric that can't be measured is `null` with a reason, never a guess.
- **Skill summary**: strengths, weaknesses and drills triggered by documented thresholds; a
  rule-based level (a trained model replaces it in Phase 6)
- **Video**: frame and metadata extraction with OpenCV (no video-based scoring yet)
- **Practice Recommendations**: Generate personalized practice suggestions
- **Background Processing**: Asynchronous analysis using FastAPI BackgroundTasks
- **Model Management**: Infrastructure for loading and versioning ML models

## Tech Stack

- **Python**: 3.12+
- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **SQLAlchemy**: ORM
- **Librosa**: Audio processing
- **OpenCV**: Video processing
- **PyTorch/TensorFlow**: (Future) ML model support
- **Redis**: (Future) Celery task queue
- **Docker**: Containerization

## Project Structure

```
music-mash-ai/
├── app/
│   ├── api/              # API endpoints
│   │   ├── ai_analysis.py
│   │   └── __init__.py
│   ├── core/             # Configuration
│   │   └── config.py
│   ├── database/         # Database setup
│   │   └── database.py
│   ├── models/           # SQLAlchemy models
│   │   ├── ai_analysis.py
│   │   ├── audio_features.py
│   │   ├── skill_prediction.py
│   │   ├── practice_recommendation.py
│   │   ├── model_version.py
│   │   └── __init__.py
│   ├── schemas/          # Pydantic schemas
│   │   ├── analysis.py
│   │   ├── recommendation.py
│   │   └── __init__.py
│   ├── services/         # Business logic
│   │   ├── audio_analysis_service.py
│   │   ├── video_analysis_service.py
│   │   ├── recommendation_service.py
│   │   ├── skill_prediction_service.py
│   │   ├── model_manager.py
│   │   ├── audio/
│   │   │   ├── audio_preprocessing.py   # load mono 22.05 kHz, trim edge silence
│   │   │   └── metrics.py               # pure measurement functions (array in, numbers out)
│   │   ├── vision/
│   │   │   └── video_preprocessing.py
│   │   └── __init__.py
│   └── utils/            # Utilities
│       ├── logging.py
│       └── exceptions.py
├── docs/
│   └── METRICS.md        # How every metric and score is computed
├── tests/                # pytest; all test audio is generated in code
├── logs/                 # Log files
├── models/               # ML model files
├── uploads/              # Uploaded files
├── main.py               # Application entry point
├── requirements.txt      # Python dependencies
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker compose configuration
├── .env.example         # Environment variables template
└── README.md            # This file
```

## Installation

### Prerequisites

- Python 3.12 or higher
- pip
- (Optional) Docker

### Local Installation

1. Clone the repository:
```bash
cd music-mash-ai
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create environment file:
```bash
cp .env.example .env
```

5. Run the application:
```bash
python main.py
```

The service will start on `http://localhost:8000`

### Docker Installation

1. Build and run with Docker Compose:
```bash
docker-compose up -d
```

The service will start on `http://localhost:8000`

## API Documentation

Once the service is running, access the automatic Swagger documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Endpoints

### POST /api/ai/analyze
Submit a performance for AI analysis.

**Request Body:**
```json
{
  "performance_id": 1,
  "user_id": 1,
  "audio_url": "http://example.com/audio.mp3",
  "video_url": "http://example.com/video.mp4",
  "instrument": "PIANO",
  "category": "CLASSICAL"
}
```

**Response:**
```json
{
  "id": 1,
  "performance_id": 1,
  "user_id": 1,
  "status": "PENDING",
  "message": "Analysis queued for processing",
  "created_at": "2024-01-15T10:30:00"
}
```

### GET /api/ai/status/{analysis_id}
Get the status of an analysis.

**Response:**
```json
{
  "id": 1,
  "performance_id": 1,
  "status": "PROCESSING",
  "processing_started_at": "2024-01-15T10:30:05",
  "processing_completed_at": null,
  "error_message": null
}
```

### GET /api/ai/result/{analysis_id}
Get the complete result of an analysis (abridged below; see `/docs` for every field and
[docs/METRICS.md](docs/METRICS.md) for the formulas).

**Response:**
```json
{
  "analysis": { "id": 1, "performance_id": 1, "status": "COMPLETED", "error_message": null },
  "audio_features": {
    "duration_s": 12.4,
    "voiced_ratio": 0.81,
    "mean_abs_cents": 11.6,
    "mean_signed_cents": 4.2,
    "pitch_stability_cents": 6.3,
    "notes": [{ "start": 0.42, "end": 0.91, "midi": 69, "note_name": "A4", "mean_cents": 3.1, "cents_std": 2.0 }],
    "tempo_bpm": null,
    "mean_abs_timing_error_ms": null,
    "pitch_score": 76.8,
    "rhythm_score": null,
    "overall_score": 76.8,
    "unavailable_reasons": {
      "tempo_bpm": "Only 5 note onsets were detected (at least 8 are needed).",
      "rhythm_score": "Only 5 note onsets were detected (at least 8 are needed)."
    }
  },
  "skill_prediction": {
    "predicted_level": "ADVANCED",
    "level_basis": "Rule-based: overall score 77/100 → ADVANCED (...)",
    "strengths": [],
    "weaknesses": [],
    "improvement_areas": []
  }
}
```

If the audio can't be loaded or analysed, the analysis status becomes `FAILED` with the
reason in `error_message`.

## Database Schema

### Tables

- **ai_analyses**: Main analysis records
- **audio_features**: Measured metrics, segmented notes and reasons for any null metric
- **skill_predictions**: Scores, rule-based level and threshold-based feedback
- **practice_recommendations**: Generated recommendations
- **model_versions**: Model version tracking

## Configuration

Environment variables can be set in `.env` file:

```env
APP_NAME=Music Mash AI Service
APP_VERSION=1.0.0
DEBUG=True
HOST=0.0.0.0
PORT=8000
DATABASE_URL=sqlite:///./music_mash_ai.db
REDIS_URL=redis://localhost:6379/0
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600
LOG_LEVEL=INFO
```

## Logging

Logs are stored in the `logs/` directory:
- `app.log`: General application logs
- `error.log`: Error logs

## Testing

Run unit tests:
```bash
python -m pytest tests/
```

Test audio (sines, scales, click tracks, noise) is generated in code, never downloaded.
The first librosa call in a fresh process takes ~40 s while numba compiles; the full suite
takes about 2-3 minutes.

## Development

### Adding New Features

1. Create service in `app/services/`
2. Add models in `app/models/`
3. Create schemas in `app/schemas/`
4. Add endpoints in `app/api/`
5. Update documentation

### Model Management

The `ModelManager` class handles loading and versioning of ML models:

```python
from app.services.model_manager import ModelManager

manager = ModelManager()
model = manager.load_model("model_name", "version")
```

## Future Enhancements

- [ ] Implement actual ML models for skill prediction
- [ ] Integrate Celery for distributed task processing
- [ ] Add real-time streaming analysis
- [ ] Implement model training pipeline
- [ ] Add performance monitoring dashboard
- [ ] Support for more audio/video formats

## Troubleshooting

### Port Already in Use
Change the port in `.env` or `docker-compose.yml`

### Database Errors
Delete `music_mash_ai.db` and restart the service to reinitialize. Do this after pulling
schema changes too (e.g. Phase 1 replaced the `audio_features` / `skill_predictions` columns):
tables are created with `create_all`, which never alters an existing table.

### Import Errors
Ensure all dependencies are installed: `pip install -r requirements.txt`

## License

Proprietary - Music Mash Platform

## Support

For issues and questions, contact the development team.
