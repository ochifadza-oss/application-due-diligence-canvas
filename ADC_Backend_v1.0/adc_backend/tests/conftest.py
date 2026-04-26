"""
Shared pytest fixtures for all ADC backend tests.
Uses an in-memory SQLite database so no MySQL is needed for testing.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app as fastapi_app
from app.db.session import Base, get_db
from app.core.security import hash_password
from app.models.organisation import Organisation
from app.models.user import User
import app.models  # noqa — register all models

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture
async def db_session(test_engine):
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()

@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session
    fastapi_app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as ac:
        yield ac
    fastapi_app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def seed_org_and_user(db_session) -> dict:
    """Creates a test organisation and two users (admin + analyst). Returns tokens."""
    org = Organisation(name="Test Dept", department="ICT", currency_symbol="R",
                       subscription_tier="professional", subscription_status="active")
    db_session.add(org)
    await db_session.flush()

    admin = User(org_id=org.id, username="admin", email="admin@test.gov.za",
                 password_hash=hash_password("Admin@1234"), full_name="Test Admin",
                 role="administrator", is_active=True, terms_accepted=True)
    analyst = User(org_id=org.id, username="analyst", email="analyst@test.gov.za",
                   password_hash=hash_password("Analyst@1234"), full_name="Test Analyst",
                   role="analyst", is_active=True, terms_accepted=True)
    db_session.add_all([admin, analyst])
    await db_session.commit()
    return {"org_id": org.id, "admin": admin, "analyst": analyst}
