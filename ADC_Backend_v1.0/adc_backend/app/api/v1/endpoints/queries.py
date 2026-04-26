from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime
from typing import List, Optional

from app.db.session import get_db
from app.models.query import Query, QueryResponse
from app.models.application import Application
from app.models.domain import Domain
from app.core.dependencies import get_current_org_id, get_current_user
from app.schemas.query import QueryCreate, QueryUpdate, ResponseCreate, QueryOut, ResponseOut
from app.models.user import User

router = APIRouter()

async def _build_query_out(q: Query, db: AsyncSession) -> QueryOut:
    app_name = None
    if q.app_id:
        r = await db.execute(select(Application.name).where(Application.id == q.app_id))
        app_name = r.scalar()
    responses = [ResponseOut(id=r.id, response_text=r.response_text, author=r.author, created_at=r.created_at)
                 for r in (q.responses or [])]
    return QueryOut(
        id=q.id, org_id=q.org_id, app_id=q.app_id, app_name=app_name,
        title=q.title, description=q.description, priority=q.priority,
        category=q.category, status=q.status, workflow_step=q.workflow_step,
        assignee=q.assignee, due_date=q.due_date, created_at=q.created_at,
        responses=responses
    )

@router.get("", response_model=List[QueryOut])
async def list_queries(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    org_id: int = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    q = select(Query).where(Query.org_id == org_id)
    if status:
        q = q.where(Query.status == status)
    if priority:
        q = q.where(Query.priority == priority)
    result = await db.execute(q.order_by(Query.created_at.desc()))
    queries = result.scalars().all()
    # Eagerly load responses
    for query in queries:
        r = await db.execute(select(QueryResponse).where(QueryResponse.query_id == query.id).order_by(QueryResponse.created_at))
        query.responses = r.scalars().all()
    return [await _build_query_out(q, db) for q in queries]

@router.post("", response_model=QueryOut, status_code=201)
async def create_query(
    payload: QueryCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.app_id:
        q = select(Application).join(Domain).where(Application.id == payload.app_id, Domain.org_id == org_id)
        if not (await db.execute(q)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Application not found in your organisation")
    query = Query(org_id=org_id, raised_by=current_user.id, **payload.model_dump())
    db.add(query)
    await db.commit()
    await db.refresh(query)
    query.responses = []
    return await _build_query_out(query, db)

@router.get("/stats")
async def query_stats(org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    result = await db.execute(select(Query.status, func.count()).where(Query.org_id == org_id).group_by(Query.status))
    counts = {row[0]: row[1] for row in result.all()}
    return {
        "open": counts.get("Open", 0),
        "in_progress": counts.get("In Progress", 0),
        "escalated": counts.get("Escalated", 0),
        "resolved": counts.get("Resolved", 0),
        "total": sum(counts.values()),
    }

@router.put("/{query_id}", response_model=QueryOut)
async def update_query(
    query_id: int, payload: QueryUpdate,
    org_id: int = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Query).where(Query.id == query_id, Query.org_id == org_id))
    query = result.scalar_one_or_none()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    updates = payload.model_dump(exclude_none=True)
    if updates.get("status") == "Resolved" and query.status != "Resolved":
        updates["resolved_at"] = datetime.utcnow()
    await db.execute(update(Query).where(Query.id == query_id).values(**updates))
    await db.commit()
    await db.refresh(query)
    r = await db.execute(select(QueryResponse).where(QueryResponse.query_id == query_id).order_by(QueryResponse.created_at))
    query.responses = r.scalars().all()
    return await _build_query_out(query, db)

@router.post("/{query_id}/responses", response_model=ResponseOut, status_code=201)
async def add_response(
    query_id: int, payload: ResponseCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Query).where(Query.id == query_id, Query.org_id == org_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Query not found")
    resp = QueryResponse(query_id=query_id, responded_by=current_user.id, **payload.model_dump())
    db.add(resp)
    await db.commit()
    await db.refresh(resp)
    return ResponseOut(id=resp.id, response_text=resp.response_text, author=resp.author, created_at=resp.created_at)

@router.delete("/{query_id}", status_code=204)
async def delete_query(query_id: int, org_id: int = Depends(get_current_org_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Query).where(Query.id == query_id, Query.org_id == org_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Query not found")
    from sqlalchemy import delete as sql_delete
    await db.execute(sql_delete(QueryResponse).where(QueryResponse.query_id == query_id))
    await db.execute(sql_delete(Query).where(Query.id == query_id))
    await db.commit()
