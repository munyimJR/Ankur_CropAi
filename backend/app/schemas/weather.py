from typing import List, Optional
from pydantic import BaseModel

class CurrentWeatherOut(BaseModel):
    tempC: float
    feelsLikeC: float
    humidity: int
    windKph: float
    rainMm24h: float
    condition: str
    updatedAt: str
    isDemo: bool

class DailyWeatherOut(BaseModel):
    date: str
    condition: str
    maxC: float
    minC: float
    rainMm: float
    rainChance: int
    humidity: int

class ClimateRiskOut(BaseModel):
    id: str  # heavyRain, heat, fungal, dry
    level: str  # low, moderate, high
    score: int  # 0-100

class ClimateOverviewOut(BaseModel):
    farmId: str
    current: CurrentWeatherOut
    forecast: List[DailyWeatherOut]
    history: List[DailyWeatherOut]
    risks: List[ClimateRiskOut]
    isDemo: bool
    sourceAttribution: Optional[str] = "Open-Meteo Weather API (CC-BY 4.0)"
