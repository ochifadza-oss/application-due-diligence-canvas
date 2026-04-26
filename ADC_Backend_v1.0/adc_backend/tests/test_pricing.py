import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

async def _setup(client):
    login = await client.post("/api/v1/auth/login", json={"email": "admin@test.gov.za", "password": "Admin@1234"})
    token = login.json()["access_token"]
    hdrs = {"Authorization": f"Bearer {token}"}
    domain = await client.post("/api/v1/domains", json={"name": "HR", "sort_order": 1}, headers=hdrs)
    app = await client.post("/api/v1/applications",
                            json={"domain_id": domain.json()["id"], "name": "PERSAL"}, headers=hdrs)
    return token, app.json()["id"]

async def test_upsert_pricing(client: AsyncClient, seed_org_and_user):
    token, app_id = await _setup(client)
    r = await client.put(f"/api/v1/pricing/{app_id}",
                         json={"licence_cost": "120000", "maintenance_cost": "24000",
                               "implementation_cost": "0", "score_weight": "100", "recommendation": "Keep"},
                         headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert float(data["licence_cost"]) == 120000.0
    assert float(data["total_cost"]) == 144000.0
    assert data["recommendation"] == "Keep"

async def test_update_pricing(client: AsyncClient, seed_org_and_user):
    token, app_id = await _setup(client)
    await client.put(f"/api/v1/pricing/{app_id}",
                     json={"licence_cost": "50000", "maintenance_cost": "10000",
                           "implementation_cost": "5000", "score_weight": "100"},
                     headers={"Authorization": f"Bearer {token}"})
    r = await client.put(f"/api/v1/pricing/{app_id}",
                         json={"licence_cost": "60000", "maintenance_cost": "12000",
                               "implementation_cost": "5000", "score_weight": "100", "recommendation": "Upgrade"},
                         headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert float(r.json()["licence_cost"]) == 60000.0
    assert r.json()["recommendation"] == "Upgrade"
