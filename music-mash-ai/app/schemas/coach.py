"""AI coach schemas: the API request/response, and the structured output the LLM must return."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class CoachRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")  # a camelCase field from Spring must fail, not vanish

    level: Optional[str] = Field(None, description="User's experience level from the Spring profile, e.g. BEGINNER")
    instrument: Optional[str] = Field(None, description="Overrides the instrument stored with the analysis")
    refresh: bool = Field(False, description="Ignore the cached coaching and generate it again")


class DiagnosisItem(BaseModel):
    key: str = Field(..., description="intonation, note_stability, timing, rushing, dragging, pulse, missing_notes")
    tag: str = Field(..., description="Knowledge-base problem tag used for retrieval")
    label: str
    evidence: list[str] = Field(..., description="Sentences quoting measured values")


class SourceDoc(BaseModel):
    id: str = Field(..., description="Knowledge doc id (file name without .md)")
    title: str


class CoachIssue(BaseModel):
    issue: str
    evidence: list[str] = Field(..., min_length=1, description="Copied verbatim from the diagnosis evidence")
    exercise: str
    how_long: str
    source_doc: SourceDoc


class PlanDay(BaseModel):
    day: int = Field(..., ge=1, le=7)
    focus: str
    tasks: list[str] = Field(..., min_length=1)


class RetrievedExercise(BaseModel):
    diagnosis_key: str = Field(..., description="Which diagnosis this exercise was retrieved for")
    source_doc: SourceDoc
    excerpt: str = Field(..., description="The doc's exercise section, as written")
    how_long: Optional[str] = Field(None, description="The doc's own 'How long' line")


class CoachResponse(BaseModel):
    """mode = "llm": summary, top_issues and plan were written by the LLM and passed the grounding
    check. mode = "basic": no LLM text at all; the plan is a fixed rotation over the retrieved docs."""
    model_config = ConfigDict(protected_namespaces=())

    analysis_id: int
    mode: Literal["llm", "basic"]
    model: Optional[str] = Field(None, description="LLM used, when mode is llm")
    created_at: datetime
    diagnosis: list[DiagnosisItem]
    summary: Optional[str] = None
    top_issues: list[CoachIssue] = Field(default_factory=list, max_length=3)
    plan: list[PlanDay] = Field(default_factory=list)
    exercises: list[RetrievedExercise] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list, description="Unavailable metrics, why basic mode was used, etc.")


# --- What the LLM must return (sent as the structured-output schema) -------------------

class LLMIssue(BaseModel):
    issue: str = Field(..., description="Short name of the problem, e.g. 'Sharp intonation'")
    evidence: list[str] = Field(..., min_length=1, max_length=3,
                                description="1-3 lines copied EXACTLY, character for character, from MEASUREMENTS")
    exercise: str = Field(..., description="What to practise, taken from the cited source doc only")
    how_long: str = Field(..., description="Time per day, as the source doc states it")
    source_doc: str = Field(..., description="The id of the source doc the exercise comes from")


class LLMPlanDay(BaseModel):
    day: int = Field(..., ge=1, le=7)
    focus: str = Field(..., description="The issue this day works on")
    tasks: list[str] = Field(..., min_length=1, max_length=4, description="Short practice tasks for this day")


class LLMCoachOutput(BaseModel):
    summary: str = Field(..., description="2-3 sentences for the student; no numbers except quoted measurements")
    top_3_issues: list[LLMIssue] = Field(..., min_length=1, max_length=3)
    plan: list[LLMPlanDay] = Field(..., min_length=7, max_length=7, description="Days 1 to 7, in order")
