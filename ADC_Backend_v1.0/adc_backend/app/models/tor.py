from sqlalchemy import Column, Integer, String, Text, Date, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class TOR(Base):
    __tablename__ = "tor"
    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    title = Column(String(250), nullable=True)
    sponsor = Column(String(100), nullable=True)
    project_manager = Column(String(100), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    budget = Column(Numeric(15, 2), nullable=True)
    background = Column(Text, nullable=True)
    purpose = Column(Text, nullable=True)
    objectives = Column(Text, nullable=True)
    scope = Column(Text, nullable=True)
    exclusions = Column(Text, nullable=True)
    methodology = Column(Text, nullable=True)
    governance = Column(Text, nullable=True)
    constraints = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    organisation = relationship("Organisation", back_populates="tor")
    deliverables = relationship("TORDeliverable", back_populates="tor", cascade="all, delete-orphan", order_by="TORDeliverable.sort_order")
    stakeholders = relationship("TORStakeholder", back_populates="tor", cascade="all, delete-orphan", order_by="TORStakeholder.sort_order")

class TORDeliverable(Base):
    __tablename__ = "tor_deliverables"
    id = Column(Integer, primary_key=True, autoincrement=True)
    tor_id = Column(Integer, ForeignKey("tor.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(String(300), nullable=False)
    due_date = Column(Date, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    tor = relationship("TOR", back_populates="deliverables")

class TORStakeholder(Base):
    __tablename__ = "tor_stakeholders"
    id = Column(Integer, primary_key=True, autoincrement=True)
    tor_id = Column(Integer, ForeignKey("tor.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name = Column(String(150), nullable=False)
    role = Column(String(100), nullable=True)
    responsibility = Column(String(300), nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    tor = relationship("TOR", back_populates="stakeholders")
