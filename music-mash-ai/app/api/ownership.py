"""Who is asking, and do they own what they ask for?

The AI service is internal: only Spring calls it (it listens on 127.0.0.1). Spring
authenticates the user with their JWT and sends their id in the X-User-Id header on every
call. Analyses, comparisons and coaching belong to one user: anyone else gets the same 404 as
for an id that doesn't exist, so ids of other users' data can't be probed. Reference tracks
are a shared library and are readable by every user.
"""
from fastapi import Header, HTTPException
from sqlalchemy.orm import Session

from app.models import AIAnalysis, Comparison


def requester_id(x_user_id: int = Header(..., alias="X-User-Id", description="Spring user id of the caller")) -> int:
    """FastAPI dependency: the calling user's id (422 if Spring didn't send it)."""
    return x_user_id


def owned_analysis(db: Session, analysis_id: int, user_id: int) -> AIAnalysis:
    """The analysis if it exists and belongs to user_id, else 404."""
    analysis = db.query(AIAnalysis).filter(AIAnalysis.id == analysis_id).first()
    if analysis is None or analysis.user_id != user_id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


def owned_comparison(db: Session, comparison_id: int, user_id: int) -> Comparison:
    """The comparison if it exists and belongs to user_id, else 404."""
    comparison = db.query(Comparison).filter(Comparison.id == comparison_id).first()
    if comparison is None or comparison.user_id != user_id:
        raise HTTPException(status_code=404, detail="Comparison not found")
    return comparison
