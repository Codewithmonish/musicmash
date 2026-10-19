from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Music Mash AI Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "sqlite:///./music_mash_ai.db"
    
    # Redis (for Celery)
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    
    # AI Processing
    SAMPLE_RATE: int = 22050
    HOP_LENGTH: int = 512
    N_FFT: int = 2048
    N_MELS: int = 128
    
    # Model Paths
    MODEL_DIR: str = "./models"
    # Precomputed reference-track features (.npz), rebuilt from the reference audio if lost
    REFERENCE_FEATURES_DIR: str = "./data/reference_features"
    
    # AI coach (Phase 4). With no LLM_API_KEY the coach runs in "basic mode": the measured
    # diagnosis plus retrieved exercises, with no generated text.
    LLM_PROVIDER: str = "google"          # only "google" (Gemini) is supported
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gemini-2.5-flash"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    CHROMA_DIR: str = "./chroma_db"       # built by scripts/build_knowledge_index.py

    # Spring Boot Integration
    SPRING_BOOT_URL: str = "http://localhost:8081"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
