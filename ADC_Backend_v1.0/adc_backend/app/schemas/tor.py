from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from decimal import Decimal

class DeliverableIn(BaseModel):
    description: str
    due_date: Optional[date] = None
    sort_order: int = 0

class StakeholderIn(BaseModel):
    full_name: str
    role: Optional[str] = None
    responsibility: Optional[str] = None
    sort_order: int = 0

class TORUpsert(BaseModel):
    title: Optional[str] = None
    sponsor: Optional[str] = None
    project_manager: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    background: Optional[str] = None
    purpose: Optional[str] = None
    objectives: Optional[str] = None
    scope: Optional[str] = None
    exclusions: Optional[str] = None
    methodology: Optional[str] = None
    governance: Optional[str] = None
    constraints: Optional[str] = None
    deliverables: List[DeliverableIn] = []
    stakeholders: List[StakeholderIn] = []

class TOROut(TORUpsert):
    id: int
    org_id: int
    class Config:
        from_attributes = True
