from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PracticeRecommendationRequest(BaseModel):
    user_id: int = Field(..., description="User ID")
    analysis_id: Optional[int] = Field(None, description="Analysis ID if based on specific performance")
    recommendation_type: str = Field(..., description="Type: EXERCISE, SONG, TECHNIQUE, THEORY")
    title: str = Field(..., description="Recommendation title")
    description: Optional[str] = Field(None, description="Detailed description")
    difficulty_level: Optional[str] = Field(None, description="Difficulty level")
    focus_area: Optional[str] = Field(None, description="Focus area")
    target_skill: Optional[str] = Field(None, description="Target skill")
    priority: int = Field(5, description="Priority 1-10")
    estimated_practice_time: Optional[int] = Field(None, description="Estimated practice time in minutes")
    resource_url: Optional[str] = Field(None, description="Resource URL")
    resource_type: Optional[str] = Field(None, description="Resource type: VIDEO, AUDIO, SHEET_MUSIC, ARTICLE")


class PracticeRecommendationResponse(BaseModel):
    id: int
    user_id: int
    analysis_id: Optional[int] = None
    recommendation_type: str
    title: str
    description: Optional[str] = None
    difficulty_level: Optional[str] = None
    focus_area: Optional[str] = None
    target_skill: Optional[str] = None
    priority: int
    estimated_practice_time: Optional[int] = None
    resource_url: Optional[str] = None
    resource_type: Optional[str] = None
    is_completed: int
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
