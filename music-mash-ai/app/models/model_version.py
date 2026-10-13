from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from app.database.database import Base


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False, index=True)
    version = Column(String(50), nullable=False)
    
    # Model type
    model_type = Column(String(50), nullable=False)  # AUDIO_ANALYSIS, VIDEO_ANALYSIS, SKILL_PREDICTION, etc.
    
    # Model metadata
    description = Column(Text, nullable=True)
    architecture = Column(String(100), nullable=True)
    
    # File paths
    model_path = Column(String(500), nullable=True)
    config_path = Column(String(500), nullable=True)
    
    # Performance metrics
    accuracy = Column(String(100), nullable=True)  # JSON string of metrics
    training_data_info = Column(Text, nullable=True)
    
    # Deployment status
    is_active = Column(Integer, default=1)  # 0 or 1
    is_deprecated = Column(Integer, default=0)  # 0 or 1
    
    # Version info
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    deployed_at = Column(DateTime, nullable=True)
    deprecated_at = Column(DateTime, nullable=True)
