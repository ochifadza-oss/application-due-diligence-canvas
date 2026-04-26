from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum

class QueryPriority(str, enum.Enum):
    high = "High"
    medium = "Medium"
    low = "Low"

class QueryCategory(str, enum.Enum):
    pricing = "Pricing"
    technical = "Technical"
    compliance = "Compliance"
    functional = "Functional"
    contract = "Contract"
    other = "Other"

class QueryStatus(str, enum.Enum):
    open = "Open"
    in_progress = "In Progress"
    resolved = "Resolved"
    escalated = "Escalated"

class WorkflowStep(str, enum.Enum):
    submitted = "Submitted"
    acknowledged = "Acknowledged"
    under_review = "Under Review"
    response_issued = "Response Issued"
    closed = "Closed"

class Query(Base):
    __tablename__ = "queries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(250), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(Enum(QueryPriority), default=QueryPriority.medium, nullable=False)
    category = Column(Enum(QueryCategory), default=QueryCategory.other, nullable=False)
    status = Column(Enum(QueryStatus), default=QueryStatus.open, nullable=False, index=True)
    workflow_step = Column(Enum(WorkflowStep), default=WorkflowStep.submitted, nullable=False)
    assignee = Column(String(100), nullable=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_date = Column(Date, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    raised_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    organisation = relationship("Organisation", back_populates="queries")
    application = relationship("Application", back_populates="queries")
    raised_by_user = relationship("User", foreign_keys=[raised_by], back_populates="queries_raised")
    responses = relationship("QueryResponse", back_populates="query", cascade="all, delete-orphan", order_by="QueryResponse.created_at")

class QueryResponse(Base):
    __tablename__ = "query_responses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    query_id = Column(Integer, ForeignKey("queries.id", ondelete="CASCADE"), nullable=False, index=True)
    response_text = Column(Text, nullable=False)
    author = Column(String(100), nullable=False)
    responded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    query = relationship("Query", back_populates="responses")
