"""
Background jobs for Phase 3: precompute reference features, and compare a performance.

Both are plain (sync) functions on purpose: FastAPI runs sync background tasks in its thread
pool, so seconds of librosa work never block the event loop (see process_analysis).
Every step is timed in the log, because these are the slowest jobs in the service.
"""
import json
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.uploads import resolve_upload
from app.models import AIAnalysis, AnalysisStatus, Comparison, ReferenceTrack
from app.services.audio import alignment
from app.services.audio.audio_preprocessing import AudioPreprocessor
from app.services.audio.metrics import pitch_range_for
from app.utils.logging import log


@contextmanager
def timed(step: str, job: str):
    """Log how long a step took, e.g. 'comparison 3: extract performance features 41.2 s'."""
    start = time.perf_counter()
    yield
    log.info(f"{job}: {step} {time.perf_counter() - start:.1f} s")


def features_dir() -> Path:
    folder = Path(settings.REFERENCE_FEATURES_DIR).resolve()
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def extract_from_upload(file_name: str, instrument: str | None, job: str,
                        max_seconds: float) -> alignment.TrackFeatures:
    """Load an upload (mono, 22 050 Hz, edge silence trimmed) and extract comparison features,
    keeping at most ``max_seconds`` of audio."""
    preprocessor = AudioPreprocessor()
    with timed("load audio", job):
        y, sr = preprocessor.preprocess(str(resolve_upload(file_name)))
    log.info(f"{job}: {len(y) / sr:.1f} s of audio"
             + (f", cut to the first {max_seconds:.0f} s" if len(y) / sr > max_seconds else ""))
    fmin, fmax = pitch_range_for(instrument)
    with timed("extract features", job):
        return alignment.extract_features(y, sr, fmin, fmax, max_seconds=max_seconds)


def precompute_reference(reference_id: int, db: Session) -> None:
    """Compute and store a reference track's features; mark it COMPLETED or FAILED."""
    job = f"reference {reference_id}"
    reference = db.query(ReferenceTrack).filter(ReferenceTrack.id == reference_id).first()
    if reference is None:
        return
    try:
        features = extract_from_upload(reference.file_path, reference.instrument, job, alignment.MAX_SECONDS)
        path = features_dir() / f"reference_{reference_id}.npz"
        features.save(path)
        reference.features_path = str(path)
        reference.duration_s = round(features.duration_s, 2)
        reference.status = AnalysisStatus.COMPLETED
        db.commit()
    except Exception as e:
        log.error(f"{job} failed: {e}")
        db.rollback()
        reference.status = AnalysisStatus.FAILED
        reference.error_message = f"Could not analyse the reference audio: {e}"
        db.commit()


def run_comparison(comparison_id: int, db: Session) -> None:
    """Align the performance with its reference and store the result; COMPLETED or FAILED."""
    job = f"comparison {comparison_id}"
    comparison = db.query(Comparison).filter(Comparison.id == comparison_id).first()
    if comparison is None:
        return
    comparison.status = AnalysisStatus.PROCESSING
    comparison.processing_started_at = datetime.utcnow()
    db.commit()
    try:
        reference = db.query(ReferenceTrack).filter(ReferenceTrack.id == comparison.reference_id).first()
        with timed("load reference features", job):
            ref_features = alignment.TrackFeatures.load(Path(reference.features_path))
        user_features = extract_from_upload(comparison.performance_audio_file, reference.instrument, job,
                                            alignment.MAX_PERFORMANCE_SECONDS)
        with timed("align and compare", job):
            result = alignment.compare(ref_features, user_features)
        comparison.result = json.dumps(result.to_dict())
        comparison.status = AnalysisStatus.COMPLETED
        comparison.processing_completed_at = datetime.utcnow()
        db.commit()
        log.info(f"{job}: similarity {result.similarity}, {len(result.problem_sections)} problem sections")
    except Exception as e:
        log.error(f"{job} failed: {e}")
        db.rollback()
        comparison.status = AnalysisStatus.FAILED
        comparison.error_message = f"Could not compare the performance: {e}"
        db.commit()


def audio_file_of_analysis(analysis_id: int, db: Session) -> str | None:
    """The upload file name an analysis was run on (its audio, or its video's soundtrack)."""
    analysis = db.query(AIAnalysis).filter(AIAnalysis.id == analysis_id).first()
    if analysis is None:
        return None
    return analysis.audio_file or analysis.video_file
