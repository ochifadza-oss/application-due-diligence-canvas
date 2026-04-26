from fastapi import APIRouter
from app.api.v1.endpoints import auth, organisations, domains, applications, pricing, queries, tor, reports, ai_analysis, users, billing, marketplace

api_router = APIRouter()
api_router.include_router(auth.router,          prefix="/auth",           tags=["authentication"])
api_router.include_router(organisations.router, prefix="/org",            tags=["organisation"])
api_router.include_router(domains.router,       prefix="/domains",        tags=["domains"])
api_router.include_router(applications.router,  prefix="/applications",   tags=["applications"])
api_router.include_router(pricing.router,       prefix="/pricing",        tags=["pricing"])
api_router.include_router(queries.router,       prefix="/queries",        tags=["queries"])
api_router.include_router(tor.router,           prefix="/tor",            tags=["terms-of-reference"])
api_router.include_router(reports.router,       prefix="/reports",        tags=["reports"])
api_router.include_router(ai_analysis.router,   prefix="/ai",             tags=["ai-analysis"])
api_router.include_router(users.router,         prefix="/users",          tags=["users"])
api_router.include_router(billing.router,       prefix="/billing",        tags=["billing"])
api_router.include_router(marketplace.router,   prefix="/marketplace",    tags=["marketplace"])
