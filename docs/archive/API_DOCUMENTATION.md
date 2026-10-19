# Music Mash API Documentation

## Base URL
```
http://localhost:8081/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Authentication Endpoints

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "USER" | "JUDGE" | "HOST" | "ADMIN"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

Response:
```json
{
  "token": "jwt_token",
  "userId": 1,
  "username": "string",
  "email": "string",
  "role": "USER"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

## Profile Endpoints

### Get Current Profile
```http
GET /profile/me
Authorization: Bearer <token>
```

### Update Profile
```http
PUT /profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "string",
  "bio": "string",
  "primaryInstrument": "PIANO",
  "experienceLevel": "BEGINNER",
  "genres": ["CLASSICAL", "JAZZ"],
  "goals": ["IMPROVE_TECHNIQUE", "LEARN_NEW_SONGS"]
}
```

## Performance Endpoints

### Get All Performances
```http
GET /performances
Authorization: Bearer <token>
```

### Get Pending Performances (Judge)
```http
GET /performances/pending
Authorization: Bearer <token>
```

### Create Performance
```http
POST /performances
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "category": "CLASSICAL",
  "instrument": "PIANO",
  "difficulty": "INTERMEDIATE",
  "audioUrl": "string",
  "videoUrl": "string",
  "status": "DRAFT" | "PENDING"
}
```

### Evaluate Performance (Judge)
```http
POST /performances/{id}/evaluate
Authorization: Bearer <token>
Content-Type: application/json

{
  "techniqueScore": 85,
  "musicalityScore": 90,
  "performanceScore": 88,
  "overallScore": 87,
  "feedback": "string"
}
```

### Approve Performance (Judge)
```http
POST /performances/{id}/approve
Authorization: Bearer <token>
```

### Reject Performance (Judge)
```http
POST /performances/{id}/reject
Authorization: Bearer <token>
```

## File Upload Endpoints

### Upload Audio
```http
POST /upload/audio
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <audio_file>
```

Response:
```json
{
  "url": "https://storage-url/audio-file.mp3"
}
```

### Upload Video
```http
POST /upload/video
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <video_file>
```

Response:
```json
{
  "url": "https://storage-url/video-file.mp4"
}
```

## Competition Endpoints

### Get All Competitions
```http
GET /competitions
Authorization: Bearer <token>
```

### Register for Competition
```http
POST /competitions/{id}/register
Authorization: Bearer <token>
```

## Leaderboard Endpoints

### Get Leaderboard
```http
GET /leaderboard
Authorization: Bearer <token>
```

Response:
```json
[
  {
    "rank": 1,
    "username": "string",
    "score": 9850,
    "instrument": "PIANO"
  }
]
```

## Practice Endpoints

### Get Exercises
```http
GET /practice/exercises
Authorization: Bearer <token>
```

### Get Practice Stats
```http
GET /practice/stats
Authorization: Bearer <token>
```

Response:
```json
{
  "xp": 5000,
  "level": 5,
  "streak": 7,
  "completed": 25
}
```

### Complete Exercise
```http
POST /practice/exercises/{id}/complete
Authorization: Bearer <token>
```

## Challenge Endpoints

### Get Challenges
```http
GET /challenges
Authorization: Bearer <token>
```

### Claim Challenge Reward
```http
POST /challenges/{id}/claim
Authorization: Bearer <token>
```

### Get Achievements
```http
GET /achievements
Authorization: Bearer <token>
```

## Social Endpoints

### Discover Users
```http
GET /users/discover
Authorization: Bearer <token>
```

### Follow User
```http
POST /users/{id}/follow
Authorization: Bearer <token>
```

### Get Notifications
```http
GET /notifications
Authorization: Bearer <token>
```

### Mark Notification as Read
```http
PUT /notifications/{id}/read
Authorization: Bearer <token>
```

## AI Analysis Endpoints

### Analyze Performance
```http
GET /ai/analyze/{performanceId}
Authorization: Bearer <token>
```

Response:
```json
{
  "overallScore": 85,
  "pitchScore": 88,
  "rhythmScore": 82,
  "tempoScore": 90,
  "audioQuality": 85,
  "authenticityScore": 92,
  "skillLevel": "Advanced",
  "confidence": 0.87,
  "feedback": ["string"],
  "suggestions": ["string"]
}
```

## Error Responses

All endpoints may return error responses:

```json
{
  "error": "Error message",
  "status": 400
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Data Models

### User
```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "role": "USER",
  "enabled": true
}
```

### Profile
```json
{
  "id": 1,
  "displayName": "string",
  "bio": "string",
  "primaryInstrument": "PIANO",
  "experienceLevel": "INTERMEDIATE",
  "genres": ["CLASSICAL"],
  "goals": ["IMPROVE_TECHNIQUE"]
}
```

### Performance
```json
{
  "id": 1,
  "title": "string",
  "description": "string",
  "category": "CLASSICAL",
  "instrument": "PIANO",
  "difficulty": "INTERMEDIATE",
  "audioUrl": "string",
  "videoUrl": "string",
  "status": "PENDING",
  "user": {
    "id": 1,
    "username": "string"
  }
}
```

### Competition
```json
{
  "id": 1,
  "title": "string",
  "prize": 5000,
  "deadline": "2024-12-31",
  "category": "CLASSICAL",
  "instrument": "PIANO",
  "participantCount": 100
}
```

### Challenge
```json
{
  "id": 1,
  "title": "string",
  "description": "string",
  "target": 10,
  "progress": 5,
  "xpReward": 100,
  "completed": false,
  "claimed": false
}
```

### Achievement
```json
{
  "id": 1,
  "title": "string",
  "description": "string",
  "icon": "🏆",
  "rarity": "RARE",
  "unlocked": true,
  "unlockedAt": "2024-01-15"
}
```

### Notification
```json
{
  "id": 1,
  "type": "FOLLOW",
  "title": "string",
  "message": "string",
  "read": false,
  "createdAt": "2024-01-15T10:30:00"
}
```
