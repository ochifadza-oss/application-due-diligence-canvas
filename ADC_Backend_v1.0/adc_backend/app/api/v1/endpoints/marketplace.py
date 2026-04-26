import logging
import re
import secrets
import string
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.application import Application
from app.models.landing_config import LandingConfig
from app.models.organisation import Organisation
from app.models.query import Query, QueryStatus
from app.models.user import User, UserRole
from app.schemas.marketplace import (
    MarketplaceCompanyConfig,
    MarketplaceLandingConfigResponse,
    MarketplaceLandingConfigUpdateRequest,
    MarketplaceLinksConfig,
    MarketplacePlanConfig,
    MarketplaceStatsConfig,
    MarketplaceSubscriptionRequest,
    MarketplaceSubscriptionResponse,
)
from app.services.notifications import send_activation_email
from app.services.provisioning import seed_organisation_defaults

router = APIRouter()
logger = logging.getLogger(__name__)

PLAN_LABELS = {
    "starter": "Starter",
    "professional": "Professional",
    "enterprise": "Enterprise",
}

PLAN_CODES = ("starter", "professional", "enterprise")


def _build_landing_plans() -> dict[str, MarketplacePlanConfig]:
    return {
        "starter": MarketplacePlanConfig(
            code="starter",
            label="Starter",
            monthly_price=settings.LANDING_PLAN_STARTER_MONTHLY,
            annual_price=settings.LANDING_PLAN_STARTER_ANNUAL,
            cta_label=settings.LANDING_PLAN_STARTER_CTA,
        ),
        "professional": MarketplacePlanConfig(
            code="professional",
            label="Professional",
            monthly_price=settings.LANDING_PLAN_PROFESSIONAL_MONTHLY,
            annual_price=settings.LANDING_PLAN_PROFESSIONAL_ANNUAL,
            cta_label=settings.LANDING_PLAN_PROFESSIONAL_CTA,
        ),
        "enterprise": MarketplacePlanConfig(
            code="enterprise",
            label="Enterprise",
            monthly_price=settings.LANDING_PLAN_ENTERPRISE_MONTHLY,
            annual_price=settings.LANDING_PLAN_ENTERPRISE_ANNUAL,
            cta_label=settings.LANDING_PLAN_ENTERPRISE_CTA,
        ),
    }


def _build_default_landing_context() -> dict[str, Any]:
    return {
        "app_name": settings.APP_NAME,
        "company": MarketplaceCompanyConfig(
            legal_name=settings.LANDING_COMPANY_NAME,
            registration_number=settings.LANDING_REGISTRATION_NUMBER,
            vat_number=settings.LANDING_VAT_NUMBER,
            csd_number=settings.LANDING_CSD_NUMBER,
        ).model_dump(),
        "links": MarketplaceLinksConfig(
            app_url=settings.MARKETPLACE_APP_URL,
            login_url=settings.MARKETPLACE_LOGIN_URL,
            website_url=settings.LANDING_COMPANY_WEBSITE,
            about_url=settings.LANDING_ABOUT_URL,
            case_studies_url=settings.LANDING_CASE_STUDIES_URL,
            blog_url=settings.LANDING_BLOG_URL,
            documentation_url=settings.LANDING_DOCUMENTATION_URL,
            user_guide_url=settings.LANDING_USER_GUIDE_URL,
            status_url=settings.LANDING_STATUS_URL,
            privacy_url=settings.LANDING_PRIVACY_URL,
            terms_url=settings.LANDING_TERMS_URL,
            cookie_url=settings.LANDING_COOKIE_URL,
            popia_url=settings.LANDING_POPIA_URL,
            info_email=settings.LANDING_INFO_EMAIL,
            support_email=settings.LANDING_SUPPORT_EMAIL,
            sales_email=settings.LANDING_SALES_EMAIL,
            careers_email=settings.LANDING_CAREERS_EMAIL,
            press_email=settings.LANDING_PRESS_EMAIL,
            phone=settings.LANDING_PHONE,
        ).model_dump(),
        "plans": {code: plan.model_dump() for code, plan in _build_landing_plans().items()},
    }


async def _get_landing_config_row(db: AsyncSession) -> LandingConfig | None:
    result = await db.execute(
        select(LandingConfig).order_by(LandingConfig.id.asc()).limit(1)
    )
    return result.scalar_one_or_none()


def _merge_landing_context(
    default_context: dict[str, Any], row: LandingConfig | None
) -> tuple[dict[str, Any], str]:
    merged = {
        "app_name": default_context["app_name"],
        "company": dict(default_context["company"]),
        "links": dict(default_context["links"]),
        "plans": {code: dict(values) for code, values in default_context["plans"].items()},
    }

    if row is None:
        return merged, "settings"

    if row.app_name:
        merged["app_name"] = row.app_name

    if isinstance(row.company, dict):
        merged["company"].update(row.company)

    if isinstance(row.links, dict):
        merged["links"].update(row.links)

    if isinstance(row.plans, dict):
        for code in PLAN_CODES:
            values = row.plans.get(code)
            if isinstance(values, dict):
                merged["plans"][code].update(values)

    return merged, "database"


async def _collect_marketplace_stats(db: AsyncSession) -> MarketplaceStatsConfig:
    stats = MarketplaceStatsConfig()

    try:
        stats.organisations = int(
            (await db.execute(select(func.count(Organisation.id)))).scalar() or 0
        )
        stats.applications = int(
            (await db.execute(select(func.count(Application.id)))).scalar() or 0
        )
        stats.active_users = int(
            (
                await db.execute(
                    select(func.count(User.id)).where(User.is_active.is_(True))
                )
            ).scalar()
            or 0
        )
        stats.open_queries = int(
            (
                await db.execute(
                    select(func.count(Query.id)).where(
                        Query.status.in_(
                            [
                                QueryStatus.open,
                                QueryStatus.in_progress,
                                QueryStatus.escalated,
                            ]
                        )
                    )
                )
            ).scalar()
            or 0
        )
    except Exception:  # pragma: no cover - defensive fallback for landing runtime
        logger.warning("Could not compute landing aggregate stats", exc_info=True)

    return stats


async def _build_marketplace_landing_config(db: AsyncSession) -> MarketplaceLandingConfigResponse:
    default_context = _build_default_landing_context()
    row = await _get_landing_config_row(db)
    merged, source = _merge_landing_context(default_context, row)
    stats = await _collect_marketplace_stats(db)

    return MarketplaceLandingConfigResponse(
        app_name=merged["app_name"],
        source=source,
        company=MarketplaceCompanyConfig(**merged["company"]),
        links=MarketplaceLinksConfig(**merged["links"]),
        plans={code: MarketplacePlanConfig(**plan) for code, plan in merged["plans"].items()},
        stats=stats,
    )


@router.get("/landing-config", response_model=MarketplaceLandingConfigResponse)
async def marketplace_landing_config(db: AsyncSession = Depends(get_db)):
    return await _build_marketplace_landing_config(db)


@router.get("/admin/landing-config", response_model=MarketplaceLandingConfigResponse)
async def marketplace_admin_landing_config(
    _: User = Depends(require_role("administrator")),
    db: AsyncSession = Depends(get_db),
):
    return await _build_marketplace_landing_config(db)


@router.put("/admin/landing-config", response_model=MarketplaceLandingConfigResponse)
async def marketplace_admin_update_landing_config(
    payload: MarketplaceLandingConfigUpdateRequest,
    current_user: User = Depends(require_role("administrator")),
    db: AsyncSession = Depends(get_db),
):
    row = await _get_landing_config_row(db)
    plans = {code: plan.model_dump() for code, plan in _build_landing_plans().items()}
    for code, plan in payload.plans.items():
        if code in plans:
            plans[code].update(plan.model_dump())

    if row is None:
        row = LandingConfig(
            app_name=payload.app_name,
            company=payload.company.model_dump(),
            links=payload.links.model_dump(),
            plans=plans,
            updated_by_user_id=current_user.id,
        )
        db.add(row)
    else:
        row.app_name = payload.app_name
        row.company = payload.company.model_dump()
        row.links = payload.links.model_dump()
        row.plans = plans
        row.updated_by_user_id = current_user.id

    await db.commit()
    return await _build_marketplace_landing_config(db)


def _generate_temporary_password() -> str:
    alphabet = string.ascii_letters + string.digits
    core = "".join(secrets.choice(alphabet) for _ in range(10))
    return f"{core}Aa!"


def _username_seed_from_email(email: str) -> str:
    local_part = email.split("@", 1)[0].lower()
    seed = re.sub(r"[^a-z0-9._-]", "_", local_part).strip("._-")
    return (seed or "user")[:64]


async def _generate_unique_username(db: AsyncSession, seed: str) -> str:
    candidate = seed[:80]
    suffix = 1

    while True:
        exists = await db.execute(select(User.id).where(User.username == candidate))
        if exists.scalar_one_or_none() is None:
            return candidate

        suffix_str = f"_{suffix}"
        candidate = f"{seed[: 80 - len(suffix_str)]}{suffix_str}"
        suffix += 1


@router.post("/subscribe", response_model=MarketplaceSubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def marketplace_subscribe(
    payload: MarketplaceSubscriptionRequest,
    db: AsyncSession = Depends(get_db),
):
    if payload.bot_field:
        return MarketplaceSubscriptionResponse(
            message="Request accepted.",
            activation_sent=False,
            login_url=settings.MARKETPLACE_LOGIN_URL,
        )

    normalized_email = payload.email.strip().lower()

    existing_user_result = await db.execute(
        select(User.id).where(func.lower(User.email) == normalized_email)
    )
    if existing_user_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please sign in or reset your password.",
        )

    org = Organisation(
        name=payload.organisation.strip(),
        analyst=payload.name.strip(),
        currency_symbol="R",
        subscription_tier=payload.plan_code,
        subscription_status="active",
    )
    db.add(org)
    await db.flush()

    username_seed = _username_seed_from_email(normalized_email)
    username = await _generate_unique_username(db, username_seed)
    temporary_password = _generate_temporary_password()

    admin_user = User(
        org_id=org.id,
        username=username,
        email=normalized_email,
        password_hash=hash_password(temporary_password),
        full_name=payload.name.strip(),
        role=UserRole.administrator,
        is_active=True,
        must_change_password=True,
        terms_accepted=False,
    )
    db.add(admin_user)

    await seed_organisation_defaults(db, org.id)
    await db.commit()

    plan_label = PLAN_LABELS.get(payload.plan_code, "Professional")
    activation_sent = send_activation_email(
        recipient_email=normalized_email,
        recipient_name=payload.name.strip(),
        organisation_name=org.name,
        temporary_password=temporary_password,
        login_url=settings.MARKETPLACE_LOGIN_URL,
        plan_label=plan_label,
    )

    logger.info(
        "Marketplace provisioning completed: org_id=%s email=%s plan=%s source=%s users=%s activation_sent=%s",
        org.id,
        normalized_email,
        payload.plan_code,
        payload.source,
        payload.users,
        activation_sent,
    )

    message = (
        "Organisation provisioned and activation sent."
        if activation_sent
        else "Organisation provisioned. Activation email is pending; support will follow up."
    )

    return MarketplaceSubscriptionResponse(
        message=message,
        activation_sent=activation_sent,
        login_url=settings.MARKETPLACE_LOGIN_URL,
    )
