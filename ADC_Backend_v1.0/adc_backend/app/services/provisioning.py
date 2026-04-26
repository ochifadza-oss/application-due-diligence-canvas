from sqlalchemy.ext.asyncio import AsyncSession

from app.models.criterion import ScoringCriterion
from app.models.domain import Domain

DEFAULT_DOMAINS = [
    "Finance & Accounting",
    "Human Resources",
    "Operations",
    "Customer Management",
    "Supply Chain",
    "IT Infrastructure",
    "Compliance & Risk",
    "Analytics & BI",
    "Marketing & Sales",
]

DEFAULT_CRITERIA = [
    ("Business Fit", 0, 25.0),
    ("Technical Health", 1, 25.0),
    ("Cost Efficiency", 2, 25.0),
    ("Risk Level", 3, 25.0),
]


async def seed_organisation_defaults(db: AsyncSession, org_id: int) -> None:
    for index, name in enumerate(DEFAULT_DOMAINS):
        db.add(Domain(org_id=org_id, name=name, sort_order=index))

    for label, index, weight in DEFAULT_CRITERIA:
        db.add(
            ScoringCriterion(
                org_id=org_id,
                criterion_index=index,
                label=label,
                weight_pct=weight,
                sort_order=index,
            )
        )
