from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.core.dependencies import get_current_org_id
from app.core.config import settings
from app.api.v1.endpoints.reports import _get_portfolio_data

router = APIRouter()

class AnalysisRequest(BaseModel):
    analysis_type: str = "full"  # full | domain | application
    focus_id: Optional[int] = None
    custom_prompt: Optional[str] = None

@router.post("/analyse")
async def analyse_portfolio(
    payload: AnalysisRequest,
    org_id: int = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="AI analysis service not configured")
    try:
        import anthropic
    except ImportError:
        raise HTTPException(status_code=503, detail="Anthropic library not installed")

    data = await _get_portfolio_data(org_id, db)
    domain_map = {d.id: d.name for d in data["domains"]}

    # Build a concise data summary — no personal data sent to AI
    apps_summary = []
    for app in data["applications"]:
        app_scores = data["scores_map"].get(app.id, {})
        avg = round(sum(app_scores.values()) / len(app_scores), 2) if app_scores else None
        p = data["pricing_map"].get(app.id)
        apps_summary.append({
            "name": app.name,
            "vendor": app.vendor,
            "domain": domain_map.get(app.domain_id),
            "scores": {"business_fit": app_scores.get(0), "technical_health": app_scores.get(1), "cost_efficiency": app_scores.get(2), "risk_level": app_scores.get(3)},
            "avg_score": avg,
            "tco": float(p.licence_cost + p.maintenance_cost + p.implementation_cost) if p else 0,
            "recommendation": str(p.recommendation) if p and p.recommendation else None,
        })

    import json
    context = json.dumps({
        "organisation": data["org"].name,
        "total_applications": len(data["applications"]),
        "open_queries": len(data["open_queries"]),
        "applications": apps_summary,
    }, indent=2)

    system_prompt = """You are a senior ICT governance consultant specialising in South African public sector application portfolio management.
Analyse the portfolio data provided and produce a professional, structured due diligence report.
Your report must include:
1. Executive summary (3-4 sentences)
2. Portfolio health overview with key metrics
3. Domain-by-domain analysis
4. Top 3 applications requiring urgent attention (lowest scores)
5. Top 3 strongest applications (highest scores)
6. Cost observations and value-for-money assessment
7. Prioritised recommendations (numbered list)
8. Suggested next steps for the ICT team
Use professional language appropriate for a government audience. Reference specific application names and scores in your analysis."""

    user_message = payload.custom_prompt or f"Please analyse this application portfolio and produce a comprehensive due diligence report:\n\n{context}"

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return {"analysis": message.content[0].text, "model": message.model, "tokens_used": message.usage.input_tokens + message.usage.output_tokens}
