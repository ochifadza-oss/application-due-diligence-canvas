from sqlalchemy import Column, Integer, String, LargeBinary, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Organisation(Base):
    __tablename__ = "organisations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    department = Column(String(200), nullable=True)
    analyst = Column(String(100), nullable=True)
    reference_no = Column(String(50), nullable=True)
    financial_year = Column(String(20), nullable=True)
    currency_symbol = Column(String(5), default="R", nullable=False)
    logo = Column(LargeBinary(length=2097152), nullable=True)
    logo_mime_type = Column(String(30), nullable=True)
    stripe_customer_id = Column(String(100), nullable=True)
    subscription_tier = Column(String(20), default="starter", nullable=True)
    subscription_status = Column(String(20), default="active", nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    users = relationship("User", back_populates="organisation")
    domains = relationship("Domain", back_populates="organisation", cascade="all, delete-orphan")
    queries = relationship("Query", back_populates="organisation", cascade="all, delete-orphan")
    tor = relationship("TOR", back_populates="organisation", uselist=False, cascade="all, delete-orphan")
    criteria = relationship("ScoringCriterion", back_populates="organisation", cascade="all, delete-orphan")
