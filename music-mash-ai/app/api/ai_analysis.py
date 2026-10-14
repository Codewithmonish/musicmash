from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models import AIAnalysis, AnalysisStatus, AudioFeatures, SkillPrediction
from app.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisStatusResponse,
    AnalysisResultResponse,
    PitchContourResponse,
)
from app.services.audio import metrics as audio_metrics
from app.services import AudioAnalysisService, SkillPredictionService
from app.utils.logging import log
from datetime import datetime
from typing import Optional
from app.core.uploads import UploadPathError, resolve_upload
import json

router = APIRouter(prefix="/api/ai", tags=["AI Analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_performance(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Submit a performance for AI analysis.
    
    This endpoint queues the performance for analysis and returns immediately.
    The analysis runs in the background.
    """
    # Check the files exist before queueing, so Spring gets an immediate, specific error.
    for file_name in (request.audio_file, request.video_file):
        if file_name:
            try:
                resolve_upload(file_name)
            except UploadPathError as e:
                raise HTTPException(status_code=400, detail=str(e))

    try:
        log.info(f"Received analysis request for performance {request.performance_id}")
        
        # Create analysis record
        analysis = AIAnalysis(
            performance_id=request.performance_id,
            user_id=request.user_id,
            audio_file=request.audio_file,
            video_file=request.video_file,
            instrument=request.instrument,
            category=request.category,
            status=AnalysisStatus.PENDING
        )
        
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        
        # Queue background processing
        background_tasks.add_task(
            process_analysis,
            analysis.id,
            request.audio_file,
            request.video_file,
            request.instrument,
            request.category,
            db
        )
        
        log.info(f"Analysis {analysis.id} queued for processing")
        
        return AnalysisResponse(
            id=analysis.id,
            performance_id=analysis.performance_id,
            user_id=analysis.user_id,
            status=analysis.status,
            message="Analysis queued for processing",
            created_at=analysis.created_at
        )
        
    except Exception as e:
        log.error(f"Error creating analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{analysis_id}", response_model=AnalysisStatusResponse)
async def get_analysis_status(analysis_id: int, db: Session = Depends(get_db)):
    """
    Get the status of an analysis.
    """
    try:
        analysis = db.query(AIAnalysis).filter(AIAnalysis.id == analysis_id).first()
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return AnalysisStatusResponse(
            id=analysis.id,
            performance_id=analysis.performance_id,
            status=analysis.status,
            processing_started_at=analysis.processing_started_at,
            processing_completed_at=analysis.processing_completed_at,
            error_message=analysis.error_message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error getting analysis status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/result/{analysis_id}", response_model=AnalysisResultResponse)
async def get_analysis_result(analysis_id: int, db: Session = Depends(get_db)):
    """
    Get the complete result of an analysis.
    """
    try:
        analysis = db.query(AIAnalysis).filter(AIAnalysis.id == analysis_id).first()
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        if analysis.status != AnalysisStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Analysis not completed yet")
        
        # Get related data
        audio_features = db.query(AudioFeatures).filter(AudioFeatures.analysis_id == analysis_id).first()
        skill_prediction = db.query(SkillPrediction).filter(SkillPrediction.analysis_id == analysis_id).first()
        
        return AnalysisResultResponse(
            analysis=AnalysisStatusResponse(
                id=analysis.id,
                performance_id=analysis.performance_id,
                status=analysis.status,
                processing_started_at=analysis.processing_started_at,
                processing_completed_at=analysis.processing_completed_at,
                error_message=analysis.error_message
            ),
            audio_features=audio_features,
            skill_prediction=skill_prediction
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error getting analysis result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/result/{analysis_id}/pitch-contour", response_model=PitchContourResponse)
async def get_pitch_contour(analysis_id: int, db: Session = Depends(get_db)):
    """
    Get the downsampled pitch curve and segmented notes of a completed analysis.

    The contour is computed and stored during analysis, so this is a plain read.
    """
    analysis = db.query(AIAnalysis).filter(AIAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if analysis.status != AnalysisStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Analysis not completed yet")

    features = db.query(AudioFeatures).filter(AudioFeatures.analysis_id == analysis_id).first()
    points = json.loads(features.pitch_contour) if features and features.pitch_contour else []
    notes = json.loads(features.notes) if features and features.notes else []

    reason = None
    if not points:
        reasons = json.loads(features.unavailable_reasons) if features and features.unavailable_reasons else {}
        reason = reasons.get("mean_abs_cents", "No pitch contour was stored for this analysis.")

    return PitchContourResponse(
        analysis_id=analysis_id,
        max_points=audio_metrics.CONTOUR_MAX_POINTS,
        points=points,
        notes=notes,
        reason=reason,
    )


def process_analysis(
    analysis_id: int,
    audio_file: Optional[str],
    video_file: Optional[str],
    instrument: str,
    category: str,
    db: Session
):
    """
    Background task to process the analysis.

    Deliberately a plain (sync) function: the analysis is seconds of CPU-bound librosa work.
    Starlette runs sync background tasks in its thread pool; as an ``async def`` it would run
    on the event loop and freeze the whole server (including /status polling) until done.
    """
    try:
        log.info(f"Starting processing for analysis {analysis_id}")
        
        # Get analysis record
        analysis = db.query(AIAnalysis).filter(AIAnalysis.id == analysis_id).first()
        if not analysis:
            log.error(f"Analysis {analysis_id} not found")
            return
        
        # Update status to PROCESSING
        analysis.status = AnalysisStatus.PROCESSING
        analysis.processing_started_at = datetime.utcnow()
        db.commit()
        
        # Audio is measured from the audio file, or from the video's soundtrack if only a
        # video was uploaded (the request schema guarantees at least one).
        try:
            source_path = resolve_upload(audio_file or video_file)
            log.info(f"Measuring audio for analysis {analysis_id}")
            metrics = AudioAnalysisService().analyze_audio(str(source_path), instrument)
        except Exception as e:
            # Fail the analysis visibly instead of marking it COMPLETED with empty results.
            log.error(f"Error processing audio: {e}")
            raise RuntimeError(f"Could not analyse the audio: {e}") from e

        notes = metrics.pop("notes")
        contour = metrics.pop("pitch_contour")
        reasons = metrics.pop("unavailable_reasons")
        db.add(AudioFeatures(
            analysis_id=analysis_id,
            notes=json.dumps(notes),
            pitch_contour=json.dumps(contour),
            unavailable_reasons=json.dumps(reasons),
            **metrics,
        ))

        skill = SkillPredictionService().predict_skill_level({**metrics, "notes": notes})
        db.add(SkillPrediction(
            analysis_id=analysis_id,
            predicted_level=skill["predicted_level"],
            level_basis=skill["level_basis"],
            intonation_score=skill["intonation_score"],
            rhythm_score=skill["rhythm_score"],
            overall_score=skill["overall_score"],
            strengths=json.dumps(skill["strengths"]),
            weaknesses=json.dumps(skill["weaknesses"]),
            improvement_areas=json.dumps(skill["improvement_areas"]),
        ))
        db.commit()

        # Update status to COMPLETED
        analysis.status = AnalysisStatus.COMPLETED
        analysis.processing_completed_at = datetime.utcnow()
        db.commit()
        
        log.info(f"Analysis {analysis_id} completed successfully")
        
    except Exception as e:
        log.error(f"Error processing analysis {analysis_id}: {e}")
        
        # Update status to FAILED (discarding any partially added results first)
        try:
            db.rollback()
            analysis = db.query(AIAnalysis).filter(AIAnalysis.id == analysis_id).first()
            if analysis:
                analysis.status = AnalysisStatus.FAILED
                analysis.error_message = str(e)
                db.commit()
        except Exception:
            db.rollback()
