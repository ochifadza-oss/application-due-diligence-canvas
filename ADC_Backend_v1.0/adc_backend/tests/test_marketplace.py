import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.criterion import ScoringCriterion
from app.models.domain import Domain
from app.models.landing_config import LandingConfig
from app.models.organisation import Organisation
from app.models.user import User

pytestmark = pytest.mark.asyncio


async def _get_token(client: AsyncClient, email: str, password: str) -> str:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


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


async def test_marketplace_admin_landing_config_persists_and_public_reads_db_values(
    client: AsyncClient,
    db_session: AsyncSession,
    seed_org_and_user,
):
    admin_token = await _get_token(client, "admin@test.gov.za", "Admin@1234")

    payload = {
        "app_name": "ADC Platform",
        "company": {
            "legal_name": "GMT Technology Solutions (Pty) Ltd",
            "registration_number": "2026/123456/07",
            "vat_number": "4990123456",
            "csd_number": "MAAA1234567",
        },
        "links": {
            "app_url": "https://application-due-diligence.netlify.app",
            "login_url": "https://application-due-diligence.netlify.app/login",
            "website_url": "https://www.adcsystem.co.za",
            "about_url": "https://www.adcsystem.co.za/about",
            "case_studies_url": "https://www.adcsystem.co.za/case-studies",
            "blog_url": "https://www.adcsystem.co.za/blog",
            "documentation_url": "https://application-due-diligence.netlify.app/app",
            "user_guide_url": "https://application-due-diligence.netlify.app/app",
            "status_url": "https://application-due-diligence.netlify.app/status",
            "privacy_url": "https://www.adcsystem.co.za/privacy-policy",
            "terms_url": "https://www.adcsystem.co.za/terms-of-service",
            "cookie_url": "https://www.adcsystem.co.za/cookie-policy",
            "popia_url": "https://www.adcsystem.co.za/popia",
            "info_email": "info@adcsystem.co.za",
            "support_email": "support@adcsystem.co.za",
            "sales_email": "sales@adcsystem.co.za",
            "careers_email": "careers@adcsystem.co.za",
            "press_email": "press@adcsystem.co.za",
            "phone": "+27 (0) 11 000 0000",
        },
        "plans": {
            "starter": {
                "code": "starter",
                "label": "Starter",
                "monthly_price": "R 3,900/month",
                "annual_price": "R 46,800/year",
                "cta_label": "Get started",
            },
            "professional": {
                "code": "professional",
                "label": "Professional",
                "monthly_price": "R 9,500/month",
                "annual_price": "R 114,000/year",
                "cta_label": "Subscribe now",
            },
            "enterprise": {
                "code": "enterprise",
                "label": "Enterprise",
                "monthly_price": "R 22,000/month",
                "annual_price": "R 264,000/year",
                "cta_label": "Contact us",
            },
        },
    }

    update_response = await client.put(
        "/api/v1/marketplace/admin/landing-config",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=payload,
    )
    assert update_response.status_code == 200
    assert update_response.json()["source"] == "database"
    assert update_response.json()["app_name"] == "ADC Platform"
    assert update_response.json()["links"]["status_url"] == "https://application-due-diligence.netlify.app/status"

    db_row = (await db_session.execute(select(LandingConfig))).scalar_one_or_none()
    assert db_row is not None
    assert db_row.app_name == "ADC Platform"
    assert db_row.updated_by_user_id == seed_org_and_user["admin"].id

    public_response = await client.get("/api/v1/marketplace/landing-config")
    assert public_response.status_code == 200
    assert public_response.json()["source"] == "database"
    assert public_response.json()["company"]["registration_number"] == "2026/123456/07"
    assert public_response.json()["plans"]["professional"]["monthly_price"] == "R 9,500/month"


async def test_marketplace_admin_landing_config_requires_admin_role(
    client: AsyncClient,
    seed_org_and_user,
):
    analyst_token = await _get_token(client, "analyst@test.gov.za", "Analyst@1234")
    response = await client.get(
        "/api/v1/marketplace/admin/landing-config",
        headers={"Authorization": f"Bearer {analyst_token}"},
    )
    assert response.status_code == 403
