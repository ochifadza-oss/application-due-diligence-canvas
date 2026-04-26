from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class PricingUpsert(BaseModel):
    licence_cost: Decimal = Decimal("0")
    maintenance_cost: Decimal = Decimal("0")
    implementation_cost: Decimal = Decimal("0")
    score_weight: Decimal = Decimal("100")
    recommendation: Optional[str] = None
    notes: Optional[str] = None

class PricingOut(PricingUpsert):
    id: int
    app_id: int
    total_cost: Decimal = Decimal("0")
    class Config:
        from_attributes = True
