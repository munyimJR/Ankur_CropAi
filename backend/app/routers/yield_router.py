from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.farm import Farm
from app.schemas.yield_schema import (
    YieldOverviewOut,
    ScenarioEstimateInput,
    ScenarioEstimateOut,
)
from app.services.yield_service import yield_service

router = APIRouter(tags=["YieldMax Forecasting"])

@router.get("/farms/{farm_id}/yield", response_model=YieldOverviewOut)
def get_farm_yield(farm_id: str, crop: Optional[str] = None, season: Optional[str] = None, db: Session = Depends(get_db)):
    if not crop:
        farm = db.query(Farm).filter(Farm.id == farm_id).first()
        crop = farm.crop if farm else "rice"
    return yield_service.get_overview(crop=crop, season=season or "aman")

@router.post("/yield/estimate", response_model=ScenarioEstimateOut)
def estimate_yield_scenario(payload: ScenarioEstimateInput):
    return yield_service.estimate_scenario(payload)
