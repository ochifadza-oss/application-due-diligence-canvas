from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class ScoringCriterion(Base):
    __tablename__ = "scoring_criteria"
    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    criterion_index = Column(Integer, nullable=False)
    label = Column(String(100), nullable=False)
    weight_pct = Column(Numeric(5, 2), default=25.00, nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    organisation = relationship("Organisation", back_populates="criteria")
