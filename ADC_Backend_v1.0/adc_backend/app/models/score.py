from sqlalchemy import Column, Integer, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Score(Base):
    __tablename__ = "scores"
    __table_args__ = (
        CheckConstraint("score BETWEEN 1 AND 5", name="chk_score_range"),
    )
    id = Column(Integer, primary_key=True, autoincrement=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    criterion_index = Column(Integer, nullable=False)
    score = Column(Integer, nullable=False)
    scored_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    scored_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    application = relationship("Application", back_populates="scores")
    scored_by_user = relationship("User", back_populates="scores")
