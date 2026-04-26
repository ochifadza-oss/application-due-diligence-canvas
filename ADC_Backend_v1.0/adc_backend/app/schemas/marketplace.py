from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class MarketplaceSubscriptionRequest(BaseModel):
    organisation: str = Field(min_length=2, max_length=200)
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=50)
    users: Optional[str] = Field(default=None, max_length=30)
    plan_code: Literal["starter", "professional", "enterprise"] = "professional"
    plan_price: Optional[str] = Field(default=None, max_length=40)
    source: str = Field(default="website", max_length=80)
    landing_url: Optional[str] = Field(default=None, max_length=300)
    referrer: Optional[str] = Field(default=None, max_length=300)
    submitted_at: Optional[str] = Field(default=None, max_length=80)
    bot_field: Optional[str] = Field(default="", max_length=200)


class MarketplaceSubscriptionResponse(BaseModel):
    message: str
    activation_sent: bool
    login_url: str
