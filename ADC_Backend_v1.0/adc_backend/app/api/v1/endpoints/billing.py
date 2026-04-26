from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.models.organisation import Organisation
from app.core.dependencies import get_current_org_id, require_role
from app.core.config import settings
from app.models.user import User

router = APIRouter()

TIER_PRICES = {
    "starter": settings.STRIPE_PRICE_STARTER,
    "professional": settings.STRIPE_PRICE_PROFESSIONAL,
    "enterprise": settings.STRIPE_PRICE_ENTERPRISE,
}

class CheckoutRequest(BaseModel):
    tier: str
    success_url: str
    cancel_url: str

@router.post("/checkout")
async def create_checkout(
    payload: CheckoutRequest,
    org_id: int = Depends(get_current_org_id),
    _: User = Depends(require_role("administrator")),
    db: AsyncSession = Depends(get_db),
):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Billing not configured")
    if payload.tier not in TIER_PRICES:
        raise HTTPException(status_code=400, detail=f"Invalid tier. Choose from: {list(TIER_PRICES.keys())}")
    price_id = TIER_PRICES[payload.tier]
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Price not configured for tier: {payload.tier}")
    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        result = await db.execute(select(Organisation).where(Organisation.id == org_id))
        org = result.scalar_one()
        # Get or create Stripe customer
        if not org.stripe_customer_id:
            customer = stripe.Customer.create(name=org.name, metadata={"org_id": str(org_id)})
            await db.execute(update(Organisation).where(Organisation.id == org_id).values(stripe_customer_id=customer.id))
            await db.commit()
            customer_id = customer.id
        else:
            customer_id = org.stripe_customer_id
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=payload.success_url,
            cancel_url=payload.cancel_url,
            metadata={"org_id": str(org_id), "tier": payload.tier},
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Billing error: {str(e)}")

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: AsyncSession = Depends(get_db)):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")
    payload = await request.body()
    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        event = stripe.Webhook.construct_event(payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        meta = event["data"]["object"].get("metadata", {})
        org_id = int(meta.get("org_id", 0))
        tier = meta.get("tier", "starter")
        if org_id:
            await db.execute(update(Organisation).where(Organisation.id == org_id).values(
                subscription_tier=tier, subscription_status="active"
            ))
            await db.commit()
    elif event["type"] == "customer.subscription.deleted":
        customer_id = event["data"]["object"].get("customer")
        if customer_id:
            await db.execute(update(Organisation).where(Organisation.stripe_customer_id == customer_id).values(subscription_status="cancelled"))
            await db.commit()
    elif event["type"] == "invoice.payment_failed":
        customer_id = event["data"]["object"].get("customer")
        if customer_id:
            await db.execute(update(Organisation).where(Organisation.stripe_customer_id == customer_id).values(subscription_status="payment_failed"))
            await db.commit()
    return {"received": True}

@router.get("/status")
async def billing_status(org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organisation.subscription_tier, Organisation.subscription_status).where(Organisation.id == org_id))
    row = result.one_or_none()
    return {"tier": row.subscription_tier if row else None, "status": row.subscription_status if row else None}
