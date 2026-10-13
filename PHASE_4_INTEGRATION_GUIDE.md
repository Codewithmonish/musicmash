# Phase 4: AI Foundation Integration Guide

## Overview

This guide covers the integration between the Spring Boot backend and the Python FastAPI AI microservice for the Music Mash platform.

## Architecture

```
┌─────────────────┐         REST API         ┌─────────────────┐
│  Spring Boot    │ ────────────────────────→ │  FastAPI AI     │
│  Backend        │                           │  Service        │
│  (Port 8081)    │ ←──────────────────────── │  (Port 8000)    │
└─────────────────┘                           └─────────────────┘
        │                                              │
        ↓                                              ↓
┌─────────────────┐                           ┌─────────────────┐
│  H2 Database    │                           │  SQLite DB      │
│  (User Data)    │                           │  (AI Data)      │
└─────────────────┘                           └─────────────────┘
```

## Project Structure

### Spring Boot Backend (music-mash-backend)
```
src/main/java/com/musicmash/
├── controller/
│   └── AIController.java          # AI integration endpoints
├── dto/
│   ├── AIAnalysisRequestDTO.java  # Request to AI service
│   └── AIAnalysisResponseDTO.java # Response from AI service
└── service/
    └── AIIntegrationService.java  # Service for AI API calls
```

### FastAPI AI Service (music-mash-ai)
```
music-mash-ai/
├── app/
│   ├── api/
│   │   └── ai_analysis.py         # AI analysis endpoints
│   ├── models/                    # Database models
│   ├── schemas/                   # Pydantic schemas
│   └── services/                  # Business logic
├── main.py                        # Application entry
├── requirements.txt               # Dependencies
├── Dockerfile                     # Container config
└── docker-compose.yml             # Orchestration
```

## Setup Instructions

### 1. Start Spring Boot Backend

```bash
cd music-mash-backend
mvn spring-boot:run
```

The backend will start on `http://localhost:8081`

### 2. Start FastAPI AI Service

#### Option A: Local Python

```bash
cd music-mash-ai

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Start service
python main.py
```

The AI service will start on `http://localhost:8000`

#### Option B: Docker

```bash
cd music-mash-ai
docker-compose up -d
```

### 3. Verify Services

Check Spring Boot:
```bash
curl http://localhost:8081/api/auth/health
```

Check AI Service:
```bash
curl http://localhost:8000/health
```

## API Integration

### Spring Boot Endpoints

#### Submit Performance for AI Analysis

**Endpoint:** `POST /api/ai/analyze`

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "performanceId": 1,
  "audioUrl": "http://localhost:8081/uploads/audio.mp3",
  "videoUrl": "http://localhost:8081/uploads/video.mp4",
  "instrument": "PIANO",
  "category": "CLASSICAL"
}
```

**Response:**
```json
{
  "id": 1,
  "performanceId": 1,
  "userId": 1,
  "status": "PENDING",
  "message": "Analysis queued for processing",
  "createdAt": "2024-01-15T10:30:00"
}
```

#### Get Analysis Status

**Endpoint:** `GET /api/ai/status/{analysisId}`

**Authentication:** Required

**Response:**
```json
{
  "id": 1,
  "performanceId": 1,
  "status": "PROCESSING",
  "processingStartedAt": "2024-01-15T10:30:05",
  "processingCompletedAt": null,
  "errorMessage": null
}
```

#### Get Analysis Result

**Endpoint:** `GET /api/ai/result/{analysisId}`

**Authentication:** Required

**Response:**
```json
{
  "analysis": {
    "id": 1,
    "performanceId": 1,
    "status": "COMPLETED",
    "processingStartedAt": "2024-01-15T10:30:05",
    "processingCompletedAt": "2024-01-15T10:30:30",
    "errorMessage": null
  },
  "audioFeatures": {
    "id": 1,
    "analysisId": 1,
    "duration": 120.5,
    "tempo": 120.0,
    "key": "C",
    "scale": "major"
  },
  "authenticityResult": {
    "id": 1,
    "analysisId": 1,
    "authenticityScore": 0.85,
    "confidence": 0.9,
    "isLivePerformance": 1
  },
  "skillPrediction": {
    "id": 1,
    "analysisId": 1,
    "predictedLevel": "INTERMEDIATE",
    "confidence": 0.75,
    "pitchAccuracy": 0.7,
    "rhythmAccuracy": 0.75
  }
}
```

### FastAPI AI Service Endpoints

The Spring Boot backend proxies requests to these endpoints:

#### POST /api/ai/analyze
Submit performance for analysis (background processing)

#### GET /api/ai/status/{analysisId}
Get current analysis status

#### GET /api/ai/result/{analysisId}
Get complete analysis results

## Configuration

### Spring Boot Configuration

Add to `application.properties`:
```properties
# AI Service Integration
ai.service.url=http://localhost:8000
```

### FastAPI Configuration

Add to `.env`:
```env
# Application Settings
APP_NAME=Music Mash AI Service
APP_VERSION=1.0.0
DEBUG=True

# Server
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=sqlite:///./music_mash_ai.db

# Spring Boot Integration
SPRING_BOOT_URL=http://localhost:8081
```

## Workflow

### Complete Analysis Workflow

1. **User uploads performance**
   - User uploads audio/video via Spring Boot
   - Files stored in `./uploads/`
   - Performance record created in H2 database

2. **Submit for AI analysis**
   - Spring Boot calls AI service via REST API
   - AI service creates analysis record (PENDING status)
   - Background processing queued

3. **AI Processing**
   - Audio preprocessing (librosa)
   - Video preprocessing (OpenCV)
   - Feature extraction
   - Authenticity analysis
   - Skill prediction
   - Results stored in SQLite database

4. **Retrieve results**
   - Spring Boot polls AI service for status
   - When COMPLETED, fetch full results
   - Results displayed to user

## Error Handling

### Spring Boot

```java
try {
    AIAnalysisResponseDTO response = aiIntegrationService.submitForAnalysis(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
} catch (Exception e) {
    throw new RuntimeException("Failed to submit analysis: " + e.getMessage());
}
```

### FastAPI

Custom exceptions defined in `app/utils/exceptions.py`:
- `FileProcessingError`
- `InvalidFileFormatError`
- `AnalysisNotFoundError`
- `ModelLoadError`
- `DatabaseError`

## Docker Deployment

### Using Docker Compose

```bash
# Start both services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  music-mash-backend:
    build: ./music-mash-backend
    ports:
      - "8081:8081"
    depends_on:
      - music-mash-ai

  music-mash-ai:
    build: ./music-mash-ai
    ports:
      - "8000:8000"
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Testing

### Test Spring Boot Integration

```bash
# Get JWT token
TOKEN=$(curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.token')

# Submit analysis
curl -X POST http://localhost:8081/api/ai/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "performanceId": 1,
    "audioUrl": "http://localhost:8081/uploads/audio.mp3",
    "instrument": "PIANO",
    "category": "CLASSICAL"
  }'

# Check status
curl -X GET http://localhost:8081/api/ai/status/1 \
  -H "Authorization: Bearer $TOKEN"

# Get result
curl -X GET http://localhost:8081/api/ai/result/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Test FastAPI Directly

```bash
# Submit analysis
curl -X POST http://localhost:8000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "performanceId": 1,
    "userId": 1,
    "audioUrl": "http://example.com/audio.mp3",
    "instrument": "PIANO",
    "category": "CLASSICAL"
  }'

# Check status
curl http://localhost:8000/api/ai/status/1

# Get result
curl http://localhost:8000/api/ai/result/1
```

### Run Unit Tests

```bash
# Spring Boot tests
cd music-mash-backend
mvn test

# FastAPI tests
cd music-mash-ai
pytest tests/
```

## Monitoring

### Spring Boot Logs

```bash
# View logs
tail -f logs/spring-boot.log
```

### FastAPI Logs

```bash
# View logs
tail -f music-mash-ai/logs/app.log
tail -f music-mash-ai/logs/error.log
```

### Health Checks

```bash
# Spring Boot
curl http://localhost:8081/actuator/health

# FastAPI
curl http://localhost:8000/health
```

## Troubleshooting

### Connection Refused

**Problem:** Spring Boot cannot connect to AI service

**Solution:**
1. Verify AI service is running: `curl http://localhost:8000/health`
2. Check AI service URL in `application.properties`
3. Ensure no firewall blocking port 8000

### Analysis Stuck in PENDING

**Problem:** Analysis never progresses from PENDING status

**Solution:**
1. Check FastAPI logs for errors
2. Verify file URLs are accessible
3. Ensure sufficient disk space for processing
4. Check background task queue

### File Processing Errors

**Problem:** Audio/video files fail to process

**Solution:**
1. Verify file format is supported
2. Check file size (max 100MB)
3. Ensure file URL is accessible from AI service
4. Check required libraries are installed

### Database Errors

**Problem:** Database connection issues

**Solution:**
1. Verify database file permissions
2. Check SQLite file is not locked
3. Ensure sufficient disk space
4. Restart services to reinitialize database

## Security Considerations

### Authentication

- Spring Boot uses JWT authentication
- AI service endpoints require valid JWT token
- User ID is extracted from authenticated user

### File Access

- Files should be served via Spring Boot
- AI service should have access to file URLs
- Consider implementing file access tokens for security

### CORS

- Both services configured for CORS
- Update allowed origins for production
- Consider implementing origin restrictions

### Rate Limiting

- Implement rate limiting on AI endpoints
- Consider user-based quotas
- Monitor for abuse

## Performance Optimization

### Async Processing

- AI analysis runs in background
- FastAPI BackgroundTasks for async operations
- Future: Implement Celery for distributed processing

### Caching

- Cache analysis results
- Cache model predictions
- Consider Redis for distributed caching

### Load Balancing

- Deploy multiple AI service instances
- Use load balancer for distribution
- Implement health checks

## Future Enhancements

### Model Integration

- Load actual ML models for predictions
- Implement model versioning
- Add model training pipeline

### Real-time Analysis

- WebSocket support for real-time updates
- Streaming audio/video analysis
- Live feedback during performance

### Advanced Features

- Multi-instrument detection
- Ensemble performance analysis
- Comparative analysis between performances

## API Documentation

### Spring Boot Swagger

Access at: `http://localhost:8081/swagger-ui.html`

### FastAPI Swagger

Access at: `http://localhost:8000/docs`

## Support

For issues:
1. Check logs in both services
2. Verify configuration files
3. Review this integration guide
4. Contact development team

## Summary

Phase 4 successfully implements:
- ✅ Separate Python FastAPI AI microservice
- ✅ REST API integration with Spring Boot
- ✅ Audio/video preprocessing pipelines
- ✅ Background processing infrastructure
- ✅ Model management system
- ✅ Comprehensive error handling
- ✅ Docker containerization
- ✅ Unit tests for both services
- ✅ Complete API documentation
- ✅ Integration guide and troubleshooting

The AI infrastructure is production-ready and scalable for future ML model integration.
