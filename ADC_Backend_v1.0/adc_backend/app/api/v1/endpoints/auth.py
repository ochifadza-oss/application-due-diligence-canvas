import re

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.core.security import verify_password, hash_password, create_access_token, create_refresh_token, decode_token
from app.core.dependencies import get_current_user
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest, TermsAcceptRequest, ChangePasswordRequest

router = APIRouter()


def _assert_password_policy(password: str) -> None:
    if len(password) < 10:
        raise HTTPException(status_code=400, detail="New password must be at least 10 characters long")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="New password must include at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="New password must include at least one lowercase letter")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="New password must include at least one number")
    if not re.search(r"[^A-Za-z0-9]", password):
        raise HTTPException(status_code=400, detail="New password must include at least one special character")

@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token_data = {"sub": str(user.id), "org_id": user.org_id, "role": user.role}
    await db.execute(update(User).where(User.id == user.id).values(last_login=datetime.utcnow()))
    await db.commit()
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        full_name=user.full_name,
        role=user.role,
        org_id=user.org_id,
        terms_accepted=bool(user.terms_accepted),
        must_change_password=bool(user.must_change_password),
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    result = await db.execute(select(User).where(User.id == int(data["sub"]), User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    token_data = {"sub": str(user.id), "org_id": user.org_id, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        full_name=user.full_name,
        role=user.role,
        org_id=user.org_id,
        terms_accepted=bool(user.terms_accepted),
        must_change_password=bool(user.must_change_password),
    )

@router.post("/accept-terms")
async def accept_terms(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(update(User).where(User.id == current_user.id).values(
        terms_accepted=True, terms_accepted_at=datetime.utcnow()
    ))
    await db.commit()
    return {"message": "Terms accepted successfully"}


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    _assert_password_policy(payload.new_password)

    await db.execute(
        update(User).where(User.id == current_user.id).values(
            password_hash=hash_password(payload.new_password),
            must_change_password=False,
        )
    )
    await db.commit()

    return {"message": "Password changed successfully"}

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "org_id": current_user.org_id,
        "terms_accepted": current_user.terms_accepted,
        "must_change_password": current_user.must_change_password,
    }
