from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    role: str = "analyst"
    org_id: Optional[int] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    org_id: Optional[int]
    is_active: bool
    terms_accepted: bool
    must_change_password: bool
    class Config:
        from_attributes = True
