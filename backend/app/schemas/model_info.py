from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.schemas.observation import LocalizedText

class RegisteredModelOut(BaseModel):
    id: str
    name: str
    version: str
    cropType: str
    framework: str
    inputShape: str
    supportedClasses: List[LocalizedText]
    provenance: Dict[str, Any]
    isActive: bool
    createdAt: str
    activeForCrops: Optional[List[str]] = None

class ModelsRegistryResponse(BaseModel):
    models: List[RegisteredModelOut]
    activeMappings: Dict[str, str]

class TopPrediction(BaseModel):
    className: str
    probability: float

class ModelTestResultOut(BaseModel):
    modelId: str
    latencyMs: float
    topClass: str
    confidence: float
    topPredictions: List[TopPrediction]
