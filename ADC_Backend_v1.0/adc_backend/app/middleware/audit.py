"""
Audit middleware — logs all mutating API calls to the audit_log table.
Captures user_id, org_id, HTTP method, path, and client IP.
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger(__name__)

AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PATHS = {"/health", "/api/docs", "/api/redoc", "/api/openapi.json"}

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.method in AUDIT_METHODS and request.url.path not in SKIP_PATHS:
            try:
                from app.core.security import decode_token
                from app.db.session import AsyncSessionLocal
                from app.models.audit import AuditLog, AuditAction
                auth = request.headers.get("Authorization", "")
                token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else None
                payload = decode_token(token) if token else None
                user_id = int(payload["sub"]) if payload and "sub" in payload else None
                org_id = payload.get("org_id") if payload else None
                method_map = {"POST": "CREATE", "PUT": "UPDATE", "PATCH": "UPDATE", "DELETE": "DELETE"}
                action_str = method_map.get(request.method, "UPDATE")
                try:
                    action = AuditAction(action_str)
                except ValueError:
                    action = AuditAction.update
                ip = request.client.host if request.client else None
                ua = request.headers.get("user-agent", "")[:300]
                async with AsyncSessionLocal() as db:
                    db.add(AuditLog(
                        user_id=user_id, org_id=org_id,
                        action=action, table_name=request.url.path,
                        ip_address=ip, user_agent=ua,
                    ))
                    await db.commit()
            except Exception as e:
                logger.warning(f"Audit log failed: {e}")
        return response
