"""
Application Due Diligence Canvas (ADC) — FastAPI Backend
Version: 1.0 | GMT Technology Solutions | SRS-ADC-2026-001
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from sqlalchemy import inspect, text

from app.core.config import settings
from app.db.session import engine, Base
from app.api.v1.router import api_router
import app.models  # noqa: F401 — registers all models with Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _ensure_schema_compatibility(sync_conn):
    inspector = inspect(sync_conn)
    if "users" not in inspector.get_table_names():
        return

    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "must_change_password" not in user_columns:
        default_value = "0" if sync_conn.dialect.name == "sqlite" else "FALSE"
        sync_conn.execute(
            text(
                f"ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT {default_value}"
            )
        )
        logger.info("Applied schema compatibility patch: users.must_change_password")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ADC Backend starting — verifying database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_schema_compatibility)
    logger.info("Database ready.")
    yield
    logger.info("ADC Backend shutting down.")

app = FastAPI(
    title="Application Due Diligence Canvas API",
    description="Multi-tenant SaaS backend | GMT Technology Solutions",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|([a-zA-Z0-9-]+\.)?netlify\.app|([a-zA-Z0-9-]+\.)?adcsystem\.co\.za)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health", tags=["system"])
async def health():
    return {"status": "healthy", "version": "1.0.0"}
