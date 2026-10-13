from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database.database import get_db
from app.models import AIAnalysis, AnalysisStatus, AudioFeatures, AuthenticityResult, SkillPrediction
from app.schemas import AnalysisRequest, AnalysisResponse, AnalysisStatusResponse, AnalysisResultResponse
from app.services import (
    AudioAnalysisService,
    VideoAnalysisService,
    CheatingDetectionService,
    SkillPredictionService,
    RecommendationService
)
from app.utils.logging import log
from datetime import datetime
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
    try:
        log.info(f"Received analysis request for performance {request.performance_id}")
        
        # Create analysis record
        analysis = AIAnalysis(
            performance_id=request.performance_id,
            user_id=request.user_id,
            audio_url=request.audio_url,
            video_url=request.video_url,
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
            request.audio_url,
            request.video_url,
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
        authenticity_result = db.query(AuthenticityResult).filter(AuthenticityResult.analysis_id == analysis_id).first()
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
            authenticity_result=authenticity_result,
            skill_prediction=skill_prediction
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error getting analysis result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def process_analysis(
    analysis_id: int,
    audio_url: str,
    video_url: str,
    instrument: str,
    category: str,
    db: Session
):
    """
    Background task to process the analysis.
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
        
        # Initialize services
        audio_service = AudioAnalysisService()
        video_service = VideoAnalysisService()
        cheating_service = CheatingDetectionService()
        skill_service = SkillPredictionService()
        
        audio_features_data = None
        video_features_data = None
        
        # Process audio if available
        if audio_url:
            try:
                log.info(f"Processing audio for analysis {analysis_id}")
                audio_features_data = audio_service.analyze_audio(audio_url)
                
                # Save audio features to database
                audio_features = AudioFeatures(
                    analysis_id=analysis_id,
                    duration=audio_features_data.get('duration'),
                    sample_rate=audio_features_data.get('sample_rate'),
                    spectral_centroid_mean=audio_features_data.get('spectral_centroid_mean'),
                    spectral_centroid_std=audio_features_data.get('spectral_centroid_std'),
                    spectral_bandwidth_mean=audio_features_data.get('spectral_bandwidth_mean'),
                    spectral_bandwidth_std=audio_features_data.get('spectral_bandwidth_std'),
                    spectral_rolloff_mean=audio_features_data.get('spectral_rolloff_mean'),
                    spectral_rolloff_std=audio_features_data.get('spectral_rolloff_std'),
                    mfcc_mean=json.dumps(audio_features_data.get('mfcc_mean', [])),
                    mfcc_std=json.dumps(audio_features_data.get('mfcc_std', [])),
                    chroma_mean=json.dumps(audio_features_data.get('chroma_mean', [])),
                    chroma_std=json.dumps(audio_features_data.get('chroma_std', [])),
                    tempo=audio_features_data.get('tempo'),
                    tempo_confidence=audio_features_data.get('tempo_confidence'),
                    rms_mean=audio_features_data.get('rms_mean'),
                    rms_std=audio_features_data.get('rms_std'),
                    zero_crossing_rate_mean=audio_features_data.get('zero_crossing_rate_mean'),
                    zero_crossing_rate_std=audio_features_data.get('zero_crossing_rate_std'),
                    key=audio_features_data.get('key'),
                    scale=audio_features_data.get('scale')
                )
                db.add(audio_features)
                db.commit()

            except Exception as e:
                # Without audio there is nothing to report: fail the analysis visibly
                # instead of marking it COMPLETED with empty results.
                log.error(f"Error processing audio: {e}")
                raise RuntimeError(f"Could not analyse the audio: {e}") from e

        # Process video if available
        if video_url:
            try:
                log.info(f"Processing video for analysis {analysis_id}")
                video_features_data = video_service.analyze_video(video_url)
                
            except Exception as e:
                log.error(f"Error processing video: {e}")
        
        # Perform authenticity analysis
        if audio_features_data:
            try:
                log.info(f"Performing authenticity analysis for analysis {analysis_id}")
                authenticity_data = cheating_service.analyze_authenticity(audio_features_data, video_features_data)
                
                # Save authenticity result
                authenticity_result = AuthenticityResult(
                    analysis_id=analysis_id,
                    authenticity_score=authenticity_data.get('authenticity_score'),
                    confidence=authenticity_data.get('confidence'),
                    is_live_performance=authenticity_data.get('is_live_performance'),
                    is_pre_recorded=authenticity_data.get('is_pre_recorded'),
                    has_suspicious_patterns=authenticity_data.get('has_suspicious_patterns'),
                    audio_consistency_score=authenticity_data.get('audio_consistency_score'),
                    video_consistency_score=authenticity_data.get('video_consistency_score'),
                    timing_anomalies_count=authenticity_data.get('timing_anomalies_count'),
                    findings=json.dumps(authenticity_data.get('findings', []))
                )
                db.add(authenticity_result)
                db.commit()
                
            except Exception as e:
                log.error(f"Error in authenticity analysis: {e}")
        
        # Perform skill prediction
        if audio_features_data:
            try:
                log.info(f"Performing skill prediction for analysis {analysis_id}")
                skill_data = skill_service.predict_skill_level(audio_features_data, video_features_data)
                
                # Save skill prediction
                skill_prediction = SkillPrediction(
                    analysis_id=analysis_id,
                    predicted_level=skill_data.get('predicted_level'),
                    confidence=skill_data.get('confidence'),
                    pitch_accuracy=skill_data.get('pitch_accuracy'),
                    rhythm_accuracy=skill_data.get('rhythm_accuracy'),
                    timing_precision=skill_data.get('timing_precision'),
                    technique_score=skill_data.get('technique_score'),
                    musicality_score=skill_data.get('musicality_score'),
                    percentile_rank=skill_data.get('percentile_rank'),
                    strengths=json.dumps(skill_data.get('strengths', [])),
                    weaknesses=json.dumps(skill_data.get('weaknesses', [])),
                    improvement_areas=json.dumps(skill_data.get('improvement_areas', []))
                )
                db.add(skill_prediction)
                db.commit()
                
            except Exception as e:
                log.error(f"Error in skill prediction: {e}")
        
        # Update status to COMPLETED
        analysis.status = AnalysisStatus.COMPLETED
        analysis.processing_completed_at = datetime.utcnow()
        db.commit()
        
        log.info(f"Analysis {analysis_id} completed successfully")
        
    except Exception as e:
        log.error(f"Error processing analysis {analysis_id}: {e}")
        
        # Update status to FAILED
        try:
            analysis = db.query(AIAnalysis).filter(AIAnalysis.id == analysis_id).first()
            if analysis:
                analysis.status = AnalysisStatus.FAILED
                analysis.error_message = str(e)
                db.commit()
        except:
            pass
