import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.organisation import Organisation
from app.models.user import User

pytestmark = pytest.mark.asyncio

async def test_health(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"

async def test_login_success(client: AsyncClient, seed_org_and_user):
    r = await client.post("/api/v1/auth/login", json={"email": "admin@test.gov.za", "password": "Admin@1234"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["role"] == "administrator"
    assert data["must_change_password"] is False

async def test_login_wrong_password(client: AsyncClient, seed_org_and_user):
    r = await client.post("/api/v1/auth/login", json={"email": "admin@test.gov.za", "password": "wrongpassword"})
    assert r.status_code == 401

async def test_login_unknown_email(client: AsyncClient, seed_org_and_user):
    r = await client.post("/api/v1/auth/login", json={"email": "nobody@test.gov.za", "password": "Test@1234"})
    assert r.status_code == 401

async def test_get_me(client: AsyncClient, seed_org_and_user):
    login = await client.post("/api/v1/auth/login", json={"email": "analyst@test.gov.za", "password": "Analyst@1234"})
    token = login.json()["access_token"]
    r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "analyst@test.gov.za"

async def test_protected_without_token(client: AsyncClient):
    r = await client.get("/api/v1/domains")
    assert r.status_code == 403

async def test_refresh_token(client: AsyncClient, seed_org_and_user):
    login = await client.post("/api/v1/auth/login", json={"email": "admin@test.gov.za", "password": "Admin@1234"})
    refresh = login.json()["refresh_token"]
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200
    assert "access_token" in r.json()


async def test_change_password_clears_must_change_flag(client: AsyncClient, db_session: AsyncSession):
    org = Organisation(name="Marketplace Org", currency_symbol="R", subscription_tier="starter", subscription_status="active")
    db_session.add(org)
    await db_session.flush()

    user = User(
        org_id=org.id,
        username="market_admin",
        email="market.admin@test.gov.za",
        password_hash=hash_password("TempPass@123"),
        full_name="Marketplace Admin",
        role="administrator",
        is_active=True,
        terms_accepted=False,
        must_change_password=True,
    )
    db_session.add(user)
    await db_session.commit()

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "market.admin@test.gov.za", "password": "TempPass@123"},
    )
    assert login.status_code == 200
    assert login.json()["must_change_password"] is True

    token = login.json()["access_token"]
    changed = await client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "TempPass@123", "new_password": "MarketNew@2026"},
    )
    assert changed.status_code == 200

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["must_change_password"] is False

    old_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "market.admin@test.gov.za", "password": "TempPass@123"},
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "market.admin@test.gov.za", "password": "MarketNew@2026"},
    )
    assert new_login.status_code == 200
    assert new_login.json()["must_change_password"] is False


async def test_change_password_rejects_incorrect_current_password(client: AsyncClient, seed_org_and_user):
    login = await client.post("/api/v1/auth/login", json={"email": "admin@test.gov.za", "password": "Admin@1234"})
    token = login.json()["access_token"]
    r = await client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "NotTheCurrentPassword", "new_password": "ValidPass@2026"},
    )
    assert r.status_code == 400
    assert "current password" in r.json()["detail"].lower()


async def test_change_password_rejects_weak_password(client: AsyncClient, seed_org_and_user):
    login = await client.post("/api/v1/auth/login", json={"email": "admin@test.gov.za", "password": "Admin@1234"})
    token = login.json()["access_token"]
    r = await client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "Admin@1234", "new_password": "short"},
    )
    assert r.status_code == 400
    assert "at least 10 characters" in r.json()["detail"].lower()
