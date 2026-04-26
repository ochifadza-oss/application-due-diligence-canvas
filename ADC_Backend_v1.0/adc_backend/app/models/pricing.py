from sqlalchemy import Column, Integer, Numeric, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum

class Recommendation(str, enum.Enum):
    keep = "Keep"
    upgrade = "Upgrade"
    replace = "Replace"
    retire = "Retire"
    review = "Review"

class Pricing(Base):
    __tablename__ = "pricing"
    id = Column(Integer, primary_key=True, autoincrement=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    licence_cost = Column(Numeric(15, 2), default=0, nullable=False)
    maintenance_cost = Column(Numeric(15, 2), default=0, nullable=False)
    implementation_cost = Column(Numeric(15, 2), default=0, nullable=False)
    score_weight = Column(Numeric(5, 2), default=100, nullable=False)
    recommendation = Column(
        Enum(
            Recommendation,
            values_callable=lambda e: [item.value for item in e],
        ),
        nullable=True,
    )
    notes = Column(Text, nullable=True)
    captured_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    application = relationship("Application", back_populates="pricing")
