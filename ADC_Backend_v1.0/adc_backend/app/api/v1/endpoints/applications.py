from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from typing import List

from app.db.session import get_db
from app.models.application import Application
from app.models.domain import Domain
from app.models.score import Score
from app.models.pricing import Pricing
from app.core.dependencies import get_current_org_id, get_current_user
from app.schemas.application import AppCreate, AppUpdate, AppOut, ScoreIn
from app.models.user import User

router = APIRouter()

async def _build_app_out(app: Application, db: AsyncSession) -> AppOut:
    scores_q = await db.execute(select(Score).where(Score.app_id == app.id))
    scores_map = {s.criterion_index: s.score for s in scores_q.scalars().all()}
    avg = round(sum(scores_map.values()) / len(scores_map), 2) if scores_map else None
    domain_q = await db.execute(select(Domain.name).where(Domain.id == app.domain_id))
    domain_name = domain_q.scalar()
    return AppOut(id=app.id, domain_id=app.domain_id, domain_name=domain_name,
                  name=app.name, vendor=app.vendor, notes=app.notes,
                  scores=scores_map, avg_score=avg)

@router.get("", response_model=List[AppOut])
async def list_applications(
    domain_id: int = None,
    org_id: int = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    # Security: always join through domains to enforce org_id
    q = select(Application).join(Domain, Application.domain_id == Domain.id)\
        .where(Domain.org_id == org_id, Application.is_active == True, Domain.is_active == True)
    if domain_id:
        q = q.where(Application.domain_id == domain_id)
    result = await db.execute(q.order_by(Application.name))
    apps = result.scalars().all()
    return [await _build_app_out(a, db) for a in apps]

@router.post("", response_model=AppOut, status_code=201)
async def create_application(
    payload: AppCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify domain belongs to this org
    domain_q = await db.execute(select(Domain).where(Domain.id == payload.domain_id, Domain.org_id == org_id))
    if not domain_q.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Domain not found in your organisation")
    app = Application(**payload.model_dump(), created_by=current_user.id)
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return await _build_app_out(app, db)

@router.get("/{app_id}", response_model=AppOut)
async def get_application(app_id: int, org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    q = select(Application).join(Domain).where(Application.id == app_id, Domain.org_id == org_id, Application.is_active == True)
    result = await db.execute(q)
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return await _build_app_out(app, db)

@router.put("/{app_id}", response_model=AppOut)
async def update_application(
    app_id: int, payload: AppUpdate,
    org_id: int = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    q = select(Application).join(Domain).where(Application.id == app_id, Domain.org_id == org_id, Application.is_active == True)
    result = await db.execute(q)
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if payload.domain_id:
        domain_q = await db.execute(select(Domain).where(Domain.id == payload.domain_id, Domain.org_id == org_id))
        if not domain_q.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Domain not found in your organisation")
    await db.execute(update(Application).where(Application.id == app_id).values(**payload.model_dump(exclude_none=True)))
    await db.commit()
    await db.refresh(app)
    return await _build_app_out(app, db)

@router.delete("/{app_id}", status_code=204)
async def delete_application(app_id: int, org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    q = select(Application).join(Domain).where(Application.id == app_id, Domain.org_id == org_id)
    result = await db.execute(q)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Application not found")
    await db.execute(update(Application).where(Application.id == app_id).values(is_active=False))
    await db.commit()

@router.post("/{app_id}/scores")
async def set_score(
    app_id: int, payload: ScoreIn,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not 1 <= payload.score <= 5:
        raise HTTPException(status_code=400, detail="Score must be between 1 and 5")
    # Verify ownership
    q = select(Application).join(Domain).where(Application.id == app_id, Domain.org_id == org_id, Application.is_active == True)
    if not (await db.execute(q)).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Application not found")
    # Upsert score
    existing = await db.execute(select(Score).where(Score.app_id == app_id, Score.criterion_index == payload.criterion_index))
    score_row = existing.scalar_one_or_none()
    if score_row:
        await db.execute(update(Score).where(Score.id == score_row.id).values(score=payload.score, scored_by=current_user.id))
    else:
        db.add(Score(app_id=app_id, criterion_index=payload.criterion_index, score=payload.score, scored_by=current_user.id))
    await db.commit()
    return {"message": "Score saved", "app_id": app_id, "criterion_index": payload.criterion_index, "score": payload.score}
