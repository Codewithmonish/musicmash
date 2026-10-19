from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.database.database import Base


class CoachReport(Base):
    """Cached AI-coach output for one analysis (the JSON of schemas.coach.CoachResponse)."""
    __tablename__ = "coach_reports"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"), nullable=False, unique=True, index=True)
    mode = Column(String(10), nullable=False)  # "llm" or "basic"
    result = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
