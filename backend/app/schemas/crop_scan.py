from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.observation import LocalizedText

class CropConditionSchema(BaseModel):
    id: str
    name: LocalizedText
    category: str

class AlternativePrediction(BaseModel):
    condition: CropConditionSchema
    sampleConfidence: float

class ModelMetadataOut(BaseModel):
    name: str
    version: str
    mode: str = "api"
    license: Optional[str] = None
    dataset: Optional[str] = None

class CropAnalysisResultOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    crop: str
    condition: CropConditionSchema
    sampleConfidence: float
    alternatives: List[AlternativePrediction]
    severity: str
    guidance: List[LocalizedText]
    supportedClasses: List[LocalizedText]
    model: ModelMetadataOut
    analyzedAt: str
    isDemo: bool
    safetyNotice: str
    lowConfidence: bool = False

class FeedbackCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    is_accurate: bool = Field(..., alias="isAccurate")
    farmer_notes: Optional[str] = Field(None, alias="farmerNotes")

class FeedbackOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    scan_id: str = Field(..., alias="scanId")
    is_accurate: bool = Field(..., alias="isAccurate")
    farmer_notes: Optional[str] = Field(None, alias="farmerNotes")
    created_at: str = Field(..., alias="createdAt")
