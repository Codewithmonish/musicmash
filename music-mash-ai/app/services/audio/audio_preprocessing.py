import librosa
import numpy as np
from typing import Tuple
from app.utils.logging import log


class AudioPreprocessor:
    """Loads a recording and prepares it for app/services/audio/metrics.py.

    Only two steps, both reversible in meaning:
    1. Load as mono at a fixed sample rate (22 050 Hz), so frame sizes mean the same thing
       for every file.
    2. Trim leading and trailing silence (quieter than 40 dB below the peak), so dead air
       before the first note does not dilute voiced_ratio.

    The level is NOT normalised, so mean_rms_dbfs reflects the recording as uploaded.
    """

    def __init__(self, sample_rate: int = 22050, trim_top_db: float = 40.0):
        self.sample_rate = sample_rate
        self.trim_top_db = trim_top_db

    def load_audio(self, audio_path: str) -> Tuple[np.ndarray, int]:
        """Load an audio file as mono float32 at self.sample_rate."""
        log.info(f"Loading audio from: {audio_path}")
        y, sr = librosa.load(audio_path, sr=self.sample_rate, mono=True)
        log.info(f"Audio loaded. Duration: {len(y) / sr:.2f}s, Sample rate: {sr}")
        return y, sr

    def trim_silence(self, y: np.ndarray) -> np.ndarray:
        """Remove leading and trailing silence; silence inside the take is kept."""
        if len(y) == 0:
            return y
        y_trimmed, _ = librosa.effects.trim(y, top_db=self.trim_top_db)
        log.info(f"Trimmed silence: {len(y)} -> {len(y_trimmed)} samples")
        return y_trimmed

    def preprocess(self, audio_path: str) -> Tuple[np.ndarray, int]:
        """Load and trim; returns (signal, sample_rate)."""
        y, sr = self.load_audio(audio_path)
        return self.trim_silence(y), sr
