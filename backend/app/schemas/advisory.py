from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class AdvisoryQuestion(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query: str
    crop: Optional[str] = "rice"
    farm_id: Optional[str] = Field(None, alias="farmId")
    lang: str = "en"

class AdvisorReplyOut(BaseModel):
    id: str
    topic: str
    title: str
    body: str
    bullets: List[str]
    caution: str
    followUps: List[str]
    kind: str = "general"
    sourceCitations: List[str] = []
