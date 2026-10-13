import json
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Any, Optional
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


def _json_list(value: Any) -> Any:
    """JSON columns are stored as text in the database; decode them (NULL -> [])."""
    return json.loads(value) if isinstance(value, str) else (value or [])


def _json_dict(value: Any) -> Any:
    """JSON columns are stored as text in the database; decode them (NULL -> {})."""
    return json.loads(value) if isinstance(value, str) else (value or {})


class NoteResponse(BaseModel):
    start: float = Field(..., description="Note start, seconds")
    end: float = Field(..., description="Note end, seconds")
    midi: int = Field(..., description="Nearest equal-tempered MIDI note number")
    note_name: str = Field(..., description="Note name, e.g. C#4")
    mean_cents: float = Field(..., description="Mean deviation from the note, cents (+ = sharp)")
    cents_std: float = Field(..., description="Standard deviation of cents within the note")


class AudioFeaturesResponse(BaseModel):
    """Measured metrics. A null metric has its reason in unavailable_reasons.
    Formulas: music-mash-ai/docs/METRICS.md."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    analysis_id: int

    duration_s: Optional[float] = Field(None, description="Analysed duration after trimming silence, seconds")
    sample_rate: Optional[int] = Field(None, description="Analysis sample rate, Hz")
    pitch_fmin_hz: Optional[float] = Field(None, description="Lowest pitch searched, Hz")
    pitch_fmax_hz: Optional[float] = Field(None, description="Highest pitch searched, Hz")

    voiced_ratio: Optional[float] = Field(None, description="Fraction of frames with a detectable pitch, 0-1")
    mean_abs_cents: Optional[float] = Field(None, description="Mean |deviation| from nearest semitone, cents")
    median_abs_cents: Optional[float] = Field(None, description="Median |deviation| from nearest semitone, cents")
    mean_signed_cents: Optional[float] = Field(None, description="Mean signed deviation, cents (+ = sharp)")
    pct_frames_within_25_cents: Optional[float] = Field(None, description="Voiced frames within ±25 cents, %")
    pitch_stability_cents: Optional[float] = Field(None, description="Mean std of cents within sustained notes")
    note_count: Optional[int] = Field(None, description="Number of segmented notes")
    notes: list[NoteResponse] = Field(default_factory=list, description="Segmented notes")

    onset_count: Optional[int] = Field(None, description="Detected note onsets")
    tempo_bpm: Optional[float] = Field(None, description="Tempo of the fitted beat grid, BPM")
    tempo_stability_cv: Optional[float] = Field(None, description="Rolling CV of beat lengths, unitless")
    tempo_drift_bpm: Optional[float] = Field(None, description="Second-half tempo minus first-half tempo, BPM")
    mean_abs_timing_error_ms: Optional[float] = Field(None, description="Mean |onset - nearest grid point|, ms")
    pct_onsets_within_30ms: Optional[float] = Field(None, description="Onsets within ±30 ms of the grid, %")

    mean_rms_dbfs: Optional[float] = Field(None, description="Mean frame level, dBFS")
    dynamic_range_db: Optional[float] = Field(None, description="95th - 5th percentile frame level, dB")

    pitch_score: Optional[float] = Field(None, description="clip(100 - 2 * mean_abs_cents, 0, 100)")
    rhythm_score: Optional[float] = Field(None, description="clip(100 - 2 * mean_abs_timing_error_ms, 0, 100)")
    overall_score: Optional[float] = Field(None, description="Mean of the available scores")

    unavailable_reasons: dict[str, str] = Field(default_factory=dict,
                                                description="Why each null metric could not be measured")

    _decode_notes = field_validator("notes", mode="before")(_json_list)
    _decode_reasons = field_validator("unavailable_reasons", mode="before")(_json_dict)


class SkillPredictionResponse(BaseModel):
    """Rule-based skill summary built from the measured metrics."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    analysis_id: int
    predicted_level: Optional[str] = Field(None, description="BEGINNER / INTERMEDIATE / ADVANCED / EXPERT")
    level_basis: Optional[str] = Field(None, description="How the level was decided")
    pitch_score: Optional[float] = None
    rhythm_score: Optional[float] = None
    overall_score: Optional[float] = None
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    improvement_areas: list[str] = Field(default_factory=list)

    _decode_json = field_validator("strengths", "weaknesses", "improvement_areas",
                                   mode="before")(_json_list)


class AnalysisResultResponse(BaseModel):
    analysis: AnalysisStatusResponse
    audio_features: Optional[AudioFeaturesResponse] = None
    skill_prediction: Optional[SkillPredictionResponse] = None
