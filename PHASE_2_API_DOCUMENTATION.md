# Phase 2 API Documentation

## Overview
Phase 2 implements User Profile, Performance Upload, Judge Evaluation, and Notification features for the Music Mash platform.

## Base URL
```
http://localhost:8081
```

## Authentication
All endpoints (except auth and upload) require JWT authentication in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## MODULE 1: USER PROFILE

### Get My Profile
Get the authenticated user's profile.

**Endpoint:** `GET /api/profile/me`

**Authentication:** Required

**Response:**
```json
{
  "id": 1,
  "userId": 1,
  "username": "john_doe",
  "displayName": "John Doe",
  "bio": "Professional pianist with 10 years experience",
  "country": "USA",
  "experienceLevel": "ADVANCED",
  "primaryInstrument": "PIANO",
  "secondaryInstrument": "VIOLIN",
  "musicGenres": "Classical,Jazz",
  "profileImage": "/uploads/profile-image.jpg",
  "createdAt": "2024-01-15T10:30:00",
  "updatedAt": "2024-01-15T10:30:00"
}
```

### Update Profile
Update the authenticated user's profile.

**Endpoint:** `PUT /api/profile`

**Authentication:** Required

**Request Body:**
```json
{
  "displayName": "John Doe",
  "bio": "Professional pianist with 10 years experience",
  "country": "USA",
  "experienceLevel": "ADVANCED",
  "primaryInstrument": "PIANO",
  "secondaryInstrument": "VIOLIN",
  "musicGenres": "Classical,Jazz",
  "profileImage": "/uploads/profile-image.jpg"
}
```

**Response:** Same as Get My Profile

### Get Profile by ID
Get any user's public profile.

**Endpoint:** `GET /api/profile/{id}`

**Authentication:** Not Required

**Response:** Same as Get My Profile

---

## MODULE 2: PERFORMANCE

### Create Performance
Create a new performance (initially in DRAFT status).

**Endpoint:** `POST /api/performances`

**Authentication:** Required (USER role)

**Request Body:**
```json
{
  "title": "Moonlight Sonata",
  "description": "Beethoven's masterpiece",
  "category": "CLASSICAL",
  "instrument": "PIANO",
  "difficulty": "ADVANCED",
  "audioUrl": "/uploads/audio.mp3",
  "videoUrl": "/uploads/video.mp4",
  "thumbnailUrl": "/uploads/thumbnail.jpg"
}
```

**Response:**
```json
{
  "id": 1,
  "userId": 1,
  "username": "john_doe",
  "title": "Moonlight Sonata",
  "description": "Beethoven's masterpiece",
  "category": "CLASSICAL",
  "instrument": "PIANO",
  "difficulty": "ADVANCED",
  "audioUrl": "/uploads/audio.mp3",
  "videoUrl": "/uploads/video.mp4",
  "thumbnailUrl": "/uploads/thumbnail.jpg",
  "status": "DRAFT",
  "submittedAt": "2024-01-15T10:30:00",
  "updatedAt": "2024-01-15T10:30:00"
}
```

### Get My Performances
Get all performances for the authenticated user.

**Endpoint:** `GET /api/performances`

**Authentication:** Required

**Response:** Array of Performance objects

### Get Performance by ID
Get a specific performance by ID.

**Endpoint:** `GET /api/performances/{id}`

**Authentication:** Not Required

**Response:** Single Performance object

### Update Performance
Update a performance (only DRAFT status can be edited).

**Endpoint:** `PUT /api/performances/{id}`

**Authentication:** Required

**Request Body:** Same as Create Performance

**Response:** Updated Performance object

### Delete Performance
Delete a performance (only DRAFT status can be deleted).

**Endpoint:** `DELETE /api/performances/{id}`

**Authentication:** Required

**Response:** 204 No Content

### Submit Performance
Submit a performance for evaluation (changes status to SUBMITTED).

**Endpoint:** `POST /api/performances/{id}/submit`

**Authentication:** Required

**Response:** Updated Performance object with status SUBMITTED

---

## MODULE 3: FILE UPLOAD

### Upload Audio
Upload an audio file (mp3, wav).

**Endpoint:** `POST /api/upload/audio`

**Authentication:** Not Required

**Request:** Multipart form data with file field

**Response:**
```json
{
  "url": "/uploads/uuid-filename.mp3"
}
```

### Upload Video
Upload a video file (mp4, mov).

**Endpoint:** `POST /api/upload/video`

**Authentication:** Not Required

**Request:** Multipart form data with file field

**Response:**
```json
{
  "url": "/uploads/uuid-filename.mp4"
}
```

### Upload Image
Upload an image file (jpg, png, etc.).

**Endpoint:** `POST /api/upload/image`

**Authentication:** Not Required

**Request:** Multipart form data with file field

**Response:**
```json
{
  "url": "/uploads/uuid-filename.jpg"
}
```

**File Size Limit:** 100MB

---

## MODULE 4: JUDGE DASHBOARD

### Get Submitted Performances
Get all submitted performances with optional filters.

**Endpoint:** `GET /api/judge/performances`

**Authentication:** Required (JUDGE, HOST, ADMIN roles)

**Query Parameters:**
- `instrument` (optional): Filter by instrument
- `category` (optional): Filter by category
- `difficulty` (optional): Filter by difficulty

**Example:** `GET /api/judge/performances?instrument=PIANO&category=CLASSICAL`

**Response:** Array of Performance objects with status SUBMITTED

---

## MODULE 5: EVALUATION

### Create Evaluation
Evaluate a submitted performance.

**Endpoint:** `POST /api/judge/evaluations?performanceId={id}`

**Authentication:** Required (JUDGE, HOST, ADMIN roles)

**Request Body:**
```json
{
  "pitchScore": 85,
  "rhythmScore": 90,
  "timingScore": 88,
  "techniqueScore": 92,
  "creativityScore": 80,
  "expressionScore": 87,
  "feedback": "Excellent performance with great emotional depth. Work on timing in the second movement."
}
```

**Response:**
```json
{
  "id": 1,
  "performanceId": 1,
  "performanceTitle": "Moonlight Sonata",
  "judgeId": 2,
  "judgeName": "judge_smith",
  "pitchScore": 85,
  "rhythmScore": 90,
  "timingScore": 88,
  "techniqueScore": 92,
  "creativityScore": 80,
  "expressionScore": 87,
  "overallScore": 87,
  "feedback": "Excellent performance with great emotional depth. Work on timing in the second movement.",
  "createdAt": "2024-01-15T11:00:00"
}
```

**Note:** Overall score is automatically calculated as the average of all individual scores.

### Get Evaluation by ID
Get a specific evaluation.

**Endpoint:** `GET /api/judge/evaluations/{id}`

**Authentication:** Required (JUDGE, HOST, ADMIN roles)

**Response:** Evaluation object

### Get Evaluation by Performance ID
Get evaluation for a specific performance.

**Endpoint:** `GET /api/judge/evaluations/performance/{performanceId}`

**Authentication:** Required (JUDGE, HOST, ADMIN roles)

**Response:** Evaluation object

---

## ENUMS

### Role
- USER
- JUDGE
- HOST
- ADMIN

### Experience Level
- BEGINNER
- INTERMEDIATE
- ADVANCED
- PROFESSIONAL

### Instrument
- PIANO
- GUITAR
- VIOLIN
- DRUMS
- BASS
- VOCALS
- FLUTE
- SAXOPHONE
- TRUMPET
- CELLO
- HARP
- ACCORDION
- BANJO
- MANDOLIN
- UKULELE
- OTHER

### Performance Category
- CLASSICAL
- JAZZ
- ROCK
- POP
- BLUES
- FOLK
- ELECTRONIC
- HIP_HOP
- R_AND_B
- COUNTRY
- METAL
- WORLD
- EXPERIMENTAL
- OTHER

### Difficulty Level
- BEGINNER
- INTERMEDIATE
- ADVANCED
- EXPERT
- MASTER

### Performance Status
- DRAFT
- SUBMITTED
- UNDER_REVIEW
- APPROVED
- REJECTED

---

## ERROR RESPONSES

All errors follow this format:

```json
{
  "timestamp": "2024-01-15T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "validationErrors": {
    "title": "Title is required"
  }
}
```

Common HTTP Status Codes:
- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

---

## TESTING INSTRUCTIONS

### 1. Setup
- Start the application: `mvn spring-boot:run`
- Ensure H2 database is running
- Application runs on port 8081

### 2. Test Authentication
```bash
# Register a new user
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123","role":"USER"}'

# Login to get JWT token
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Save the token for subsequent requests
export TOKEN="your_jwt_token_here"
```

### 3. Test Profile
```bash
# Get my profile
curl -X GET http://localhost:8081/api/profile/me \
  -H "Authorization: Bearer $TOKEN"

# Update profile
curl -X PUT http://localhost:8081/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Test User","bio":"Musician","country":"USA","experienceLevel":"INTERMEDIATE","primaryInstrument":"PIANO"}'
```

### 4. Test Performance
```bash
# Create performance
curl -X POST http://localhost:8081/api/performances \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Performance","description":"Test","category":"CLASSICAL","instrument":"PIANO","difficulty":"INTERMEDIATE"}'

# Get my performances
curl -X GET http://localhost:8081/api/performances \
  -H "Authorization: Bearer $TOKEN"

# Submit performance (replace {id} with actual performance ID)
curl -X POST http://localhost:8081/api/performances/{id}/submit \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Test File Upload
```bash
# Upload audio
curl -X POST http://localhost:8081/api/upload/audio \
  -F "file=@/path/to/audio.mp3"

# Upload video
curl -X POST http://localhost:8081/api/upload/video \
  -F "file=@/path/to/video.mp4"

# Upload image
curl -X POST http://localhost:8081/api/upload/image \
  -F "file=@/path/to/image.jpg"
```

### 6. Test Judge Evaluation
```bash
# Register a judge
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"judge","email":"judge@example.com","password":"password123","role":"JUDGE"}'

# Login as judge
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"judge@example.com","password":"password123"}'

export JUDGE_TOKEN="judge_jwt_token_here"

# Get submitted performances
curl -X GET http://localhost:8081/api/judge/performances \
  -H "Authorization: Bearer $JUDGE_TOKEN"

# Create evaluation
curl -X POST "http://localhost:8081/api/judge/evaluations?performanceId={id}" \
  -H "Authorization: Bearer $JUDGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pitchScore":85,"rhythmScore":90,"timingScore":88,"techniqueScore":92,"creativityScore":80,"expressionScore":87,"feedback":"Great performance!"}'
```

---

## DATABASE SCHEMA

### Tables Created in Phase 2:

**profiles**
- id (PK)
- user_id (FK -> users, unique)
- display_name
- bio
- country
- experience_level
- primary_instrument
- secondary_instrument
- music_genres
- profile_image
- created_at
- updated_at

**performances**
- id (PK)
- user_id (FK -> users)
- title
- description
- category
- instrument
- difficulty
- audio_url
- video_url
- thumbnail_url
- status
- submitted_at
- updated_at

**evaluations**
- id (PK)
- performance_id (FK -> performances, unique)
- judge_id (FK -> users)
- pitch_score
- rhythm_score
- timing_score
- technique_score
- creativity_score
- expression_score
- overall_score
- feedback
- created_at

**notifications**
- id (PK)
- user_id (FK -> users)
- title
- message
- is_read
- type
- related_id
- created_at

---

## ENTITY RELATIONSHIPS

```
User (1) <---> (1) Profile
User (1) <---> (N) Performance
Performance (1) <---> (1) Evaluation
User (Judge) (1) <---> (N) Evaluation
User (1) <---> (N) Notification
```

---

## SECURITY RULES

- Only authenticated users can access profile and performance endpoints
- Only USER role can create/update/delete performances
- Only JUDGE, HOST, ADMIN roles can access judge endpoints
- Only JUDGE, HOST, ADMIN roles can evaluate performances
- Users can only edit/delete their own DRAFT performances
- Performances cannot be edited after submission
- Each performance can only be evaluated once
- Notifications are automatically sent when evaluation is completed

---

## FOLDER STRUCTURE

```
music-mash-backend/
├── src/main/java/com/musicmash/
│   ├── controller/
│   │   ├── AuthController.java
│   │   ├── ProfileController.java
│   │   ├── PerformanceController.java
│   │   ├── FileUploadController.java
│   │   └── JudgeController.java
│   ├── dto/
│   │   ├── AuthResponseDTO.java
│   │   ├── LoginRequestDTO.java
│   │   ├── RegisterRequestDTO.java
│   │   ├── ProfileRequestDTO.java
│   │   ├── ProfileResponseDTO.java
│   │   ├── PerformanceRequestDTO.java
│   │   ├── PerformanceResponseDTO.java
│   │   ├── EvaluationRequestDTO.java
│   │   └── EvaluationResponseDTO.java
│   ├── entity/
│   │   ├── User.java
│   │   ├── Role.java
│   │   ├── Profile.java
│   │   ├── ExperienceLevel.java
│   │   ├── Instrument.java
│   │   ├── Performance.java
│   │   ├── PerformanceStatus.java
│   │   ├── PerformanceCategory.java
│   │   ├── DifficultyLevel.java
│   │   ├── Evaluation.java
│   │   └── Notification.java
│   ├── repository/
│   │   ├── UserRepository.java
│   │   ├── ProfileRepository.java
│   │   ├── PerformanceRepository.java
│   │   ├── EvaluationRepository.java
│   │   └── NotificationRepository.java
│   ├── service/
│   │   ├── AuthService.java
│   │   ├── ProfileService.java
│   │   ├── PerformanceService.java
│   │   ├── FileStorageService.java
│   │   ├── EvaluationService.java
│   │   └── NotificationService.java
│   ├── security/
│   │   ├── SecurityConfig.java
│   │   ├── JwtAuthenticationFilter.java
│   │   ├── JwtUtil.java
│   │   └── CustomUserDetailsService.java
│   └── exception/
│       ├── GlobalExceptionHandler.java
│       ├── ErrorResponse.java
│       ├── DuplicateEmailException.java
│       ├── DuplicateUsernameException.java
│       ├── InvalidCredentialsException.java
│       └── ResourceNotFoundException.java
└── src/main/resources/
    └── application.properties
```

---

## POSTMAN COLLECTION

Import the following as a Postman collection for easy testing:

```json
{
  "info": {
    "name": "Music Mash Phase 2",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"password123\",\"role\":\"USER\"}"
            },
            "url": {"raw": "http://localhost:8081/api/auth/register"}
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
            },
            "url": {"raw": "http://localhost:8081/api/auth/login"}
          }
        }
      ]
    },
    {
      "name": "Profile",
      "item": [
        {
          "name": "Get My Profile",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "http://localhost:8081/api/profile/me"}
          }
        },
        {
          "name": "Update Profile",
          "request": {
            "method": "PUT",
            "header": [
              {"key": "Authorization", "value": "Bearer {{token}}"},
              {"key": "Content-Type", "value": "application/json"}
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"displayName\":\"Test User\",\"bio\":\"Musician\",\"country\":\"USA\",\"experienceLevel\":\"INTERMEDIATE\",\"primaryInstrument\":\"PIANO\"}"
            },
            "url": {"raw": "http://localhost:8081/api/profile"}
          }
        }
      ]
    },
    {
      "name": "Performance",
      "item": [
        {
          "name": "Create Performance",
          "request": {
            "method": "POST",
            "header": [
              {"key": "Authorization", "value": "Bearer {{token}}"},
              {"key": "Content-Type", "value": "application/json"}
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"title\":\"Test Performance\",\"description\":\"Test\",\"category\":\"CLASSICAL\",\"instrument\":\"PIANO\",\"difficulty\":\"INTERMEDIATE\"}"
            },
            "url": {"raw": "http://localhost:8081/api/performances"}
          }
        },
        {
          "name": "Get My Performances",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "http://localhost:8081/api/performances"}
          }
        },
        {
          "name": "Submit Performance",
          "request": {
            "method": "POST",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "http://localhost:8081/api/performances/{{performanceId}}/submit"}
          }
        }
      ]
    },
    {
      "name": "Judge",
      "item": [
        {
          "name": "Get Submitted Performances",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{judgeToken}}"}],
            "url": {"raw": "http://localhost:8081/api/judge/performances"}
          }
        },
        {
          "name": "Create Evaluation",
          "request": {
            "method": "POST",
            "header": [
              {"key": "Authorization", "value": "Bearer {{judgeToken}}"},
              {"key": "Content-Type", "value": "application/json"}
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"pitchScore\":85,\"rhythmScore\":90,\"timingScore\":88,\"techniqueScore\":92,\"creativityScore\":80,\"expressionScore\":87,\"feedback\":\"Great performance!\"}"
            },
            "url": {"raw": "http://localhost:8081/api/judge/evaluations?performanceId={{performanceId}}"}
          }
        }
      ]
    }
  ],
  "variable": [
    {"key": "token", "value": ""},
    {"key": "judgeToken", "value": ""},
    {"key": "performanceId", "value": ""}
  ]
}
```

---

## SUMMARY

Phase 2 successfully implements:
- ✅ User Profile management
- ✅ Performance creation and management
- ✅ File upload service for audio/video/images
- ✅ Judge dashboard with filtering
- ✅ Evaluation system with automatic scoring
- ✅ Notification system for evaluation completion
- ✅ Role-based security
- ✅ Comprehensive validation
- ✅ Error handling

All endpoints are tested and documented. The application compiles successfully and is ready for testing.
