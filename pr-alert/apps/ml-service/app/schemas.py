from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime

class DisasterType(str, Enum):
    EARTHQUAKE = "earthquake"
    FLOOD = "flood"
    CYCLONE = "cyclone"
    WILDFIRE = "wildfire"
    LANDSLIDE = "landslide"
    HEATWAVE = "heatwave"
    TSUNAMI = "tsunami"
    AIR_QUALITY = "air_quality"

class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ALERT = "alert"
    EMERGENCY = "emergency"

class InferenceRequest(BaseModel):
    event_id: str
    disaster_type: DisasterType
    features: Dict[str, Any]
    location: Dict[str, float]  # {"lat": float, "lon": float}
    timestamp: datetime

class InferenceResponse(BaseModel):
    event_id: str
    disaster_type: DisasterType
    predicted_severity: str
    confidence: float
    risk_score: float
    predictions: Dict[str, float]
    model_version: str
    inference_time_ms: float

class BatchInferenceRequest(BaseModel):
    events: List[InferenceRequest]

class BatchInferenceResponse(BaseModel):
    results: List[InferenceResponse]
    total_processed: int
    failed: int

class ModelInfo(BaseModel):
    name: str
    version: str
    disaster_type: str
    framework: str
    metrics: Dict[str, float]
    created_at: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]

class HealthResponse(BaseModel):
    status: str
    version: str
    models_loaded: int
    gpu_available: bool
    uptime_seconds: float