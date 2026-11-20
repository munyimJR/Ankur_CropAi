from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.weather_service import weather_service
from app.services.satellite_service import satellite_service
from app.routers.farms import resolve_farm_coords

router = APIRouter(tags=["Field Intelligence Overview"])

@router.get("/farms/{farm_id}/overview")
async def get_farm_overview(farm_id: str, db: Session = Depends(get_db)):
    lat, lng = resolve_farm_coords(farm_id, db)
    weather = await weather_service.get_climate_overview(farm_id, lat, lng)
    
    # Simple transparent water balance prototype:
    # rainfall in past 24h vs approximate daily evapotranspiration (~3.5 mm in BD winter, 5.0 mm in summer)
    et0 = 4.0
    rain_24h = weather.current.rainMm24h
    balance_deficit = et0 - rain_24h

    irrigation_advice = {
        "status": "sufficient" if balance_deficit <= 0 else "irrigate_soon" if balance_deficit > 8.0 else "monitor",
        "balanceDeficitMm": round(balance_deficit, 1),
        "disclaimer": (
            "Transparent water-balance estimate based on Open-Meteo precipitation and reference evapotranspiration. "
            "Real-time calibrated soil moisture sensors and actual pump run logs are currently unconfigured."
        )
    }

    satellite = satellite_service.get_field_satellite_status(farm_id, lat, lng)

    return {
        "farmId": farm_id,
        "coordinates": {"lat": lat, "lng": lng},
        "weatherSummary": weather.current,
        "irrigationGuidance": irrigation_advice,
        "satellite": satellite,
        "connectedDomain": "Ankur Precision Farm Core",
        "tagline": "Growing with you."
    }

@router.get("/farms/{farm_id}/satellite")
def get_satellite_status(farm_id: str, db: Session = Depends(get_db)):
    lat, lng = resolve_farm_coords(farm_id, db)
    return satellite_service.get_field_satellite_status(farm_id, lat, lng)
