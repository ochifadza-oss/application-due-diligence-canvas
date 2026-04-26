from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    role: str
    org_id: Optional[int]
    terms_accepted: bool = False
    must_change_password: bool = False

class RefreshRequest(BaseModel):
    refresh_token: str

class TermsAcceptRequest(BaseModel):
    accepted: bool


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
