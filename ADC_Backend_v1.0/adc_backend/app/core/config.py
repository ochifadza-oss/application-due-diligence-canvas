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
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    ANTHROPIC_API_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_STARTER: str = ""
    STRIPE_PRICE_PROFESSIONAL: str = ""
    STRIPE_PRICE_ENTERPRISE: str = ""
    MARKETPLACE_LOGIN_URL: str = "https://app.adcsystem.co.za/login"
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
