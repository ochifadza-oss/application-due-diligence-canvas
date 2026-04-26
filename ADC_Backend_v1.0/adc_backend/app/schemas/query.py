from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class QueryCreate(BaseModel):
    title: str
    description: Optional[str] = None
    app_id: Optional[int] = None
    priority: str = "Medium"
    category: str = "Other"
    assignee: Optional[str] = None
    due_date: Optional[date] = None

class QueryUpdate(BaseModel):
    status: Optional[str] = None
    workflow_step: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[date] = None

class ResponseCreate(BaseModel):
    response_text: str
    author: str

class ResponseOut(BaseModel):
    id: int
    response_text: str
    author: str
    created_at: datetime
    class Config:
        from_attributes = True

class QueryOut(BaseModel):
    id: int
    org_id: int
    app_id: Optional[int]
    app_name: Optional[str] = None
    title: str
    description: Optional[str]
    priority: str
    category: str
    status: str
    workflow_step: str
    assignee: Optional[str]
    due_date: Optional[date]
    created_at: datetime
    responses: List[ResponseOut] = []
    class Config:
        from_attributes = True
