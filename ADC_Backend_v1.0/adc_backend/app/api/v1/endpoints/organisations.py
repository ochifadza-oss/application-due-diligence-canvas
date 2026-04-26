from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi.responses import Response

from app.db.session import get_db
from app.models.organisation import Organisation
from app.models.criterion import ScoringCriterion
from app.core.dependencies import get_current_user, get_current_org_id
from app.schemas.organisation import OrgSettings, OrgOut
from app.models.user import User

router = APIRouter()

DEFAULT_CRITERIA = ["Business Fit", "Technical Health", "Cost Efficiency", "Risk Level"]

@router.get("", response_model=OrgOut)
async def get_organisation(org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    out = OrgOut.model_validate(org)
    out.has_logo = org.logo is not None
    return out

@router.put("", response_model=OrgOut)
async def update_organisation(
    payload: OrgSettings,
    org_id: int = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(update(Organisation).where(Organisation.id == org_id).values(**payload.model_dump(exclude_none=True)))
    await db.commit()
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one()
    out = OrgOut.model_validate(org)
    out.has_logo = org.logo is not None
    return out

@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    org_id: int = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ("image/png", "image/jpeg", "image/jpg"):
        raise HTTPException(status_code=400, detail="Only PNG and JPEG images are accepted")
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Logo must be under 2MB")
    await db.execute(update(Organisation).where(Organisation.id == org_id).values(logo=content, logo_mime_type=file.content_type))
    await db.commit()
    return {"message": "Logo uploaded successfully"}

@router.get("/logo")
async def get_logo(org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organisation.logo, Organisation.logo_mime_type).where(Organisation.id == org_id))
    row = result.one_or_none()
    if not row or not row.logo:
        raise HTTPException(status_code=404, detail="No logo found")
    return Response(content=row.logo, media_type=row.logo_mime_type)

@router.get("/criteria")
async def get_criteria(org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScoringCriterion).where(ScoringCriterion.org_id == org_id).order_by(ScoringCriterion.sort_order))
    criteria = result.scalars().all()
    if not criteria:
        return [{"criterion_index": i, "label": lbl, "weight_pct": 25.0} for i, lbl in enumerate(DEFAULT_CRITERIA)]
    return [{"id": c.id, "criterion_index": c.criterion_index, "label": c.label, "weight_pct": float(c.weight_pct)} for c in criteria]

@router.put("/criteria")
async def update_criteria(
    criteria: list,
    org_id: int = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import delete
    await db.execute(delete(ScoringCriterion).where(ScoringCriterion.org_id == org_id))
    for item in criteria:
        db.add(ScoringCriterion(
            org_id=org_id,
            criterion_index=item["criterion_index"],
            label=item["label"],
            weight_pct=item.get("weight_pct", 25.0),
            sort_order=item.get("sort_order", item["criterion_index"]),
        ))
    await db.commit()
    return {"message": "Criteria updated"}
