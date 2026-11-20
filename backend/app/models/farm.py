import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Farm(Base):
    __tablename__ = "farms"

    id = Column(String(64), primary_key=True, default=lambda: f"farm_{uuid.uuid4().hex[:12]}")
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(120), nullable=False)
    name_bn = Column(String(120), nullable=True)
    crop = Column(String(32), nullable=False, default="rice")
    district_id = Column(String(64), nullable=False, default="bogura")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    area_acres = Column(Float, nullable=False, default=1.0)
    planting_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    notes = Column(Text, nullable=True)
    sample = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    owner = relationship("User", back_populates="farms")
    boundaries = relationship("FarmBoundary", back_populates="farm", cascade="all, delete-orphan")
    cycles = relationship("CropCycle", back_populates="farm", cascade="all, delete-orphan")
    observations = relationship("FieldObservation", back_populates="farm", cascade="all, delete-orphan")
    scans = relationship("CropScan", back_populates="farm", cascade="all, delete-orphan")

class FarmBoundary(Base):
    __tablename__ = "farm_boundaries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    farm_id = Column(String(64), ForeignKey("farms.id", ondelete="CASCADE"), unique=True, nullable=False)
    boundary_geojson = Column(Text, nullable=False)  # GeoJSON Polygon / MultiPolygon string
    area_sqm = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    farm = relationship("Farm", back_populates="boundaries")

class CropCycle(Base):
    __tablename__ = "crop_cycles"

    id = Column(String(64), primary_key=True, default=lambda: f"cycle_{uuid.uuid4().hex[:10]}")
    farm_id = Column(String(64), ForeignKey("farms.id", ondelete="CASCADE"), index=True, nullable=False)
    season = Column(String(32), nullable=False, default="aman")  # aus, aman, boro, rabi, etc.
    crop = Column(String(32), nullable=False, default="rice")
    start_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    end_date = Column(String(10), nullable=True)
    expected_yield_tons = Column(Float, nullable=True)
    actual_yield_tons = Column(Float, nullable=True)
    status = Column(String(32), default="active", nullable=False)  # active, completed, planned
    created_at = Column(DateTime, default=utcnow, nullable=False)

    farm = relationship("Farm", back_populates="cycles")
