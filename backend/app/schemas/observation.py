from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class LocalizedText(BaseModel):
    en: str
    bn: str

class ObservationCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    date: str
    kind: str = "note"
    title_en: str = Field(..., alias="titleEn")
    title_bn: str = Field(..., alias="titleBn")
    detail_en: Optional[str] = Field(None, alias="detailEn")
    detail_bn: Optional[str] = Field(None, alias="detailBn")

class ObservationOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    farm_id: str = Field(..., alias="farmId")
    date: str
    kind: str
    title: LocalizedText
    detail: Optional[LocalizedText] = None

class ActivityItemOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    at: str
    kind: str
    text: LocalizedText
