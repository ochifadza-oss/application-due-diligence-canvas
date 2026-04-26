from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum

class UserRole(str, enum.Enum):
    administrator = "administrator"
    senior_analyst = "senior_analyst"
    analyst = "analyst"
    reviewer = "reviewer"
    client_stakeholder = "client_stakeholder"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey("organisations.id"), nullable=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.analyst, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)
    terms_accepted = Column(Boolean, default=False, nullable=False)
    terms_accepted_at = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    organisation = relationship("Organisation", back_populates="users")
    scores = relationship("Score", back_populates="scored_by_user")
    queries_raised = relationship("Query", foreign_keys="Query.raised_by", back_populates="raised_by_user")
