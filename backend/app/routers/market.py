from fastapi import APIRouter
from app.schemas.market import MarketOverviewOut
from app.services.market_service import market_service

router = APIRouter(tags=["FarmMarket Intelligence"])

@router.get("/market/prices", response_model=MarketOverviewOut)
def get_market_prices():
    return market_service.get_prices()
