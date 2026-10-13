# Music Mash AI Service

AI microservice for the Music Mash platform providing audio/video analysis, skill prediction, and recommendations.

## Overview

This is a standalone Python FastAPI service that processes music performances using AI/ML techniques. It communicates with the Spring Boot backend via REST APIs.

## Features

- **Audio Analysis**: Extract features from audio files using librosa
- **Video Analysis**: Process video frames using OpenCV
- **Skill Prediction**: Predict user skill levels based on performance
- **Authenticity Detection**: Detect potential cheating or pre-recorded performances
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
- **MediaPipe**: (Future) Pose/hand detection
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
│   │   ├── authenticity_result.py
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
│   │   ├── cheating_detection_service.py
│   │   ├── skill_prediction_service.py
│   │   ├── model_manager.py
│   │   ├── audio/
│   │   │   └── audio_preprocessing.py
│   │   ├── vision/
│   │   │   └── video_preprocessing.py
│   │   └── __init__.py
│   └── utils/            # Utilities
│       ├── logging.py
│       └── exceptions.py
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
Get the complete result of an analysis.

**Response:**
```json
{
  "analysis": {
    "id": 1,
    "performance_id": 1,
    "status": "COMPLETED",
    "processing_started_at": "2024-01-15T10:30:05",
    "processing_completed_at": "2024-01-15T10:30:30",
    "error_message": null
  },
  "audio_features": {
    "id": 1,
    "analysis_id": 1,
    "duration": 120.5,
    "tempo": 120.0,
    "key": "C",
    "scale": "major"
  },
  "authenticity_result": {
    "id": 1,
    "analysis_id": 1,
    "authenticity_score": 0.85,
    "confidence": 0.9,
    "is_live_performance": 1
  },
  "skill_prediction": {
    "id": 1,
    "analysis_id": 1,
    "predicted_level": "INTERMEDIATE",
    "confidence": 0.75,
    "pitch_accuracy": 0.7,
    "rhythm_accuracy": 0.75
  }
}
```

## Database Schema

### Tables

- **ai_analyses**: Main analysis records
- **audio_features**: Extracted audio features
- **authenticity_results**: Authenticity analysis results
- **skill_predictions**: Skill level predictions
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
pytest tests/
```

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
- [ ] Add MediaPipe for pose/hand detection
- [ ] Integrate Celery for distributed task processing
- [ ] Add real-time streaming analysis
- [ ] Implement model training pipeline
- [ ] Add performance monitoring dashboard
- [ ] Support for more audio/video formats

## Troubleshooting

### Port Already in Use
Change the port in `.env` or `docker-compose.yml`

### Database Errors
Delete `music_mash_ai.db` and restart the service to reinitialize

### Import Errors
Ensure all dependencies are installed: `pip install -r requirements.txt`

## License

Proprietary - Music Mash Platform

## Support

For issues and questions, contact the development team.
