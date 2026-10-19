from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum as SQLEnum
from datetime import datetime
from app.database.database import Base
from app.models.ai_analysis import AnalysisStatus


class ReferenceTrack(Base):
    """An original recording that performances can be compared with (Phase 3).

    Its features (chroma, pitch, onsets) are computed once after upload and stored in
    features_path, so each comparison only has to analyse the performance.
    status: PROCESSING while features are computed, COMPLETED when ready, FAILED otherwise.
    """
    __tablename__ = "reference_tracks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    artist = Column(String(200), nullable=True)
    instrument = Column(String(50), nullable=True)
    file_path = Column(String(255), nullable=False)       # upload file name (app/core/uploads.py)
    uploaded_by = Column(Integer, nullable=True)          # Spring user id

    status = Column(SQLEnum(AnalysisStatus), default=AnalysisStatus.PROCESSING, nullable=False)
    error_message = Column(Text, nullable=True)
    duration_s = Column(Float, nullable=True)
    features_path = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
