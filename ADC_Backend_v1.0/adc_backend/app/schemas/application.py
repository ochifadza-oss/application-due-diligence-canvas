from pydantic import BaseModel
from typing import Optional, List, Dict

class AppCreate(BaseModel):
    domain_id: int
    name: str
    vendor: Optional[str] = None
    notes: Optional[str] = None

class AppUpdate(BaseModel):
    domain_id: Optional[int] = None
    name: Optional[str] = None
    vendor: Optional[str] = None
    notes: Optional[str] = None

class ScoreIn(BaseModel):
    criterion_index: int
    score: int

class AppOut(BaseModel):
    id: int
    domain_id: int
    domain_name: Optional[str] = None
    name: str
    vendor: Optional[str]
    notes: Optional[str]
    scores: Dict[int, int] = {}
    avg_score: Optional[float] = None
    weighted_score: Optional[float] = None
    class Config:
        from_attributes = True
