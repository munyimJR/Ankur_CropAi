from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class RegisteredModel(Base):
    __tablename__ = "registered_models"

    id = Column(String(64), primary_key=True)  # identifier e.g. mobilenetv2_plantvillage
    name = Column(String(120), nullable=False)
    version = Column(String(32), nullable=False)
    crop_type = Column(String(64), nullable=False)  # multi, rice, potato, etc.
    framework = Column(String(32), default="onnx", nullable=False)
    artifact_path = Column(String(255), nullable=False)
    input_shape = Column(String(64), default="1,3,224,224", nullable=False)
    supported_classes_json = Column(Text, nullable=False)
    provenance_json = Column(Text, nullable=False)  # License, dataset, training source
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
