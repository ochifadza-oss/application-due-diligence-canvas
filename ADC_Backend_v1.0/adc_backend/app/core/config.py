from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "Application Due Diligence Canvas"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "mysql+aiomysql://root:password@localhost:3306/adc_db"
    JWT_SECRET_KEY: str = "change-this-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://application-due-diligence.netlify.app",
    ]
    ANTHROPIC_API_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_STARTER: str = ""
    STRIPE_PRICE_PROFESSIONAL: str = ""
    STRIPE_PRICE_ENTERPRISE: str = ""
    MARKETPLACE_APP_URL: str = "https://application-due-diligence.netlify.app"
    MARKETPLACE_LOGIN_URL: str = "https://application-due-diligence.netlify.app/login"

    # Public landing/runtime config
    LANDING_COMPANY_NAME: str = "GMT Technology Solutions (Pty) Ltd"
    LANDING_COMPANY_WEBSITE: str = "https://www.adcsystem.co.za"
    LANDING_INFO_EMAIL: str = "info@adcsystem.co.za"
    LANDING_SUPPORT_EMAIL: str = "support@adcsystem.co.za"
    LANDING_SALES_EMAIL: str = "sales@adcsystem.co.za"
    LANDING_CAREERS_EMAIL: str = "careers@adcsystem.co.za"
    LANDING_PRESS_EMAIL: str = "press@adcsystem.co.za"
    LANDING_PHONE: str = "+27 (0) 00 000 0000"
    LANDING_REGISTRATION_NUMBER: str = "Available on request"
    LANDING_VAT_NUMBER: str = "Available on request"
    LANDING_CSD_NUMBER: str = "Available on request"

    LANDING_ABOUT_URL: str = "https://www.adcsystem.co.za/about"
    LANDING_CASE_STUDIES_URL: str = "https://www.adcsystem.co.za/case-studies"
    LANDING_BLOG_URL: str = "https://www.adcsystem.co.za/blog"
    LANDING_DOCUMENTATION_URL: str = "https://application-due-diligence.netlify.app/app"
    LANDING_USER_GUIDE_URL: str = "https://application-due-diligence.netlify.app/app"
    LANDING_STATUS_URL: str = "https://application-due-diligence.netlify.app"
    LANDING_PRIVACY_URL: str = "https://www.adcsystem.co.za/privacy-policy"
    LANDING_TERMS_URL: str = "https://www.adcsystem.co.za/terms-of-service"
    LANDING_COOKIE_URL: str = "https://www.adcsystem.co.za/cookie-policy"
    LANDING_POPIA_URL: str = "https://www.adcsystem.co.za/popia"

    LANDING_PLAN_STARTER_MONTHLY: str = "R 3,500/month"
    LANDING_PLAN_STARTER_ANNUAL: str = "R 42,000/year"
    LANDING_PLAN_STARTER_CTA: str = "Get started"
    LANDING_PLAN_PROFESSIONAL_MONTHLY: str = "R 8,500/month"
    LANDING_PLAN_PROFESSIONAL_ANNUAL: str = "R 102,000/year"
    LANDING_PLAN_PROFESSIONAL_CTA: str = "Subscribe now"
    LANDING_PLAN_ENTERPRISE_MONTHLY: str = "R 18,000/month"
    LANDING_PLAN_ENTERPRISE_ANNUAL: str = "R 216,000/year"
    LANDING_PLAN_ENTERPRISE_CTA: str = "Contact us"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_BCC: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
