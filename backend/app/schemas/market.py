from typing import List
from pydantic import BaseModel

class CommodityPriceOut(BaseModel):
    crop: str
    nameEn: str
    nameBn: str
    market: str
    unit: str
    wholesalePrice: float
    retailPrice: float
    trend: str  # up, down, stable
    updatedAt: str

class MarketOverviewOut(BaseModel):
    source: str
    updatedAt: str
    commodities: List[CommodityPriceOut]
