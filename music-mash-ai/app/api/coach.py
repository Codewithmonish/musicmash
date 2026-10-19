"""Phase 4 endpoint: the AI coach for one completed analysis, cached per analysis."""
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from langchain_core.runnables import Runnable
from sqlalchemy.orm import Session

from app.api.ownership import owned_analysis, requester_id
from app.core.config import settings
from app.database.database import get_db
from app.models import AnalysisStatus, AudioFeatures, CoachReport, Comparison
from app.schemas.coach import CoachRequest, CoachResponse
from app.services.coach.knowledge import KnowledgeBase
from app.services.coach_service import build_coaching, get_knowledge_base, make_structured_llm, metrics_dict
from app.utils.logging import log

router = APIRouter(prefix="/api/ai", tags=["AI coach"])


def get_structured_llm() -> Optional[Runnable]:
    """Dependency so tests can swap in a fake LLM."""
    return make_structured_llm()


def _problem_sections(analysis_id: int, db: Session) -> list[dict]:
    """Problem sections of the newest completed comparison made from this analysis, if any."""
    comparison = (db.query(Comparison)
                  .filter(Comparison.analysis_id == analysis_id, Comparison.status == AnalysisStatus.COMPLETED)
                  .order_by(Comparison.id.desc()).first())
    if comparison is None or not comparison.result:
        return []
    return json.loads(comparison.result).get("problem_sections") or []


@router.post("/coach/{analysis_id}", response_model=CoachResponse)
def coach(analysis_id: int, request: Optional[CoachRequest] = None, db: Session = Depends(get_db),
          kb: KnowledgeBase = Depends(get_knowledge_base),
          structured_llm: Optional[Runnable] = Depends(get_structured_llm),
          user_id: int = Depends(requester_id)):
    """Coaching for a completed analysis.

    Returns the cached result unless `refresh` is set, or the cache is basic mode and an LLM
    is now available. Basic mode (no LLM text) is used when no LLM_API_KEY is configured.
    """
    request = request or CoachRequest()
    analysis = owned_analysis(db, analysis_id, user_id)
    if analysis.status != AnalysisStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Analysis not completed yet")
    features = db.query(AudioFeatures).filter(AudioFeatures.analysis_id == analysis_id).first()
    if features is None:
        raise HTTPException(status_code=400, detail="This analysis has no audio metrics to coach on")

    cached = db.query(CoachReport).filter(CoachReport.analysis_id == analysis_id).first()
    upgrade = cached is not None and cached.mode == "basic" and structured_llm is not None
    if cached is not None and not request.refresh and not upgrade:
        return CoachResponse.model_validate_json(cached.result)

    result = build_coaching(analysis_id, metrics_dict(features), _problem_sections(analysis_id, db),
                            request.instrument or analysis.instrument, request.level, kb, structured_llm,
                            model_name=settings.LLM_MODEL)
    if cached is None:
        cached = CoachReport(analysis_id=analysis_id, mode=result.mode, result="")
        db.add(cached)
    cached.mode, cached.result, cached.created_at = result.mode, result.model_dump_json(), result.created_at
    db.commit()
    log.info(f"Coach for analysis {analysis_id}: {result.mode} mode, {len(result.diagnosis)} issues")
    return result
