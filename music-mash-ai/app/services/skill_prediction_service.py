from typing import Dict, Any
from app.utils.logging import log


class SkillPredictionService:
    """Service for predicting user skill level based on performance analysis."""
    
    def __init__(self):
        pass
    
    def predict_skill_level(self, audio_features: Dict[str, Any], 
                           video_features: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Predict user's skill level based on performance features.
        
        Args:
            audio_features: Extracted audio features
            video_features: Optional extracted video features
            
        Returns:
            Dictionary containing skill prediction results
        """
        try:
            log.info("Starting skill level prediction")
            
            result = {
                'predicted_level': 'INTERMEDIATE',
                'confidence': 0.75,
                'pitch_accuracy': 0.7,
                'rhythm_accuracy': 0.75,
                'timing_precision': 0.7,
                'technique_score': 0.7,
                'musicality_score': 0.7,
                'percentile_rank': 50.0,
                'strengths': [],
                'weaknesses': [],
                'improvement_areas': []
            }
            
            # Analyze audio features for skill indicators
            if audio_features:
                audio_analysis = self._analyze_audio_skill(audio_features)
                result.update(audio_analysis)
            
            # Analyze video features if available
            if video_features:
                video_analysis = self._analyze_video_skill(video_features)
                result.update(video_analysis)
            
            # Calculate overall skill level
            result['predicted_level'] = self._determine_skill_level(result)
            result['confidence'] = self._calculate_confidence(result)
            
            # Generate strengths and weaknesses
            result['strengths'] = self._identify_strengths(result)
            result['weaknesses'] = self._identify_weaknesses(result)
            result['improvement_areas'] = self._suggest_improvements(result)
            
            log.info(f"Skill prediction completed. Level: {result['predicted_level']}")
            return result
            
        except Exception as e:
            log.error(f"Skill prediction failed: {e}")
            raise
    
    def _analyze_audio_skill(self, audio_features: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze audio features for skill indicators."""
        try:
            analysis = {}
            
            # Pitch accuracy based on spectral features
            if 'spectral_centroid_mean' in audio_features:
                centroid = audio_features['spectral_centroid_mean']
                analysis['pitch_accuracy'] = min(1.0, centroid / 5000.0)
            
            # Rhythm accuracy based on tempo consistency
            if 'tempo' in audio_features and 'tempo_confidence' in audio_features:
                tempo_conf = audio_features['tempo_confidence']
                analysis['rhythm_accuracy'] = min(1.0, tempo_conf)
            
            # Timing precision based on zero crossing rate
            if 'zero_crossing_rate_mean' in audio_features:
                zcr = audio_features['zero_crossing_rate_mean']
                analysis['timing_precision'] = min(1.0, zcr * 10)
            
            # Technique score based on RMS energy
            if 'rms_mean' in audio_features:
                rms = audio_features['rms_mean']
                analysis['technique_score'] = min(1.0, rms * 2)
            
            # Musicality based on chroma features
            if 'chroma_mean' in audio_features:
                chroma = audio_features['chroma_mean']
                if chroma:
                    analysis['musicality_score'] = 0.7  # Placeholder
            
            return analysis
            
        except Exception as e:
            log.error(f"Error analyzing audio skill: {e}")
            return {}
    
    def _analyze_video_skill(self, video_features: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze video features for skill indicators."""
        try:
            analysis = {}
            
            # Check for hand detections (instrument technique)
            if 'hand_detections' in video_features:
                hand_count = len(video_features['hand_detections'])
                if hand_count > 0:
                    analysis['technique_score'] = min(1.0, analysis.get('technique_score', 0) + 0.2)
            
            # Check for body pose (posture and technique)
            if 'body_poses' in video_features:
                pose_count = len(video_features['body_poses'])
                if pose_count > 0:
                    analysis['technique_score'] = min(1.0, analysis.get('technique_score', 0) + 0.1)
            
            return analysis
            
        except Exception as e:
            log.error(f"Error analyzing video skill: {e}")
            return {}
    
    def _determine_skill_level(self, result: Dict[str, Any]) -> str:
        """Determine overall skill level based on scores."""
        try:
            # Calculate average score
            scores = [
                result.get('pitch_accuracy', 0.5),
                result.get('rhythm_accuracy', 0.5),
                result.get('timing_precision', 0.5),
                result.get('technique_score', 0.5),
                result.get('musicality_score', 0.5)
            ]
            avg_score = sum(scores) / len(scores)
            
            # Determine level based on average
            if avg_score < 0.3:
                return 'BEGINNER'
            elif avg_score < 0.5:
                return 'INTERMEDIATE'
            elif avg_score < 0.7:
                return 'ADVANCED'
            elif avg_score < 0.9:
                return 'EXPERT'
            else:
                return 'MASTER'
                
        except Exception as e:
            log.error(f"Error determining skill level: {e}")
            return 'INTERMEDIATE'
    
    def _calculate_confidence(self, result: Dict[str, Any]) -> float:
        """Calculate confidence in the prediction."""
        try:
            # Confidence based on consistency of scores
            scores = [
                result.get('pitch_accuracy', 0.5),
                result.get('rhythm_accuracy', 0.5),
                result.get('timing_precision', 0.5),
                result.get('technique_score', 0.5),
                result.get('musicality_score', 0.5)
            ]
            
            if len(scores) == 0:
                return 0.5
            
            # Calculate standard deviation
            mean = sum(scores) / len(scores)
            variance = sum((x - mean) ** 2 for x in scores) / len(scores)
            std_dev = variance ** 0.5
            
            # Lower standard deviation = higher confidence
            confidence = 1.0 - min(1.0, std_dev)
            return round(confidence, 2)
            
        except Exception as e:
            log.error(f"Error calculating confidence: {e}")
            return 0.5
    
    def _identify_strengths(self, result: Dict[str, Any]) -> list:
        """Identify user's strengths based on scores."""
        strengths = []
        
        if result.get('pitch_accuracy', 0) > 0.7:
            strengths.append('Strong pitch accuracy')
        if result.get('rhythm_accuracy', 0) > 0.7:
            strengths.append('Good rhythmic consistency')
        if result.get('timing_precision', 0) > 0.7:
            strengths.append('Precise timing')
        if result.get('technique_score', 0) > 0.7:
            strengths.append('Solid technique')
        if result.get('musicality_score', 0) > 0.7:
            strengths.append('Good musical expression')
        
        return strengths if strengths else ['Consistent performance']
    
    def _identify_weaknesses(self, result: Dict[str, Any]) -> list:
        """Identify user's weaknesses based on scores."""
        weaknesses = []
        
        if result.get('pitch_accuracy', 1) < 0.5:
            weaknesses.append('Pitch accuracy needs improvement')
        if result.get('rhythm_accuracy', 1) < 0.5:
            weaknesses.append('Rhythm consistency needs work')
        if result.get('timing_precision', 1) < 0.5:
            weaknesses.append('Timing precision needs attention')
        if result.get('technique_score', 1) < 0.5:
            weaknesses.append('Technique needs development')
        if result.get('musicality_score', 1) < 0.5:
            weaknesses.append('Musical expression could be enhanced')
        
        return weaknesses if weaknesses else ['Continue practicing to improve']
    
    def _suggest_improvements(self, result: Dict[str, Any]) -> list:
        """Suggest areas for improvement."""
        improvements = []
        
        if result.get('pitch_accuracy', 1) < 0.6:
            improvements.append('Practice scales and intervals')
        if result.get('rhythm_accuracy', 1) < 0.6:
            improvements.append('Use metronome for rhythm practice')
        if result.get('timing_precision', 1) < 0.6:
            improvements.append('Practice with backing tracks')
        if result.get('technique_score', 1) < 0.6:
            improvements.append('Work on technical exercises')
        if result.get('musicality_score', 1) < 0.6:
            improvements.append('Study dynamics and phrasing')
        
        return improvements if improvements else ['Continue current practice routine']
