from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from datetime import datetime
from app.database.database import Base
from app.models.ai_analysis import AnalysisStatus


class Comparison(Base):
    """One performance compared with one reference track (app/services/audio/alignment.py)."""
    __tablename__ = "comparisons"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    reference_id = Column(Integer, ForeignKey("reference_tracks.id"), nullable=False, index=True)
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"), nullable=True)
    performance_audio_file = Column(String(255), nullable=False)  # upload file name

    status = Column(SQLEnum(AnalysisStatus), default=AnalysisStatus.PENDING, nullable=False)
    error_message = Column(Text, nullable=True)
    result = Column(Text, nullable=True)  # JSON of alignment.ComparisonResult

    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
