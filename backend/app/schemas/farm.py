from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class FarmCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=2, max_length=60)
    crop: str = Field("rice")
    district_id: str = Field(..., alias="districtId")
    area_acres: float = Field(..., gt=0, le=500, alias="areaAcres")
    planting_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", alias="plantingDate")
    notes: Optional[str] = Field(None, max_length=280)

class FarmUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = Field(None, min_length=2, max_length=60)
    crop: Optional[str] = None
    district_id: Optional[str] = Field(None, alias="districtId")
    area_acres: Optional[float] = Field(None, gt=0, le=500, alias="areaAcres")
    planting_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", alias="plantingDate")
    notes: Optional[str] = Field(None, max_length=280)

class FarmOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    name: str
    name_bn: Optional[str] = Field(None, alias="nameBn")
    crop: str
    district_id: str = Field(..., alias="districtId")
    lat: float
    lng: float
    area_acres: float = Field(..., alias="areaAcres")
    planting_date: str = Field(..., alias="plantingDate")
    notes: Optional[str] = None
    sample: Optional[bool] = False
    created_at: str = Field(..., alias="createdAt")

class CropCycleCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    season: str
    crop: str
    start_date: str = Field(..., alias="startDate")
    end_date: Optional[str] = Field(None, alias="endDate")
    expected_yield_tons: Optional[float] = Field(None, alias="expectedYieldTons")

class CropCycleOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    farm_id: str = Field(..., alias="farmId")
    season: str
    crop: str
    start_date: str = Field(..., alias="startDate")
    end_date: Optional[str] = Field(None, alias="endDate")
    expected_yield_tons: Optional[float] = Field(None, alias="expectedYieldTons")
    actual_yield_tons: Optional[float] = Field(None, alias="actualYieldTons")
    status: str
    created_at: str = Field(..., alias="createdAt")
