from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os

class Settings:
    # App
    APP_NAME: str = "PR-Alert ML Service"
    VERSION: str = "0.1.0"
    DEBUG: bool = True
    
    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_PREFIX: str = "/api/v1"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Model storage
    MODEL_DIR: str = "./models"
    MODEL_REGISTRY_URL: Optional[str] = None
    
    # External services
    REDIS_URL: str = "redis://localhost:6379"
    API_SERVICE_URL: str = "http://localhost:3001"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Model settings
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.5
    BATCH_SIZE: int = 32
    MAX_BATCH_SIZE: int = 128

settings = Settings()