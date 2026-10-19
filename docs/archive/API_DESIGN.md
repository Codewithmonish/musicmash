# Music Mash - REST API Design

## Base URL
Development: http://localhost:8080/api
Production: https://api.musicmash.com/api

Authentication: Bearer <token>

## Auth Service (8081)
POST /auth/register - Register user
POST /auth/login - Login
POST /auth/refresh - Refresh token
POST /auth/logout - Logout
POST /auth/forgot-password - Request reset
POST /auth/reset-password - Reset password

## User Service (8082)
GET /users/profile - Get profile
PUT /users/profile - Update profile
POST /users/profile/avatar - Upload avatar
POST /users/instruments - Add instrument
PUT /users/instruments/{id} - Update instrument
DELETE /users/instruments/{id} - Delete instrument
GET /users/skill-history - Get skill history

## Performance Service (8083)
POST /performances - Upload performance
GET /performances/{id} - Get performance
GET /performances/user/{userId} - Get user performances
PUT /performances/{id} - Update performance
DELETE /performances/{id} - Delete performance
GET /performances/upload-url - Get presigned URL

## Evaluation Service (8084)
POST /evaluations - Submit evaluation (Judge)
GET /evaluations/performance/{id} - Get performance evaluations
GET /evaluations/user/{userId} - Get user evaluations
PUT /evaluations/{id} - Update evaluation (Judge)
GET /evaluations/pending - Get pending evaluations (Judge)

## Competition Service (8085)
POST /competitions - Create competition (Host)
GET /competitions - Get competitions
GET /competitions/{id} - Get competition details
PUT /competitions/{id} - Update competition (Host)
DELETE /competitions/{id} - Delete competition (Host)
POST /competitions/{id}/join - Join competition
POST /competitions/{id}/submit - Submit performance
GET /competitions/{id}/participants - Get participants
POST /competitions/{id}/challenges - Create challenge (Host)
GET /competitions/{id}/challenges - Get challenges

## Notification Service (8086)
GET /notifications - Get notifications
PUT /notifications/{id}/read - Mark as read
PUT /notifications/read-all - Mark all as read
DELETE /notifications/{id} - Delete notification

## Leaderboard
GET /leaderboard/global - Global leaderboard
GET /leaderboard/competition/{id} - Competition leaderboard
GET /leaderboard/user/{userId} - User ranking

## WebSocket
WS /ws/notifications - Real-time notifications
WS /ws/competitions/{id} - Competition updates
