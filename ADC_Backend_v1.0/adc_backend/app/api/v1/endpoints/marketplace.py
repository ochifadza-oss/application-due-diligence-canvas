import logging
import re
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import get_db
from app.models.organisation import Organisation
from app.models.user import User, UserRole
from app.schemas.marketplace import MarketplaceSubscriptionRequest, MarketplaceSubscriptionResponse
from app.services.notifications import send_activation_email
from app.services.provisioning import seed_organisation_defaults

router = APIRouter()
logger = logging.getLogger(__name__)

PLAN_LABELS = {
    "starter": "Starter",
    "professional": "Professional",
    "enterprise": "Enterprise",
}


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
