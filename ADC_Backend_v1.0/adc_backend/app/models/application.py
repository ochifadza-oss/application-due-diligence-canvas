from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, autoincrement=True)
    domain_id = Column(Integer, ForeignKey("domains.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    vendor = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    domain = relationship("Domain", back_populates="applications")
    scores = relationship("Score", back_populates="application", cascade="all, delete-orphan")
    pricing = relationship("Pricing", back_populates="application", uselist=False, cascade="all, delete-orphan")
    queries = relationship("Query", back_populates="application")
