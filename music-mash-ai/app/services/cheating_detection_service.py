from typing import Dict, Any
from app.utils.logging import log


class CheatingDetectionService:
    """Service for detecting authenticity and potential cheating in performances."""
    
    def __init__(self):
        pass
    
    def analyze_authenticity(self, audio_features: Dict[str, Any], 
                            video_features: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Analyze performance authenticity and detect potential cheating.
        
        Args:
            audio_features: Extracted audio features
            video_features: Optional extracted video features
            
        Returns:
            Dictionary containing authenticity analysis results
        """
        try:
            log.info("Starting authenticity analysis")
            
            result = {
                'authenticity_score': 0.0,
                'confidence': 0.0,
                'is_live_performance': 1,
                'is_pre_recorded': 0,
                'has_suspicious_patterns': 0,
                'audio_consistency_score': 0.0,
                'video_consistency_score': 0.0,
                'timing_anomalies_count': 0,
                'findings': []
            }
            
            # Analyze audio consistency
            audio_score = self._analyze_audio_consistency(audio_features)
            result['audio_consistency_score'] = audio_score
            
            # Analyze video consistency if available
            if video_features:
                video_score = self._analyze_video_consistency(video_features)
                result['video_consistency_score'] = video_score
            
            # Calculate overall authenticity score
            result['authenticity_score'] = self._calculate_overall_score(result)
            result['confidence'] = self._calculate_confidence(result)
            
            # Determine flags
            result['is_live_performance'] = 1 if result['authenticity_score'] > 0.7 else 0
            result['is_pre_recorded'] = 1 if result['authenticity_score'] < 0.3 else 0
            result['has_suspicious_patterns'] = 1 if result['authenticity_score'] < 0.5 else 0
            
            # Generate findings
            result['findings'] = self._generate_findings(result)
            
            log.info(f"Authenticity analysis completed. Score: {result['authenticity_score']}")
            return result
            
        except Exception as e:
            log.error(f"Authenticity analysis failed: {e}")
            raise
    
    def _analyze_audio_consistency(self, audio_features: Dict[str, Any]) -> float:
        """Analyze audio for consistency and authenticity."""
        try:
            score = 0.8  # Default score for placeholder
            
            # Check for suspicious patterns in audio features
            if 'rms_mean' in audio_features:
                rms = audio_features['rms_mean']
                if rms < 0.01 or rms > 0.9:
                    score -= 0.2
            
            if 'tempo' in audio_features:
                tempo = audio_features['tempo']
                if tempo < 40 or tempo > 200:
                    score -= 0.1
            
            # Ensure score is within valid range
            score = max(0.0, min(1.0, score))
            return score
            
        except Exception as e:
            log.error(f"Error analyzing audio consistency: {e}")
            return 0.5
    
    def _analyze_video_consistency(self, video_features: Dict[str, Any]) -> float:
        """Analyze video for consistency and authenticity."""
        try:
            score = 0.8  # Default score for placeholder
            
            # Check for suspicious patterns in video features
            if 'frame_count' in video_features:
                frame_count = video_features['frame_count']
                if frame_count < 30:
                    score -= 0.3
            
            # Check for face/hand detections
            if 'face_detections' in video_features:
                face_count = len(video_features['face_detections'])
                if face_count == 0:
                    score -= 0.2
            
            # Ensure score is within valid range
            score = max(0.0, min(1.0, score))
            return score
            
        except Exception as e:
            log.error(f"Error analyzing video consistency: {e}")
            return 0.5
    
    def _calculate_overall_score(self, result: Dict[str, Any]) -> float:
        """Calculate overall authenticity score."""
        try:
            audio_weight = 0.6
            video_weight = 0.4
            
            if result['video_consistency_score'] == 0:
                video_weight = 0
                audio_weight = 1.0
            
            overall = (result['audio_consistency_score'] * audio_weight + 
                      result['video_consistency_score'] * video_weight)
            
            return round(overall, 2)
            
        except Exception as e:
            log.error(f"Error calculating overall score: {e}")
            return 0.5
    
    def _calculate_confidence(self, result: Dict[str, Any]) -> float:
        """Calculate confidence in the authenticity score."""
        try:
            # Confidence based on consistency between audio and video
            if result['video_consistency_score'] > 0:
                diff = abs(result['audio_consistency_score'] - result['video_consistency_score'])
                confidence = 1.0 - diff
            else:
                confidence = result['audio_consistency_score']
            
            return round(max(0.0, min(1.0, confidence)), 2)
            
        except Exception as e:
            log.error(f"Error calculating confidence: {e}")
            return 0.5
    
    def _generate_findings(self, result: Dict[str, Any]) -> list:
        """Generate textual findings based on analysis."""
        findings = []
        
        if result['authenticity_score'] > 0.8:
            findings.append("Performance appears authentic with high confidence")
        elif result['authenticity_score'] > 0.5:
            findings.append("Performance appears mostly authentic with some uncertainty")
        else:
            findings.append("Performance shows signs of potential issues")
        
        if result['audio_consistency_score'] < 0.5:
            findings.append("Audio shows some inconsistencies")
        
        if result['video_consistency_score'] < 0.5:
            findings.append("Video shows some inconsistencies")
        
        return findings
