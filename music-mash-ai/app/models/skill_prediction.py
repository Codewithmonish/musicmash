from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base


class SkillPrediction(Base):
    __tablename__ = "skill_predictions"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"), nullable=False, unique=True)
    
    # Overall skill level
    predicted_level = Column(String(20), nullable=True)  # BEGINNER, INTERMEDIATE, ADVANCED, EXPERT, MASTER
    confidence = Column(Float, nullable=True)
    
    # Skill breakdown
    pitch_accuracy = Column(Float, nullable=True)  # 0.0 to 1.0
    rhythm_accuracy = Column(Float, nullable=True)  # 0.0 to 1.0
    timing_precision = Column(Float, nullable=True)  # 0.0 to 1.0
    technique_score = Column(Float, nullable=True)  # 0.0 to 1.0
    musicality_score = Column(Float, nullable=True)  # 0.0 to 1.0
    
    # Comparison with peers
    percentile_rank = Column(Float, nullable=True)  # 0.0 to 100.0
    
    # Improvement suggestions
    strengths = Column(Text, nullable=True)  # JSON string
    weaknesses = Column(Text, nullable=True)  # JSON string
    improvement_areas = Column(Text, nullable=True)  # JSON string
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship
    analysis = relationship("AIAnalysis", back_populates="skill_prediction")
