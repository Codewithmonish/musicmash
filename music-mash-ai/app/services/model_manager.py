from typing import Dict, Any, Optional
from app.models import ModelVersion
from app.utils.logging import log
import os


class ModelManager:
    """Service for managing AI models - loading, versioning, and monitoring."""
    
    def __init__(self, model_dir: str = "./models"):
        self.model_dir = model_dir
        self.loaded_models: Dict[str, Any] = {}
        self.active_versions: Dict[str, str] = {}
        
        # Ensure model directory exists
        os.makedirs(model_dir, exist_ok=True)
    
    def load_model(self, model_name: str, version: str = "latest") -> Any:
        """
        Load a model by name and version.
        
        Args:
            model_name: Name of the model
            version: Version to load (default: latest active)
            
        Returns:
            Loaded model object
        """
        try:
            log.info(f"Loading model: {model_name}, version: {version}")
            
            # Check if already loaded
            cache_key = f"{model_name}_{version}"
            if cache_key in self.loaded_models:
                log.info(f"Model {model_name} v{version} already loaded")
                return self.loaded_models[cache_key]
            
            # For now, return None as placeholder
            # In production, this would load actual ML models
            log.warning(f"Model loading is placeholder - returning None for {model_name}")
            return None
            
        except Exception as e:
            log.error(f"Failed to load model {model_name}: {e}")
            raise
    
    def get_active_version(self, model_name: str) -> Optional[str]:
        """
        Get the active version for a model.
        
        Args:
            model_name: Name of the model
            
        Returns:
            Active version string or None
        """
        return self.active_versions.get(model_name)
    
    def set_active_version(self, model_name: str, version: str):
        """
        Set the active version for a model.
        
        Args:
            model_name: Name of the model
            version: Version to set as active
        """
        self.active_versions[model_name] = version
        log.info(f"Set active version for {model_name} to {version}")
    
    def unload_model(self, model_name: str, version: str):
        """
        Unload a model from memory.
        
        Args:
            model_name: Name of the model
            version: Version to unload
        """
        cache_key = f"{model_name}_{version}"
        if cache_key in self.loaded_models:
            del self.loaded_models[cache_key]
            log.info(f"Unloaded model {model_name} v{version}")
    
    def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """
        Get information about a model.
        
        Args:
            model_name: Name of the model
            
        Returns:
            Dictionary with model information
        """
        return {
            "name": model_name,
            "active_version": self.active_versions.get(model_name),
            "is_loaded": any(k.startswith(model_name) for k in self.loaded_models.keys()),
            "model_dir": self.model_dir
        }
    
    def list_loaded_models(self) -> list:
        """List all currently loaded models."""
        return list(self.loaded_models.keys())
    
    def clear_cache(self):
        """Clear all loaded models from memory."""
        self.loaded_models.clear()
        log.info("Cleared all loaded models from memory")
