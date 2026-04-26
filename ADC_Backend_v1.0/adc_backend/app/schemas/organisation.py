from pydantic import BaseModel
from typing import Optional

class OrgSettings(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    analyst: Optional[str] = None
    reference_no: Optional[str] = None
    financial_year: Optional[str] = None
    currency_symbol: Optional[str] = "R"

class OrgOut(OrgSettings):
    id: int
    subscription_tier: Optional[str]
    subscription_status: Optional[str]
    has_logo: bool = False
    class Config:
        from_attributes = True
