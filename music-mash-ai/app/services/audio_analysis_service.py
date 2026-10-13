from typing import Any, Dict, Optional
from app.services.audio.audio_preprocessing import AudioPreprocessor
from app.services.audio.metrics import analyze_performance
from app.utils.logging import log


class AudioAnalysisService:
    """Service for audio analysis operations."""

    def __init__(self):
        self.preprocessor = AudioPreprocessor()

    def analyze_audio(self, audio_url: str, instrument: Optional[str] = None) -> Dict[str, Any]:
        """
        Load an audio file and measure it.

        Args:
            audio_url: Path to the audio file
            instrument: Instrument name, used to pick the pitch search range

        Returns:
            Flat dict of measured metrics (see PerformanceMetrics.to_flat_dict), including
            ``notes`` and ``unavailable_reasons``.
        """
        log.info(f"Starting audio analysis for: {audio_url}")
        y, sr = self.preprocessor.preprocess(audio_url)
        metrics = analyze_performance(y, sr, instrument).to_flat_dict()
        log.info("Audio analysis completed successfully")
        return metrics

    def validate_audio_file(self, audio_url: str) -> bool:
        """
        Validate if the audio file is valid and can be processed.

        Args:
            audio_url: URL or path to audio file

        Returns:
            True if valid, False otherwise
        """
        try:
            log.info(f"Validating audio file: {audio_url}")
            y, sr = self.preprocessor.load_audio(audio_url)

            # Check if audio has content
            if len(y) == 0:
                log.warning("Audio file is empty")
                return False

            log.info("Audio file validation passed")
            return True

        except Exception as e:
            log.error(f"Audio file validation failed: {e}")
            return False
