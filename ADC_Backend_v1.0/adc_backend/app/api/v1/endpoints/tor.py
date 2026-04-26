from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from app.db.session import get_db
from app.models.tor import TOR, TORDeliverable, TORStakeholder
from app.core.dependencies import get_current_org_id, get_current_user
from app.schemas.tor import TORUpsert, TOROut
from app.models.user import User

router = APIRouter()

@router.get("", response_model=TOROut)
async def get_tor(org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TOR).where(TOR.org_id == org_id))
    tor = result.scalar_one_or_none()
    if not tor:
        raise HTTPException(status_code=404, detail="TOR not found — create one first")
    d = await db.execute(select(TORDeliverable).where(TORDeliverable.tor_id == tor.id).order_by(TORDeliverable.sort_order))
    s = await db.execute(select(TORStakeholder).where(TORStakeholder.tor_id == tor.id).order_by(TORStakeholder.sort_order))
    deliverables = [{"id": r.id, "description": r.description, "due_date": r.due_date, "sort_order": r.sort_order} for r in d.scalars().all()]
    stakeholders = [{"id": r.id, "full_name": r.full_name, "role": r.role, "responsibility": r.responsibility, "sort_order": r.sort_order} for r in s.scalars().all()]
    return {**{c.name: getattr(tor, c.name) for c in TOR.__table__.columns}, "deliverables": deliverables, "stakeholders": stakeholders}

@router.put("", response_model=TOROut)
async def upsert_tor(
    payload: TORUpsert,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TOR).where(TOR.org_id == org_id))
    tor = result.scalar_one_or_none()
    fields = payload.model_dump(exclude={"deliverables", "stakeholders"}, exclude_none=True)
    if tor:
        await db.execute(update(TOR).where(TOR.id == tor.id).values(**fields))
        tor_id = tor.id
    else:
        new_tor = TOR(org_id=org_id, created_by=current_user.id, **fields)
        db.add(new_tor)
        await db.flush()
        tor_id = new_tor.id
    # Replace deliverables and stakeholders
    await db.execute(delete(TORDeliverable).where(TORDeliverable.tor_id == tor_id))
    await db.execute(delete(TORStakeholder).where(TORStakeholder.tor_id == tor_id))
    for item in payload.deliverables:
        db.add(TORDeliverable(tor_id=tor_id, **item.model_dump()))
    for item in payload.stakeholders:
        db.add(TORStakeholder(tor_id=tor_id, **item.model_dump()))
    await db.commit()
    return await get_tor(org_id, db)
