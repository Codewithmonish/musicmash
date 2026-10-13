from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class AnalysisStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AnalysisRequest(BaseModel):
    performance_id: int = Field(..., description="Performance ID from Spring Boot")
    user_id: int = Field(..., description="User ID from Spring Boot")
    audio_url: Optional[str] = Field(None, description="URL to audio file")
    video_url: Optional[str] = Field(None, description="URL to video file")
    instrument: Optional[str] = Field(None, description="Instrument being played")
    category: Optional[str] = Field(None, description="Performance category")


class AnalysisResponse(BaseModel):
    id: int
    performance_id: int
    user_id: int
    status: AnalysisStatus
    message: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class AnalysisStatusResponse(BaseModel):
    id: int
    performance_id: int
    status: AnalysisStatus
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class AudioFeaturesResponse(BaseModel):
    id: int
    analysis_id: int
    duration: Optional[float] = None
    sample_rate: Optional[int] = None
    spectral_centroid_mean: Optional[float] = None
    spectral_centroid_std: Optional[float] = None
    tempo: Optional[float] = None
    tempo_confidence: Optional[float] = None
    rms_mean: Optional[float] = None
    key: Optional[str] = None
    scale: Optional[str] = None
    
    class Config:
        from_attributes = True


class AuthenticityResultResponse(BaseModel):
    id: int
    analysis_id: int
    authenticity_score: Optional[float] = None
    confidence: Optional[float] = None
    is_live_performance: Optional[int] = None
    is_pre_recorded: Optional[int] = None
    has_suspicious_patterns: Optional[int] = None
    
    class Config:
        from_attributes = True


class SkillPredictionResponse(BaseModel):
    id: int
    analysis_id: int
    predicted_level: Optional[str] = None
    confidence: Optional[float] = None
    pitch_accuracy: Optional[float] = None
    rhythm_accuracy: Optional[float] = None
    timing_precision: Optional[float] = None
    technique_score: Optional[float] = None
    musicality_score: Optional[float] = None
    percentile_rank: Optional[float] = None
    
    class Config:
        from_attributes = True


class AnalysisResultResponse(BaseModel):
    analysis: AnalysisStatusResponse
    audio_features: Optional[AudioFeaturesResponse] = None
    authenticity_result: Optional[AuthenticityResultResponse] = None
    skill_prediction: Optional[SkillPredictionResponse] = None
