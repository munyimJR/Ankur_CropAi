from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.farm import Farm
from app.schemas.weather import ClimateOverviewOut, ClimateRiskOut
from app.services.weather_service import weather_service
from app.routers.farms import SAMPLE_FARMS

router = APIRouter(tags=["Weather & Climate Intelligence"])

def resolve_farm_coords(farm_id: str, db: Session):
    for sf in SAMPLE_FARMS:
        if sf["id"] == farm_id:
            return sf["lat"], sf["lng"]
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        # Default fallback to central Bangladesh (Bogura)
        return 24.86, 89.36
    return farm.lat, farm.lng

@router.get("/farms/{farm_id}/weather", response_model=ClimateOverviewOut)
@router.get("/fields/{farm_id}/climate", response_model=ClimateOverviewOut)
async def get_farm_weather(farm_id: str, db: Session = Depends(get_db)):
    lat, lng = resolve_farm_coords(farm_id, db)
    return await weather_service.get_climate_overview(farm_id, lat, lng)

@router.get("/farms/{farm_id}/climate-risks", response_model=List[ClimateRiskOut])
async def get_farm_climate_risks(farm_id: str, db: Session = Depends(get_db)):
    lat, lng = resolve_farm_coords(farm_id, db)
    overview = await weather_service.get_climate_overview(farm_id, lat, lng)
    return overview.risks
