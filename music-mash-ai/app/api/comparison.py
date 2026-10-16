"""Phase 3 endpoints: reference tracks and performance-vs-reference comparisons."""
import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.ownership import owned_analysis, owned_comparison, requester_id
from app.core.uploads import UploadPathError, resolve_upload
from app.database.database import get_db
from app.models import AnalysisStatus, Comparison, ReferenceTrack
from app.schemas.comparison import (
    CompareRequest,
    ComparisonResponse,
    ComparisonResultResponse,
    ComparisonStatusResponse,
    ReferenceCreateRequest,
    ReferenceTrackResponse,
)
from app.services.comparison_service import audio_file_of_analysis, precompute_reference, run_comparison
from app.utils.logging import log

router = APIRouter(prefix="/api/ai", tags=["Reference comparison"])


def _check_upload(file_name: str) -> None:
    try:
        resolve_upload(file_name)
    except UploadPathError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Reference tracks -------------------------------------------------------------------

@router.post("/references", response_model=ReferenceTrackResponse)
def create_reference(request: ReferenceCreateRequest, background_tasks: BackgroundTasks,
                     db: Session = Depends(get_db)):
    """Register an uploaded recording as a reference; its features are computed in the background."""
    _check_upload(request.audio_file)
    reference = ReferenceTrack(
        title=request.title, artist=request.artist, instrument=request.instrument,
        file_path=request.audio_file, uploaded_by=request.uploaded_by,
        status=AnalysisStatus.PROCESSING,
    )
    db.add(reference)
    db.commit()
    db.refresh(reference)
    background_tasks.add_task(precompute_reference, reference.id, db)
    log.info(f"Reference {reference.id} '{reference.title}' queued for feature extraction")
    return reference


@router.get("/references", response_model=list[ReferenceTrackResponse])
def list_references(db: Session = Depends(get_db)):
    """All reference tracks, newest first (including ones still processing or failed)."""
    return db.query(ReferenceTrack).order_by(ReferenceTrack.id.desc()).all()


@router.get("/references/{reference_id}", response_model=ReferenceTrackResponse)
def get_reference(reference_id: int, db: Session = Depends(get_db)):
    reference = db.query(ReferenceTrack).filter(ReferenceTrack.id == reference_id).first()
    if reference is None:
        raise HTTPException(status_code=404, detail="Reference track not found")
    return reference


# --- Comparisons ------------------------------------------------------------------------

@router.post("/compare", response_model=ComparisonResponse)
def create_comparison(request: CompareRequest, background_tasks: BackgroundTasks,
                      db: Session = Depends(get_db)):
    """Queue a comparison of a performance with a reference track."""
    reference = db.query(ReferenceTrack).filter(ReferenceTrack.id == request.reference_id).first()
    if reference is None:
        raise HTTPException(status_code=404, detail="Reference track not found")
    if reference.status != AnalysisStatus.COMPLETED:
        raise HTTPException(status_code=400, detail=f"Reference track is not ready (status {reference.status.value})")

    audio_file = request.performance_audio_file
    if request.analysis_id is not None:
        owned_analysis(db, request.analysis_id, request.user_id)   # only your own takes
        audio_file = audio_file_of_analysis(request.analysis_id, db)
        if audio_file is None:
            raise HTTPException(status_code=404, detail="Analysis not found")
    _check_upload(audio_file)

    comparison = Comparison(
        user_id=request.user_id, reference_id=reference.id, analysis_id=request.analysis_id,
        performance_audio_file=audio_file, status=AnalysisStatus.PENDING,
    )
    db.add(comparison)
    db.commit()
    db.refresh(comparison)
    background_tasks.add_task(run_comparison, comparison.id, db)
    return ComparisonResponse(id=comparison.id, reference_id=reference.id, status=comparison.status,
                              message="Comparison queued for processing", created_at=comparison.created_at)


@router.get("/compare/{comparison_id}/status", response_model=ComparisonStatusResponse)
def get_comparison_status(comparison_id: int, db: Session = Depends(get_db), user_id: int = Depends(requester_id)):
    return owned_comparison(db, comparison_id, user_id)


@router.get("/compare/{comparison_id}/result", response_model=ComparisonResultResponse)
def get_comparison_result(comparison_id: int, db: Session = Depends(get_db), user_id: int = Depends(requester_id)):
    comparison = owned_comparison(db, comparison_id, user_id)
    if comparison.status != AnalysisStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Comparison not completed yet")
    reference = db.query(ReferenceTrack).filter(ReferenceTrack.id == comparison.reference_id).first()
    return ComparisonResultResponse(
        comparison=ComparisonStatusResponse.model_validate(comparison),
        reference=ReferenceTrackResponse.model_validate(reference),
        **json.loads(comparison.result),
    )
