"""
Seed script — creates the first organisation, admin user, default domains,
and default scoring criteria. Run once after deploying to a fresh database.

Usage:
    python -m app.services.seed
or via Railway:
    railway run python -m app.services.seed
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.config import settings
from app.core.security import hash_password
from app.models.organisation import Organisation
from app.models.user import User
from app.models.domain import Domain
from app.models.criterion import ScoringCriterion
import app.models  # noqa — register all models
from app.db.session import Base

DEFAULT_DOMAINS = [
    "Finance & Accounting", "Human Resources", "Operations",
    "Customer Management", "Supply Chain", "IT Infrastructure",
    "Compliance & Risk", "Analytics & BI", "Marketing & Sales",
]

DEFAULT_CRITERIA = [
    ("Business Fit", 0, 25.0),
    ("Technical Health", 1, 25.0),
    ("Cost Efficiency", 2, 25.0),
    ("Risk Level", 3, 25.0),
]

async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as db:
        # Check if already seeded
        from sqlalchemy import select, func
        count = await db.execute(select(func.count()).select_from(Organisation))
        if count.scalar() > 0:
            print("Database already seeded. Skipping.")
            return

        print("Seeding database...")

        # Organisation
        org = Organisation(
            name="My Organisation",
            department="ICT Directorate",
            analyst="System Administrator",
            reference_no="ADC-2026-001",
            financial_year="2025/2026",
            currency_symbol="R",
            subscription_tier="professional",
            subscription_status="active",
        )
        db.add(org)
        await db.flush()

        # Admin user
        admin = User(
            org_id=org.id,
            username="admin",
            email="admin@adc.local",
            password_hash=hash_password("ChangeMe@2026"),
            full_name="System Administrator",
            role="administrator",
            is_active=True,
            terms_accepted=True,
        )
        db.add(admin)

        # Domains
        for i, name in enumerate(DEFAULT_DOMAINS):
            db.add(Domain(org_id=org.id, name=name, sort_order=i))

        # Criteria
        for label, idx, weight in DEFAULT_CRITERIA:
            db.add(ScoringCriterion(org_id=org.id, criterion_index=idx, label=label, weight_pct=weight, sort_order=idx))

        await db.commit()
        print(f"Seed complete.")
        print(f"  Organisation : {org.name} (id={org.id})")
        print(f"  Admin login  : admin@adc.local / ChangeMe@2026")
        print(f"  Domains      : {len(DEFAULT_DOMAINS)} created")
        print(f"  Criteria     : {len(DEFAULT_CRITERIA)} created")
        print()
        print("IMPORTANT: Change the admin password immediately after first login.")

if __name__ == "__main__":
    asyncio.run(seed())
