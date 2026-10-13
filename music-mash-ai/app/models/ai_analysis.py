from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database.database import Base


class AnalysisStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True)
    performance_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    
    audio_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    
    instrument = Column(String(50), nullable=True)
    category = Column(String(50), nullable=True)
    
    status = Column(SQLEnum(AnalysisStatus), default=AnalysisStatus.PENDING, nullable=False)
    
    error_message = Column(Text, nullable=True)
    
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    audio_features = relationship("AudioFeatures", back_populates="analysis", uselist=False)
    skill_prediction = relationship("SkillPrediction", back_populates="analysis", uselist=False)
