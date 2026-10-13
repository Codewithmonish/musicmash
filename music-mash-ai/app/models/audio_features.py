from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base


class AudioFeatures(Base):
    """Measured metrics for one analysis. Column names match the keys produced by
    app/services/audio/metrics.py (PerformanceMetrics.to_flat_dict); see docs/METRICS.md.
    Any metric column may be NULL, with the reason in ``unavailable_reasons``."""

    __tablename__ = "audio_features"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"), nullable=False, unique=True)

    # Recording
    duration_s = Column(Float, nullable=True)
    sample_rate = Column(Integer, nullable=True)
    pitch_fmin_hz = Column(Float, nullable=True)
    pitch_fmax_hz = Column(Float, nullable=True)

    # Pitch
    voiced_ratio = Column(Float, nullable=True)
    mean_abs_cents = Column(Float, nullable=True)
    median_abs_cents = Column(Float, nullable=True)
    mean_signed_cents = Column(Float, nullable=True)
    pct_frames_within_25_cents = Column(Float, nullable=True)
    pitch_stability_cents = Column(Float, nullable=True)
    note_count = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)  # JSON list of {start, end, midi, note_name, mean_cents, cents_std}

    # Rhythm
    onset_count = Column(Integer, nullable=True)
    tempo_bpm = Column(Float, nullable=True)
    tempo_stability_cv = Column(Float, nullable=True)
    tempo_drift_bpm = Column(Float, nullable=True)
    mean_abs_timing_error_ms = Column(Float, nullable=True)
    pct_onsets_within_30ms = Column(Float, nullable=True)

    # Dynamics (descriptive only)
    mean_rms_dbfs = Column(Float, nullable=True)
    dynamic_range_db = Column(Float, nullable=True)

    # Scores (0-100)
    pitch_score = Column(Float, nullable=True)
    rhythm_score = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)

    # JSON object {metric_name: reason} for every metric that is NULL
    unavailable_reasons = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    analysis = relationship("AIAnalysis", back_populates="audio_features")
