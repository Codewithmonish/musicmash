from typing import Dict, Any
from app.services.audio.audio_preprocessing import AudioPreprocessor
from app.utils.logging import log


class AudioAnalysisService:
    """Service for audio analysis operations."""
    
    def __init__(self):
        self.preprocessor = AudioPreprocessor()
    
    def analyze_audio(self, audio_url: str) -> Dict[str, Any]:
        """
        Analyze audio file and extract features.
        
        Args:
            audio_url: URL or path to audio file
            
        Returns:
            Dictionary containing extracted audio features
        """
        try:
            log.info(f"Starting audio analysis for: {audio_url}")
            
            # Preprocess audio
            y, sr, features = self.preprocessor.preprocess(audio_url)
            
            # Store additional analysis results
            features['analysis_method'] = 'librosa'
            features['preprocessing_applied'] = True
            features['silence_removed'] = True
            features['normalized'] = True
            
            log.info("Audio analysis completed successfully")
            return features
            
        except Exception as e:
            log.error(f"Audio analysis failed: {e}")
            raise
    
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
            
            # Check sample rate
            if sr < 8000 or sr > 48000:
                log.warning(f"Unusual sample rate: {sr}")
            
            log.info("Audio file validation passed")
            return True
            
        except Exception as e:
            log.error(f"Audio file validation failed: {e}")
            return False
