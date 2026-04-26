import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.criterion import ScoringCriterion
from app.models.domain import Domain
from app.models.organisation import Organisation
from app.models.user import User

pytestmark = pytest.mark.asyncio


async def test_marketplace_subscribe_provisions_org_and_admin(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "organisation": "Northern Cape Treasury",
        "name": "Alice Molefe",
        "email": "alice.molefe@treasury.gov.za",
        "phone": "+27 82 000 0000",
        "users": "6-20 users",
        "plan_code": "professional",
        "plan_price": "R 8,500/month",
        "source": "netlify-marketplace",
        "landing_url": "https://adc-landing.netlify.app/?source=netlify",
        "referrer": "https://www.netlify.com",
        "submitted_at": "2026-04-26T09:00:00Z",
    }

    response = await client.post("/api/v1/marketplace/subscribe", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert "message" in body
    assert body["login_url"].endswith("/login")
    assert body["activation_sent"] is False

    org_result = await db_session.execute(
        select(Organisation).where(Organisation.name == "Northern Cape Treasury")
    )
    org = org_result.scalar_one_or_none()
    assert org is not None
    assert org.subscription_tier == "professional"

    user_result = await db_session.execute(
        select(User).where(User.email == "alice.molefe@treasury.gov.za")
    )
    user = user_result.scalar_one_or_none()
    assert user is not None
    assert user.org_id == org.id
    assert getattr(user.role, "value", user.role) == "administrator"
    assert user.is_active is True
    assert user.must_change_password is True

    domains_count = (
        await db_session.execute(
            select(func.count()).select_from(Domain).where(Domain.org_id == org.id)
        )
    ).scalar_one()
    criteria_count = (
        await db_session.execute(
            select(func.count()).select_from(ScoringCriterion).where(ScoringCriterion.org_id == org.id)
        )
    ).scalar_one()

    assert domains_count == 9
    assert criteria_count == 4


async def test_marketplace_subscribe_rejects_duplicate_email(client: AsyncClient, seed_org_and_user):
    payload = {
        "organisation": "Duplicate Org",
        "name": "Existing Admin",
        "email": "admin@test.gov.za",
        "plan_code": "starter",
    }

    response = await client.post("/api/v1/marketplace/subscribe", json=payload)

    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()


async def test_marketplace_subscribe_honeypot_short_circuit(client: AsyncClient, db_session: AsyncSession):
    before_count = (await db_session.execute(select(func.count()).select_from(Organisation))).scalar_one()

    payload = {
        "organisation": "Bot Org",
        "name": "Spam Bot",
        "email": "spam@example.com",
        "plan_code": "starter",
        "bot_field": "filled",
    }

    response = await client.post("/api/v1/marketplace/subscribe", json=payload)

    assert response.status_code == 201
    assert response.json()["activation_sent"] is False

    after_count = (await db_session.execute(select(func.count()).select_from(Organisation))).scalar_one()
    assert after_count == before_count
