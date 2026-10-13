# Music Mash - System Architecture

## Overview
Music Mash is a scalable microservice-based platform for music skill development, connecting musicians with expert judges and AI-powered feedback systems.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Frontend                           │
│  (React.js + Tailwind CSS + React Router + Axios)               │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTPS/WebSocket
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway / Load Balancer                │
│                    (Spring Cloud Gateway / Nginx)               │
└─────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  Auth        │        │  User        │        │ Performance  │
│  Service     │        │  Service     │        │  Service     │
│  (Spring     │        │  (Spring     │        │  (Spring     │
│   Boot)      │        │   Boot)      │        │   Boot)      │
└──────────────┘        └──────────────┘        └──────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ Evaluation   │        │ Competition  │        │ Notification│
│  Service     │        │  Service     │        │  Service     │
│  (Spring     │        │  (Spring     │        │  (Spring     │
│   Boot)      │        │   Boot)      │        │   Boot)      │
└──────────────┘        └──────────────┘        └──────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Message Broker (RabbitMQ)                    │
│                   (Event-Driven Communication)                    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  MySQL       │        │  Redis       │        │  AI Service  │
│  Database    │        │  Cache       │        │  (FastAPI)   │
│  (Primary)   │        │  (Session)   │        │  (Python)    │
└──────────────┘        └──────────────┘        └──────────────┘
                                  │
                                  ▼
                        ┌──────────────┐
                        │  AWS S3 /    │
                        │  Cloudinary  │
                        │  (Media)     │
                        └──────────────┘
```

## Microservices Architecture

### 1. Authentication Service
- **Port**: 8081
- **Responsibilities**:
  - User registration and login
  - JWT token generation and validation
  - Password encryption (BCrypt)
  - Role-based access control
  - OAuth2 integration (Google, Facebook)
  - Password reset functionality
- **Tech Stack**: Spring Boot, Spring Security, JWT, BCrypt

### 2. User Service
- **Port**: 8082
- **Responsibilities**:
  - User profile management
  - Musician profile creation
  - Skill level tracking
  - Achievement management
  - User statistics
- **Tech Stack**: Spring Boot, JPA, MySQL

### 3. Performance Service
- **Port**: 8083
- **Responsibilities**:
  - Performance upload (audio/video)
  - File management (S3/Cloudinary)
  - Performance metadata
  - Status tracking
  - Performance history
- **Tech Stack**: Spring Boot, AWS SDK, Cloudinary API

### 4. Evaluation Service
- **Port**: 8084
- **Responsibilities**:
  - Judge evaluation management
  - Rating calculation
  - Feedback storage
  - Evaluation metrics
  - Score aggregation
- **Tech Stack**: Spring Boot, JPA, MySQL

### 5. Competition Service
- **Port**: 8085
- **Responsibilities**:
  - Competition creation and management
  - Challenge management
  - Participant management
  - Judge assignment
  - Competition rules
- **Tech Stack**: Spring Boot, JPA, MySQL

### 6. Notification Service
- **Port**: 8086
- **Responsibilities**:
  - Real-time notifications (WebSocket)
  - Email notifications
  - Push notifications
  - Announcement management
  - Notification preferences
- **Tech Stack**: Spring Boot, WebSocket, RabbitMQ

### 7. AI Service
- **Port**: 8000
- **Responsibilities**:
  - Audio performance analysis
  - Pitch accuracy detection
  - Rhythm analysis
  - Anti-cheating detection
  - Skill level prediction
  - Personalized recommendations
- **Tech Stack**: FastAPI, TensorFlow, PyTorch, Librosa, OpenCV, MediaPipe

## Technology Stack Details

### Backend Technologies
- **Language**: Java 17+
- **Framework**: Spring Boot 3.x
- **Security**: Spring Security 6.x
- **Authentication**: JWT (jsonwebtoken)
- **ORM**: Hibernate/JPA
- **Database**: MySQL 8.0+
- **Cache**: Redis 7.x
- **Message Broker**: RabbitMQ
- **API Documentation**: SpringDoc OpenAPI (Swagger)
- **Testing**: JUnit 5, Mockito, TestContainers

### Frontend Technologies
- **Framework**: React 18+
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.x
- **Routing**: React Router 6.x
- **HTTP Client**: Axios
- **State Management**: Redux Toolkit / React Context
- **Real-time**: Socket.io-client
- **UI Components**: shadcn/ui, Lucide Icons
- **Build Tool**: Vite

### AI/ML Technologies
- **Framework**: FastAPI
- **ML Libraries**: TensorFlow 2.x, PyTorch 2.x
- **Audio Processing**: Librosa, NumPy
- **Computer Vision**: OpenCV, MediaPipe
- **ML Models**: Scikit-learn, Transformers
- **Vector Database**: Pinecone / Weaviate (for similarity search)

### Infrastructure
- **Cloud**: AWS / Google Cloud
- **Storage**: AWS S3 / Cloudinary
- **CDN**: CloudFront
- **Containerization**: Docker
- **Orchestration**: Kubernetes (optional)
- **CI/CD**: GitHub Actions / Jenkins
- **Monitoring**: Prometheus, Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)

## Security Architecture

### Authentication Flow
1. User registers/logs in via Auth Service
2. Auth Service validates credentials
3. Auth Service generates JWT token
4. Token stored in client (httpOnly cookie / localStorage)
5. Subsequent requests include JWT in Authorization header
6. API Gateway validates JWT token
7. Request forwarded to appropriate microservice

### Authorization
- **Role-Based Access Control (RBAC)**:
  - USER: Basic access to platform features
  - JUDGE: Evaluation and feedback capabilities
  - HOST: Competition management
  - ADMIN: Full platform control

- **Method-Level Security**: `@PreAuthorize` annotations
- **Data-Level Security**: Row-level security for user data

### Security Measures
- HTTPS/TLS encryption
- BCrypt password hashing
- JWT token expiration and refresh
- Rate limiting
- Input validation
- SQL injection prevention (JPA)
- XSS protection
- CORS configuration
- API key management for external services

## Data Flow Architecture

### Performance Upload Flow
```
User → Frontend → Performance Service → S3/Cloudinary
                      ↓
                Message Broker
                      ↓
                AI Service (Async)
                      ↓
                AI Analysis Result
                      ↓
                Notification Service
                      ↓
                User Notification
```

### Evaluation Flow
```
Judge → Frontend → Evaluation Service → Database
                      ↓
                Message Broker
                      ↓
                User Service (Update stats)
                      ↓
                Notification Service
                      ↓
                User Notification
```

### Competition Flow
```
Host → Frontend → Competition Service → Database
                      ↓
                Message Broker
                      ↓
                Notification Service
                      ↓
                All Participants
```

## Scalability Strategy

### Horizontal Scaling
- Stateless microservices
- Load balancing (Nginx / AWS ALB)
- Database read replicas
- Redis clustering
- Container orchestration (Kubernetes)

### Vertical Scaling
- AWS EC2 instances with auto-scaling
- RDS database scaling
- ElastiCache for Redis

### Performance Optimization
- Database indexing
- Redis caching for frequent queries
- CDN for static assets
- Lazy loading
- Pagination
- Async processing for AI analysis
- Connection pooling

## Monitoring & Observability

### Metrics
- Request latency
- Error rates
- Service availability
- Database performance
- Cache hit rates
- AI processing time

### Logging
- Structured logging (JSON format)
- Centralized log aggregation (ELK)
- Correlation IDs for distributed tracing

### Alerting
- Service downtime alerts
- Error rate thresholds
- Performance degradation alerts
- Database connection alerts

## Deployment Architecture

### Development Environment
- Local development with Docker Compose
- Local MySQL and Redis
- Mock AI service

### Staging Environment
- Cloud deployment (AWS)
- Staging database
- Full AI service integration
- Load testing

### Production Environment
- Multi-region deployment
- High availability setup
- Auto-scaling
- CDN integration
- Disaster recovery plan

## Integration Points

### External Services
- **AWS S3/Cloudinary**: Media storage
- **SendGrid/SES**: Email notifications
- **Firebase**: Push notifications
- **Stripe**: Payment integration (future)
- **OAuth Providers**: Google, Facebook

### Service Communication
- **Synchronous**: REST APIs (HTTP/HTTPS)
- **Asynchronous**: RabbitMQ (message broker)
- **Real-time**: WebSockets (notifications)

## Disaster Recovery & Backup

### Database Backup
- Daily automated backups
- Point-in-time recovery
- Cross-region replication

### Service Redundancy
- Multi-AZ deployment
- Health checks
- Automatic failover

### Data Recovery
- S3 versioning
- Database snapshots
- Log retention policies
