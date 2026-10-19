from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base


class SkillPrediction(Base):
    """Rule-based skill summary (app/services/skill_prediction_service.py)."""

    __tablename__ = "skill_predictions"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"), nullable=False, unique=True)

    # BEGINNER, INTERMEDIATE, ADVANCED, EXPERT; NULL if nothing could be measured
    predicted_level = Column(String(20), nullable=True)
    level_basis = Column(Text, nullable=True)  # how the level was decided

    # 0-100 scores copied from the measured metrics
    intonation_score = Column(Float, nullable=True)
    rhythm_score = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)

    # Feedback generated from metric thresholds (JSON lists of strings)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    improvement_areas = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    analysis = relationship("AIAnalysis", back_populates="skill_prediction")
