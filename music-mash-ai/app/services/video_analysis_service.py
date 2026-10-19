from typing import Dict, Any
import cv2
from app.services.vision.video_preprocessing import VideoPreprocessor
from app.utils.logging import log


class VideoAnalysisService:
    """Service for video analysis operations."""
    
    def __init__(self):
        self.preprocessor = VideoPreprocessor()
    
    def analyze_video(self, video_url: str, max_frames: int = 300) -> Dict[str, Any]:
        """
        Analyze video file and extract features.
        
        Args:
            video_url: URL or path to video file
            max_frames: Maximum number of frames to extract
            
        Returns:
            Dictionary containing extracted video features and metadata
        """
        try:
            log.info(f"Starting video analysis for: {video_url}")
            
            # Preprocess video
            frames, metadata = self.preprocessor.preprocess(video_url, max_frames)
            
            result = {
                'metadata': metadata,
                'frame_count': len(frames),
                'analysis_method': 'opencv',
                'preprocessing_applied': True
            }
            
            log.info("Video analysis completed successfully")
            return result
            
        except Exception as e:
            log.error(f"Video analysis failed: {e}")
            raise
    
    def validate_video_file(self, video_url: str) -> bool:
        """
        Validate if the video file is valid and can be processed.
        
        Args:
            video_url: URL or path to video file
            
        Returns:
            True if valid, False otherwise
        """
        try:
            log.info(f"Validating video file: {video_url}")
            cap = self.preprocessor.load_video(video_url)
            
            # Check if video has frames
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if frame_count == 0:
                log.warning("Video file has no frames")
                cap.release()
                return False
            
            # Check FPS
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0:
                log.warning(f"Invalid FPS: {fps}")
                cap.release()
                return False
            
            cap.release()
            log.info("Video file validation passed")
            return True
            
        except Exception as e:
            log.error(f"Video file validation failed: {e}")
            return False
