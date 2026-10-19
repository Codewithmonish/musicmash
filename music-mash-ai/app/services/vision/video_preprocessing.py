import cv2
import numpy as np
from typing import Tuple, Dict, Any, List
from app.utils.logging import log


class VideoPreprocessor:
    """Video preprocessing pipeline for music performance analysis."""
    
    def __init__(self, target_size: Tuple[int, int] = (224, 224)):
        self.target_size = target_size
        self.fps = 30
    
    def load_video(self, video_path: str) -> cv2.VideoCapture:
        """Load video file and return VideoCapture object."""
        try:
            log.info(f"Loading video from: {video_path}")
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                raise ValueError(f"Could not open video file: {video_path}")
            
            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            log.info(f"Video loaded. FPS: {fps}, Frames: {frame_count}, Resolution: {width}x{height}")
            return cap
            
        except Exception as e:
            log.error(f"Error loading video: {e}")
            raise
    
    def extract_frames(self, cap: cv2.VideoCapture, max_frames: int = 300) -> List[np.ndarray]:
        """Extract frames from video at regular intervals."""
        try:
            log.info("Extracting frames from video")
            frames = []
            
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            # Calculate frame interval to get max_frames evenly distributed
            if total_frames > max_frames:
                interval = total_frames // max_frames
            else:
                interval = 1
            
            frame_idx = 0
            extracted_count = 0
            
            while cap.isOpened() and extracted_count < max_frames:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                
                if not ret:
                    break
                
                frames.append(frame)
                extracted_count += 1
                frame_idx += interval
            
            log.info(f"Extracted {len(frames)} frames from video")
            return frames
            
        except Exception as e:
            log.error(f"Error extracting frames: {e}")
            raise
        finally:
            cap.release()
    
    def resize_frame(self, frame: np.ndarray) -> np.ndarray:
        """Resize frame to target size."""
        try:
            resized = cv2.resize(frame, self.target_size)
            return resized
        except Exception as e:
            log.error(f"Error resizing frame: {e}")
            raise
    
    def normalize_frame(self, frame: np.ndarray) -> np.ndarray:
        """Normalize frame pixel values to [0, 1]."""
        try:
            normalized = frame.astype(np.float32) / 255.0
            return normalized
        except Exception as e:
            log.error(f"Error normalizing frame: {e}")
            raise
    
    def extract_video_metadata(self, cap: cv2.VideoCapture) -> Dict[str, Any]:
        """Extract metadata from video."""
        try:
            log.info("Extracting video metadata")
            metadata = {
                'fps': cap.get(cv2.CAP_PROP_FPS),
                'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
                'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
                'duration': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) / cap.get(cv2.CAP_PROP_FPS)
            }
            log.info(f"Video metadata extracted: {metadata}")
            return metadata
        except Exception as e:
            log.error(f"Error extracting video metadata: {e}")
            raise
    
    def preprocess(self, video_path: str, max_frames: int = 300) -> Tuple[List[np.ndarray], Dict[str, Any]]:
        """Complete preprocessing pipeline."""
        try:
            log.info(f"Starting video preprocessing pipeline for: {video_path}")
            
            # Load video
            cap = self.load_video(video_path)
            
            # Extract metadata
            metadata = self.extract_video_metadata(cap)
            
            # Extract frames
            frames = self.extract_frames(cap, max_frames)
            
            # Process frames
            processed_frames = []
            for frame in frames:
                # Resize
                resized = self.resize_frame(frame)
                # Normalize
                normalized = self.normalize_frame(resized)
                processed_frames.append(normalized)
            
            log.info("Video preprocessing completed successfully")
            return processed_frames, metadata
            
        except Exception as e:
            log.error(f"Video preprocessing failed: {e}")
            raise
