from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List

from app.db.session import get_db
from app.models.pricing import Pricing
from app.models.application import Application
from app.models.domain import Domain
from app.core.dependencies import get_current_org_id, get_current_user
from app.schemas.pricing import PricingUpsert, PricingOut
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[PricingOut])
async def list_pricing(org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    q = select(Pricing).join(Application, Pricing.app_id == Application.id)\
        .join(Domain, Application.domain_id == Domain.id)\
        .where(Domain.org_id == org_id, Application.is_active == True)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [PricingOut(
        id=r.id, app_id=r.app_id,
        licence_cost=r.licence_cost, maintenance_cost=r.maintenance_cost,
        implementation_cost=r.implementation_cost, score_weight=r.score_weight,
        recommendation=r.recommendation, notes=r.notes,
        total_cost=r.licence_cost + r.maintenance_cost + r.implementation_cost
    ) for r in rows]

@router.put("/{app_id}", response_model=PricingOut)
async def upsert_pricing(
    app_id: int, payload: PricingUpsert,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Application).join(Domain).where(Application.id == app_id, Domain.org_id == org_id, Application.is_active == True)
    if not (await db.execute(q)).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Application not found")
    existing = await db.execute(select(Pricing).where(Pricing.app_id == app_id))
    pricing = existing.scalar_one_or_none()
    data = payload.model_dump()
    if pricing:
        await db.execute(update(Pricing).where(Pricing.id == pricing.id).values(**data, captured_by=current_user.id))
        await db.commit()
        await db.refresh(pricing)
    else:
        pricing = Pricing(app_id=app_id, captured_by=current_user.id, **data)
        db.add(pricing)
        await db.commit()
        await db.refresh(pricing)
    return PricingOut(
        id=pricing.id, app_id=pricing.app_id,
        licence_cost=pricing.licence_cost, maintenance_cost=pricing.maintenance_cost,
        implementation_cost=pricing.implementation_cost, score_weight=pricing.score_weight,
        recommendation=pricing.recommendation, notes=pricing.notes,
        total_cost=pricing.licence_cost + pricing.maintenance_cost + pricing.implementation_cost
    )
