import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text, Integer
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class WeatherSnapshot(Base):
    __tablename__ = "weather_snapshots"

    id = Column(String(64), primary_key=True, default=lambda: f"ws_{uuid.uuid4().hex[:10]}")
    farm_id = Column(String(64), ForeignKey("farms.id", ondelete="CASCADE"), index=True, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    temp_c = Column(Float, nullable=False)
    feels_like_c = Column(Float, nullable=False)
    humidity = Column(Integer, nullable=False)
    wind_kph = Column(Float, nullable=False)
    rain_mm_24h = Column(Float, nullable=False)
    condition = Column(String(32), nullable=False)  # sunny, partly, cloudy, rain, storm
    raw_json = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=utcnow, nullable=False)

class ClimateAlert(Base):
    __tablename__ = "climate_alerts"

    id = Column(String(64), primary_key=True, default=lambda: f"alert_{uuid.uuid4().hex[:10]}")
    farm_id = Column(String(64), ForeignKey("farms.id", ondelete="CASCADE"), index=True, nullable=False)
    risk_type = Column(String(32), nullable=False)  # heavyRain, heat, fungal, dry
    risk_level = Column(String(16), nullable=False)  # low, moderate, high
    score = Column(Integer, nullable=False)
    message_en = Column(String(255), nullable=False)
    message_bn = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
