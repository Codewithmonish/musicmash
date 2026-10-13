import librosa
import numpy as np
import soundfile as sf
from typing import Tuple, Dict, Any
from app.utils.logging import log


class AudioPreprocessor:
    """Audio preprocessing pipeline for music analysis."""
    
    def __init__(self, sample_rate: int = 22050):
        self.sample_rate = sample_rate
        self.hop_length = 512
        self.n_fft = 2048
        self.n_mels = 128
    
    def load_audio(self, audio_path: str) -> Tuple[np.ndarray, int]:
        """Load audio file and return audio data with sample rate."""
        try:
            log.info(f"Loading audio from: {audio_path}")
            y, sr = librosa.load(audio_path, sr=self.sample_rate)
            log.info(f"Audio loaded successfully. Duration: {len(y)/sr:.2f}s, Sample rate: {sr}")
            return y, sr
        except Exception as e:
            log.error(f"Error loading audio: {e}")
            raise
    
    def remove_silence(self, y: np.ndarray, threshold: float = 0.01) -> np.ndarray:
        """Remove silence from audio using threshold."""
        try:
            log.info("Removing silence from audio")
            # Compute short-time energy
            frame_length = 2048
            hop_length = 512
            
            # Trim silence
            y_trimmed, _ = librosa.effects.trim(
                y, 
                top_db=20,
                frame_length=frame_length,
                hop_length=hop_length
            )
            
            log.info(f"Silence removed. Original length: {len(y)}, Trimmed length: {len(y_trimmed)}")
            return y_trimmed
        except Exception as e:
            log.error(f"Error removing silence: {e}")
            raise
    
    def normalize_audio(self, y: np.ndarray) -> np.ndarray:
        """Normalize audio to [-1, 1] range."""
        try:
            log.info("Normalizing audio")
            max_val = np.max(np.abs(y))
            if max_val > 0:
                y_normalized = y / max_val
            else:
                y_normalized = y
            log.info(f"Audio normalized. Max value: {np.max(np.abs(y_normalized))}")
            return y_normalized
        except Exception as e:
            log.error(f"Error normalizing audio: {e}")
            raise
    
    def extract_features(self, y: np.ndarray, sr: int) -> Dict[str, Any]:
        """Extract comprehensive audio features."""
        try:
            log.info("Extracting audio features")
            features = {}
            
            # Basic features
            features['duration'] = len(y) / sr
            features['sample_rate'] = sr
            
            # Spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=self.hop_length)[0]
            features['spectral_centroid_mean'] = float(np.mean(spectral_centroids))
            features['spectral_centroid_std'] = float(np.std(spectral_centroids))
            
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr, hop_length=self.hop_length)[0]
            features['spectral_bandwidth_mean'] = float(np.mean(spectral_bandwidth))
            features['spectral_bandwidth_std'] = float(np.std(spectral_bandwidth))
            
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, hop_length=self.hop_length)[0]
            features['spectral_rolloff_mean'] = float(np.mean(spectral_rolloff))
            features['spectral_rolloff_std'] = float(np.std(spectral_rolloff))
            
            # MFCC features
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=self.hop_length)
            features['mfcc_mean'] = np.mean(mfccs, axis=1).tolist()
            features['mfcc_std'] = np.std(mfccs, axis=1).tolist()
            
            # Chroma features
            chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=self.hop_length)
            features['chroma_mean'] = np.mean(chroma, axis=1).tolist()
            features['chroma_std'] = np.std(chroma, axis=1).tolist()
            
            # Tempo and rhythm
            tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=self.hop_length)
            features['tempo'] = float(tempo)
            features['tempo_confidence'] = float(len(beat_frames) / (len(y) / sr / 60))
            
            # Energy features
            rms = librosa.feature.rms(y=y, hop_length=self.hop_length)[0]
            features['rms_mean'] = float(np.mean(rms))
            features['rms_std'] = float(np.std(rms))
            
            zero_crossing_rate = librosa.feature.zero_crossing_rate(y, hop_length=self.hop_length)[0]
            features['zero_crossing_rate_mean'] = float(np.mean(zero_crossing_rate))
            features['zero_crossing_rate_std'] = float(np.std(zero_crossing_rate))
            
            # Tonality
            key, scale = self._detect_key(y, sr)
            features['key'] = key
            features['scale'] = scale
            
            log.info("Audio features extracted successfully")
            return features
            
        except Exception as e:
            log.error(f"Error extracting features: {e}")
            raise
    
    def _detect_key(self, y: np.ndarray, sr: int) -> Tuple[str, str]:
        """Detect musical key and scale (placeholder for future implementation)."""
        # This is a simplified version - full implementation would use chroma analysis
        try:
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)
            chroma_mean = np.mean(chroma, axis=1)
            key_idx = np.argmax(chroma_mean)
            
            keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            scale = 'major'  # Simplified - would need minor/major detection
            
            return keys[key_idx], scale
        except:
            return 'C', 'major'
    
    def preprocess(self, audio_path: str) -> Tuple[np.ndarray, int, Dict[str, Any]]:
        """Complete preprocessing pipeline."""
        try:
            log.info(f"Starting audio preprocessing pipeline for: {audio_path}")
            
            # Load audio
            y, sr = self.load_audio(audio_path)
            
            # Remove silence
            y = self.remove_silence(y)
            
            # Normalize
            y = self.normalize_audio(y)
            
            # Extract features
            features = self.extract_features(y, sr)
            
            log.info("Audio preprocessing completed successfully")
            return y, sr, features
            
        except Exception as e:
            log.error(f"Audio preprocessing failed: {e}")
            raise
