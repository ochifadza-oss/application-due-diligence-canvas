from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List

from app.db.session import get_db
from app.models.user import User
from app.core.dependencies import get_current_org_id, require_role
from app.core.security import hash_password
from app.schemas.user import UserCreate, UserUpdate, UserOut

router = APIRouter()

@router.get("", response_model=List[UserOut])
async def list_users(
    org_id: int = Depends(get_current_org_id),
    _: User = Depends(require_role("administrator", "senior_analyst")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.org_id == org_id, User.is_active == True))
    return result.scalars().all()

@router.post("", response_model=UserOut, status_code=201)
async def create_user(
    payload: UserCreate,
    org_id: int = Depends(get_current_org_id),
    _: User = Depends(require_role("administrator")),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        org_id=org_id,
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int, payload: UserUpdate,
    org_id: int = Depends(get_current_org_id),
    _: User = Depends(require_role("administrator")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id, User.org_id == org_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.execute(update(User).where(User.id == user_id).values(**payload.model_dump(exclude_none=True)))
    await db.commit()
    await db.refresh(user)
    return user
