from fastapi import HTTPException, status
from typing import Optional, Any
from app.utils.logging import log


class BaseAPIException(HTTPException):
    """Base exception for API errors."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] ==None,
        context: Optional[dict] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.context = context or {}
        log.error(f"{error_code or 'API_ERROR'}: {detail}")


class FileProcessingError(BaseAPIException):
    """Exception raised when file processing fails."""
    
    def __init__(self, detail: str = "File processing failed", context: Optional[dict] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="FILE_PROCESSING_ERROR",
            context=context
        )


class InvalidFileFormatError(BaseAPIException):
    """Exception raised for invalid file formats."""
    
    def __init__(self, detail: str = "Invalid file format", context: Optional[dict] = None):
        super().__init__(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=detail,
            error_code="INVALID_FILE_FORMAT",
            context=context
        )


class AnalysisNotFoundError(BaseAPIException):
    """Exception raised when analysis is not found."""
    
    def __init__(self, analysis_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with ID {analysis_id} not found",
            error_code="ANALYSIS_NOT_FOUND",
            context={"analysis_id": analysis_id}
        )


class AnalysisAlreadyCompletedError(BaseAPIException):
    """Exception raised when trying to modify a completed analysis."""
    
    def __init__(self, analysis_id: int):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Analysis {analysis_id} is already completed",
            error_code="ANALYSIS_ALREADY_COMPLETED",
            context={"analysis_id": analysis_id}
        )


class ModelLoadError(BaseAPIException):
    """Exception raised when model loading fails."""
    
    def __init__(self, model_name: str, detail: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail or f"Failed to load model: {model_name}",
            error_code="MODEL_LOAD_ERROR",
            context={"model_name": model_name}
        )


class ModelPredictionError(BaseAPIException):
    """Exception raised when model prediction fails."""
    
    def __init__(self, model_name: str, detail: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail or f"Model prediction failed: {model_name}",
            error_code="MODEL_PREDICTION_ERROR",
            context={"model_name": model_name}
        )


class DatabaseError(BaseAPIException):
    """Exception raised for database errors."""
    
    def __init__(self, detail: str = "Database operation failed", context: Optional[dict] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="DATABASE_ERROR",
            context=context
        )


class ValidationError(BaseAPIException):
    """Exception raised for validation errors."""
    
    def __init__(self, detail: str = "Validation failed", context: Optional[dict] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="VALIDATION_ERROR",
            context=context
        )


class TimeoutError(BaseAPIException):
    """Exception raised when operation times out."""
    
    def __init__(self, operation: str, timeout: int):
        super().__init__(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Operation '{operation}' timed out after {timeout} seconds",
            error_code="TIMEOUT_ERROR",
            context={"operation": operation, "timeout": timeout}
        )


class ExternalServiceError(BaseAPIException):
    """Exception raised when external service call fails."""
    
    def __init__(self, service: str, detail: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail or f"External service '{service}' unavailable",
            error_code="EXTERNAL_SERVICE_ERROR",
            context={"service": service}
        )
