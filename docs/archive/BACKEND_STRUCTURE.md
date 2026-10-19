# Music Mash - Backend Folder Structure

## Root Directory

```
musicMash/
├── backend/
│   ├── docker-compose.yml
│   ├── pom.xml
│   ├── .env
│   └── README.md
│
├── auth-service/ (Port 8081)
│   ├── src/main/java/com/musicmash/auth/
│   │   ├── AuthApplication.java
│   │   ├── config/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── model/
│   │   ├── exception/
│   │   └── resources/
│   ├── Dockerfile
│   └── pom.xml
│
├── user-service/ (Port 8082)
│   ├── src/main/java/com/musicmash/user/
│   │   ├── UserApplication.java
│   │   ├── config/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── model/
│   │   └── resources/
│   ├── Dockerfile
│   └── pom.xml
│
├── performance-service/ (Port 8083)
│   ├── src/main/java/com/musicmash/performance/
│   │   ├── PerformanceApplication.java
│   │   ├── config/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── model/
│   │   ├── rabbitmq/
│   │   └── resources/
│   ├── Dockerfile
│   └── pom.xml
│
├── evaluation-service/ (Port 8084)
│   ├── src/main/java/com/musicmash/evaluation/
│   │   ├── EvaluationApplication.java
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── model/
│   │   └── resources/
│   ├── Dockerfile
│   └── pom.xml
│
├── competition-service/ (Port 8085)
│   ├── src/main/java/com/musicmash/competition/
│   │   ├── CompetitionApplication.java
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── model/
│   │   └── resources/
│   ├── Dockerfile
│   └── pom.xml
│
├── notification-service/ (Port 8086)
│   ├── src/main/java/com/musicmash/notification/
│   │   ├── NotificationApplication.java
│   │   ├── config/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── model/
│   │   ├── websocket/
│   │   └── resources/
│   ├── Dockerfile
│   └── pom.xml
│
└── ai-service/ (Port 8000)
    ├── src/
    │   ├── main/
    │   │   ├── python/
    │   │   │   ├── app/
    │   │   │   │   ├── main.py
    │   │   │   │   ├── config/
    │   │   │   │   ├── api/
    │   │   │   │   ├── services/
    │   │   │   │   ├── models/
    │   │   │   │   └── utils/
    │   │   │   └── requirements.txt
    │   │   └── test/
    ├── Dockerfile
    └── README.md
```

## Common Package Structure (Per Service)

### config/
- SecurityConfig.java
- DatabaseConfig.java
- RabbitMQConfig.java
- Service-specific configs

### controller/
- REST API controllers
- Request validation
- Response formatting

### service/
- Business logic
- Service interfaces and implementations
- External service integration

### repository/
- JPA repositories
- Custom query methods

### model/
- Entity classes
- DTOs (Data Transfer Objects)
- Enums

### exception/
- Custom exceptions
- Global exception handler

### resources/
- application.yml
- application-dev.yml
- application-prod.yml
- logback.xml
