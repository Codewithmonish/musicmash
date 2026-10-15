"""Request / response schemas for reference tracks and comparisons (Phase 3)."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.uploads import is_valid_upload_name
from app.schemas.analysis import AnalysisStatus


def _plain_file_name(value: Optional[str]) -> Optional[str]:
    if value is not None and not is_valid_upload_name(value):
        raise ValueError("must be a plain upload file name (no directories, drive or URL)")
    return value


# --- Reference tracks -------------------------------------------------------------------

class ReferenceCreateRequest(BaseModel):
    """Register an uploaded recording as a reference. Spring only forwards this for HOST/ADMIN."""
    title: str = Field(..., min_length=1, max_length=200)
    artist: Optional[str] = Field(None, max_length=200)
    instrument: Optional[str] = Field(None, max_length=50, description="Picks the pitch search range")
    audio_file: str = Field(..., description="Upload file name, e.g. 3f2a...e1.wav")
    uploaded_by: Optional[int] = Field(None, description="Spring user id")

    _check_file = field_validator("audio_file")(_plain_file_name)


class ReferenceTrackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    artist: Optional[str] = None
    instrument: Optional[str] = None
    status: AnalysisStatus = Field(..., description="PROCESSING while features are computed, COMPLETED when usable")
    error_message: Optional[str] = None
    duration_s: Optional[float] = None
    created_at: datetime


# --- Comparisons ------------------------------------------------------------------------

class CompareRequest(BaseModel):
    """Compare a performance with a reference. Give exactly one of performance_audio_file
    (an upload file name) or analysis_id (re-use the audio of an existing analysis)."""
    user_id: int
    reference_id: int
    performance_audio_file: Optional[str] = Field(None, description="Upload file name")
    analysis_id: Optional[int] = Field(None, description="Use the audio of this analysis")

    _check_file = field_validator("performance_audio_file")(_plain_file_name)

    @model_validator(mode="after")
    def _exactly_one_source(self) -> "CompareRequest":
        if (self.performance_audio_file is None) == (self.analysis_id is None):
            raise ValueError("give exactly one of performance_audio_file or analysis_id")
        return self


class ComparisonResponse(BaseModel):
    id: int
    reference_id: int
    status: AnalysisStatus
    message: Optional[str] = None
    created_at: datetime


class ComparisonStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference_id: int
    status: AnalysisStatus
    error_message: Optional[str] = None
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None


class TempoPoint(BaseModel):
    ref_time: float = Field(..., description="Reference time, seconds")
    tempo_ratio: float = Field(..., description="Reference s / performance s over a 4 s window; > 1 = faster")


class SegmentComparison(BaseModel):
    ref_start: float
    ref_end: float
    user_start: float
    user_end: float
    median_cents: Optional[float] = Field(None, description="Performance − reference pitch, cents (octave-folded)")
    tempo_ratio: float
    ref_voiced_share: float
    user_voiced_share: Optional[float] = None
    ref_onsets: int
    user_onsets: int


class ProblemSection(BaseModel):
    ref_start: float = Field(..., description="Seconds in the reference")
    ref_end: float
    user_start: float = Field(..., description="Matching seconds in the performance")
    user_end: float
    issue: Literal["pitch_flat", "pitch_sharp", "rushing", "dragging", "missing_notes"]
    detail: str


class ComparisonResultResponse(BaseModel):
    """Everything measured by app/services/audio/alignment.py; see docs/ALIGNMENT.md."""
    comparison: ComparisonStatusResponse
    reference: ReferenceTrackResponse
    similarity: float = Field(..., description="0-100: 100 × (1 − path cost / random-pairing cost)")
    played_similarity: Optional[float] = Field(None, description="Same, only where the performance is sounding")
    mean_path_cost: float
    baseline_cost: float
    tempo_ratio: float = Field(..., description="Reference duration ÷ performance duration; > 1 = faster")
    ref_duration_s: float
    user_duration_s: float
    truncated: bool = Field(..., description="True if either recording was cut to 3 minutes")
    reliable: bool
    unreliable_reason: Optional[str] = None
    tempo_curve: list[TempoPoint]
    segments: list[SegmentComparison]
    problem_sections: list[ProblemSection]
    path: list[list[float]] = Field(..., description="Downsampled DTW path [[ref_s, user_s], ...]")
