from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base


class AudioFeatures(Base):
    __tablename__ = "audio_features"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"), nullable=False, unique=True)
    
    # Basic features
    duration = Column(Float, nullable=True)
    sample_rate = Column(Integer, nullable=True)
    
    # Spectral features
    spectral_centroid_mean = Column(Float, nullable=True)
    spectral_centroid_std = Column(Float, nullable=True)
    spectral_bandwidth_mean = Column(Float, nullable=True)
    spectral_bandwidth_std = Column(Float, nullable=True)
    spectral_rolloff_mean = Column(Float, nullable=True)
    spectral_rolloff_std = Column(Float, nullable=True)
    
    # MFCC features
    mfcc_mean = Column(String(1000), nullable=True)  # JSON string
    mfcc_std = Column(String(1000), nullable=True)  # JSON string
    
    # Chroma features
    chroma_mean = Column(String(1000), nullable=True)  # JSON string
    chroma_std = Column(String(1000), nullable=True)  # JSON string
    
    # Tempo and rhythm
    tempo = Column(Float, nullable=True)
    tempo_confidence = Column(Float, nullable=True)
    
    # Energy features
    rms_mean = Column(Float, nullable=True)
    rms_std = Column(Float, nullable=True)
    zero_crossing_rate_mean = Column(Float, nullable=True)
    zero_crossing_rate_std = Column(Float, nullable=True)
    
    # Tonality
    key = Column(String(10), nullable=True)
    scale = Column(String(10), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship
    analysis = relationship("AIAnalysis", back_populates="audio_features")
