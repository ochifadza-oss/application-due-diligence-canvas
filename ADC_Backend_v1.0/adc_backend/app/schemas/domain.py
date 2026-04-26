from pydantic import BaseModel
from typing import Optional

class DomainCreate(BaseModel):
    name: str
    sort_order: int = 0

class DomainUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None

class DomainOut(BaseModel):
    id: int
    org_id: int
    name: str
    sort_order: int
    app_count: int = 0
    avg_score: Optional[float] = None
    class Config:
        from_attributes = True
