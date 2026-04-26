"""
Core dependency injection.
CRITICAL: org_id is ALWAYS sourced from the authenticated JWT.
Never trust org_id from request body or query params — this enforces tenant isolation.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise exc
    user_id = payload.get("sub")
    if not user_id:
        raise exc
    result = await db.execute(select(User).where(User.id == int(user_id), User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise exc
    return user

async def get_current_org_id(current_user: User = Depends(get_current_user)) -> int:
    if not current_user.org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not assigned to an organisation")
    return current_user.org_id

def require_role(*roles: str):
    async def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Required roles: {list(roles)}")
        return current_user
    return checker
