import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class FieldObservation(Base):
    __tablename__ = "field_observations"

    id = Column(String(64), primary_key=True, default=lambda: f"obs_{uuid.uuid4().hex[:10]}")
    farm_id = Column(String(64), ForeignKey("farms.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    kind = Column(String(32), nullable=False, default="note")  # satellite, scan, note, weather, task
    title_en = Column(String(200), nullable=False)
    title_bn = Column(String(200), nullable=False)
    detail_en = Column(Text, nullable=True)
    detail_bn = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    farm = relationship("Farm", back_populates="observations")
    user = relationship("User", back_populates="observations")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String(64), primary_key=True, default=lambda: f"act_{uuid.uuid4().hex[:10]}")
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    farm_id = Column(String(64), ForeignKey("farms.id", ondelete="CASCADE"), nullable=True)
    kind = Column(String(32), nullable=False, default="farm")  # farm, scan, note, alert, advisor
    text_en = Column(String(255), nullable=False)
    text_bn = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
