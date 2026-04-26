from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from typing import List

from app.db.session import get_db
from app.models.domain import Domain
from app.models.application import Application
from app.models.score import Score
from app.core.dependencies import get_current_org_id
from app.schemas.domain import DomainCreate, DomainUpdate, DomainOut

router = APIRouter()

@router.get("", response_model=List[DomainOut])
async def list_domains(org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Domain).where(Domain.org_id == org_id, Domain.is_active == True).order_by(Domain.sort_order)
    )
    domains = result.scalars().all()
    out = []
    for d in domains:
        # Count apps
        cnt = await db.execute(select(func.count()).where(Application.domain_id == d.id, Application.is_active == True))
        app_count = cnt.scalar() or 0
        # Average score
        avg_q = await db.execute(
            select(func.avg(Score.score)).join(Application, Score.app_id == Application.id)
            .where(Application.domain_id == d.id, Application.is_active == True)
        )
        avg_score = avg_q.scalar()
        out.append(DomainOut(id=d.id, org_id=d.org_id, name=d.name, sort_order=d.sort_order,
                             app_count=app_count, avg_score=round(float(avg_score), 2) if avg_score else None))
    return out

@router.post("", response_model=DomainOut, status_code=201)
async def create_domain(payload: DomainCreate, org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    domain = Domain(org_id=org_id, **payload.model_dump())
    db.add(domain)
    await db.commit()
    await db.refresh(domain)
    return DomainOut(id=domain.id, org_id=domain.org_id, name=domain.name, sort_order=domain.sort_order)

@router.put("/{domain_id}", response_model=DomainOut)
async def update_domain(domain_id: int, payload: DomainUpdate, org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Domain).where(Domain.id == domain_id, Domain.org_id == org_id))
    domain = result.scalar_one_or_none()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    await db.execute(update(Domain).where(Domain.id == domain_id).values(**payload.model_dump(exclude_none=True)))
    await db.commit()
    await db.refresh(domain)
    return DomainOut(id=domain.id, org_id=domain.org_id, name=domain.name, sort_order=domain.sort_order)

@router.delete("/{domain_id}", status_code=204)
async def delete_domain(domain_id: int, org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Domain).where(Domain.id == domain_id, Domain.org_id == org_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Domain not found")
    await db.execute(update(Domain).where(Domain.id == domain_id).values(is_active=False))
    await db.commit()
