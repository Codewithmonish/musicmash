from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base


class AuthenticityResult(Base):
    __tablename__ = "authenticity_results"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"), nullable=False, unique=True)
    
    # Authenticity score
    authenticity_score = Column(Float, nullable=True)  # 0.0 to 1.0
    confidence = Column(Float, nullable=True)
    
    # Detection flags
    is_live_performance = Column(Integer, nullable=True)  # 0 or 1
    is_pre_recorded = Column(Integer, nullable=True)  # 0 or 1
    has_suspicious_patterns = Column(Integer, nullable=True)  # 0 or 1
    
    # Analysis details
    audio_consistency_score = Column(Float, nullable=True)
    video_consistency_score = Column(Float, nullable=True)
    timing_anomalies_count = Column(Integer, nullable=True)
    
    # Detailed findings
    findings = Column(Text, nullable=True)  # JSON string
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship
    analysis = relationship("AIAnalysis", back_populates="authenticity_result")
