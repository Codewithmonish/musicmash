from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from datetime import datetime
from app.database.database import Base


class PracticeRecommendation(Base):
    __tablename__ = "practice_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"), nullable=True)
    
    # Recommendation type
    recommendation_type = Column(String(50), nullable=False)  # EXERCISE, SONG, TECHNIQUE, THEORY
    
    # Content
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Difficulty
    difficulty_level = Column(String(20), nullable=True)
    
    # Focus areas
    focus_area = Column(String(100), nullable=True)
    target_skill = Column(String(100), nullable=True)
    
    # Priority
    priority = Column(Integer, default=5)  # 1-10
    
    # Estimated time
    estimated_practice_time = Column(Integer, nullable=True)  # minutes
    
    # Resources
    resource_url = Column(String(500), nullable=True)
    resource_type = Column(String(50), nullable=True)  # VIDEO, AUDIO, SHEET_MUSIC, ARTICLE
    
    # Progress tracking
    is_completed = Column(Integer, default=0)  # 0 or 1
    completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
