from typing import Dict, Any, List
import numpy as np
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
            
            # Extract additional features from frames
            features = self._extract_frame_features(frames)
            
            # Combine metadata and features
            result = {
                'metadata': metadata,
                'frame_features': features,
                'frame_count': len(frames),
                'analysis_method': 'opencv',
                'preprocessing_applied': True
            }
            
            log.info("Video analysis completed successfully")
            return result
            
        except Exception as e:
            log.error(f"Video analysis failed: {e}")
            raise
    
    def _extract_frame_features(self, frames: List) -> Dict[str, Any]:
        """Extract features from processed frames."""
        try:
            log.info("Extracting features from frames")
            features = {
                'face_detections': [],
                'hand_detections': [],
                'body_poses': []
            }
            
            # Process a sample of frames for performance
            sample_size = min(len(frames), 30)
            sample_indices = [i * (len(frames) // sample_size) for i in range(sample_size)]
            
            for idx in sample_indices:
                frame = frames[idx]
                
                # Convert back to uint8 for detection
                frame_uint8 = (frame * 255).astype(np.uint8)
                
                # Detect faces (placeholder)
                faces = self.preprocessor.detect_faces(frame_uint8)
                if faces:
                    features['face_detections'].extend(faces)
                
                # Detect hands (placeholder)
                hands = self.preprocessor.detect_hands(frame_uint8)
                if hands:
                    features['hand_detections'].extend(hands)
                
                # Detect body pose (placeholder)
                pose = self.preprocessor.detect_body_pose(frame_uint8)
                if pose:
                    features['body_poses'].append(pose)
            
            log.info(f"Extracted features from {sample_size} frames")
            return features
            
        except Exception as e:
            log.error(f"Error extracting frame features: {e}")
            return {}
    
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
