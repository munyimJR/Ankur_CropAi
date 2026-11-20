import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class CropScan(Base):
    __tablename__ = "crop_scans"

    id = Column(String(64), primary_key=True, default=lambda: f"scan_{uuid.uuid4().hex[:12]}")
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    farm_id = Column(String(64), ForeignKey("farms.id", ondelete="SET NULL"), index=True, nullable=True)
    crop = Column(String(32), nullable=False)
    image_path = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    
    # Prediction details
    predicted_class = Column(String(120), nullable=False)
    predicted_class_bn = Column(String(120), nullable=False)
    condition_id = Column(String(64), nullable=False)
    category = Column(String(32), nullable=False)  # healthy, fungal, bacterial, pest, nutrient
    confidence = Column(Float, nullable=False)
    severity = Column(String(32), nullable=False, default="mild")  # none, mild, moderate, high
    
    # Guidance and model provenance
    guidance_json = Column(Text, nullable=False)  # JSON array of LocalizedText
    alternatives_json = Column(Text, nullable=False)  # JSON array of alternative classes
    supported_classes_json = Column(Text, nullable=False)  # JSON array of supported classes
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(32), nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False)
    safety_notice = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="scans")
    farm = relationship("Farm", back_populates="scans")
    feedbacks = relationship("ScanFeedback", back_populates="scan", cascade="all, delete-orphan")

class ScanFeedback(Base):
    __tablename__ = "scan_feedbacks"

    id = Column(String(64), primary_key=True, default=lambda: f"fb_{uuid.uuid4().hex[:10]}")
    scan_id = Column(String(64), ForeignKey("crop_scans.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    is_accurate = Column(Boolean, nullable=False)
    farmer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    scan = relationship("CropScan", back_populates="feedbacks")
