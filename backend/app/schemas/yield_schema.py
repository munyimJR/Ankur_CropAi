from typing import List
from pydantic import BaseModel

class YieldPointOut(BaseModel):
    label: str
    value: float

class YieldExpectedOut(BaseModel):
    low: float
    mid: float
    high: float

class YieldOverviewOut(BaseModel):
    crop: str
    season: str
    unit: str = "t/ha"
    history: List[YieldPointOut]
    expected: YieldExpectedOut
    isDemo: bool = False
    modelMethodology: str = "BBS (Bangladesh Bureau of Statistics) & BARI Agro-Climatic Baseline"

class ScenarioEstimateInput(BaseModel):
    crop: str = "rice"
    irrigation: str = "supplemental"  # rainfed, supplemental, full
    fertilizer: str = "recommended"   # late, recommended
    sowingShiftDays: int = 0          # -14 to 14

class ScenarioEstimateOut(BaseModel):
    projectedYield: float
    baselineYield: float
    differencePercent: float
    factors: List[str]
