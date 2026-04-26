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


class MarketplacePlanConfig(BaseModel):
    code: Literal["starter", "professional", "enterprise"]
    label: str
    monthly_price: str
    annual_price: str
    cta_label: str


class MarketplaceCompanyConfig(BaseModel):
    legal_name: str
    registration_number: str
    vat_number: str
    csd_number: str


class MarketplaceLinksConfig(BaseModel):
    app_url: str
    login_url: str
    website_url: str
    about_url: str
    case_studies_url: str
    blog_url: str
    documentation_url: str
    user_guide_url: str
    status_url: str
    privacy_url: str
    terms_url: str
    cookie_url: str
    popia_url: str
    info_email: EmailStr
    support_email: EmailStr
    sales_email: EmailStr
    careers_email: EmailStr
    press_email: EmailStr
    phone: str


class MarketplaceStatsConfig(BaseModel):
    organisations: int = 0
    applications: int = 0
    active_users: int = 0
    open_queries: int = 0


class MarketplaceLandingConfigResponse(BaseModel):
    app_name: str
    source: Literal["settings", "database"] = "settings"
    company: MarketplaceCompanyConfig
    links: MarketplaceLinksConfig
    plans: dict[str, MarketplacePlanConfig]
    stats: MarketplaceStatsConfig


class MarketplaceLandingConfigUpdateRequest(BaseModel):
    app_name: str = Field(min_length=2, max_length=200)
    company: MarketplaceCompanyConfig
    links: MarketplaceLinksConfig
    plans: dict[Literal["starter", "professional", "enterprise"], MarketplacePlanConfig]
