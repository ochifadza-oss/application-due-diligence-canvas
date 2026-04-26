import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

async def _setup(client):
    """Login and create a domain, return token + domain_id."""
    login = await client.post("/api/v1/auth/login", json={"email": "admin@test.gov.za", "password": "Admin@1234"})
    token = login.json()["access_token"]
    hdrs = {"Authorization": f"Bearer {token}"}
    domain = await client.post("/api/v1/domains", json={"name": "Finance", "sort_order": 0}, headers=hdrs)
    return token, domain.json()["id"]

async def test_create_application(client: AsyncClient, seed_org_and_user):
    token, domain_id = await _setup(client)
    r = await client.post("/api/v1/applications",
                          json={"domain_id": domain_id, "name": "SAP FI", "vendor": "SAP SE"},
                          headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    assert r.json()["name"] == "SAP FI"

async def test_set_and_retrieve_scores(client: AsyncClient, seed_org_and_user):
    token, domain_id = await _setup(client)
    app_r = await client.post("/api/v1/applications",
                              json={"domain_id": domain_id, "name": "PERSAL", "vendor": "DPSA"},
                              headers={"Authorization": f"Bearer {token}"})
    app_id = app_r.json()["id"]
    hdrs = {"Authorization": f"Bearer {token}"}
    # Set 4 scores
    for idx, score in enumerate([5, 4, 3, 4]):
        r = await client.post(f"/api/v1/applications/{app_id}/scores",
                              json={"criterion_index": idx, "score": score}, headers=hdrs)
        assert r.status_code == 200
    # Retrieve and verify avg
    r = await client.get(f"/api/v1/applications/{app_id}", headers=hdrs)
    data = r.json()
    assert data["scores"] == {"0": 5, "1": 4, "2": 3, "3": 4}
    assert data["avg_score"] == 4.0

async def test_score_out_of_range(client: AsyncClient, seed_org_and_user):
    token, domain_id = await _setup(client)
    app_r = await client.post("/api/v1/applications",
                              json={"domain_id": domain_id, "name": "Test App"},
                              headers={"Authorization": f"Bearer {token}"})
    app_id = app_r.json()["id"]
    r = await client.post(f"/api/v1/applications/{app_id}/scores",
                          json={"criterion_index": 0, "score": 6},
                          headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 400

async def test_delete_application(client: AsyncClient, seed_org_and_user):
    token, domain_id = await _setup(client)
    app_r = await client.post("/api/v1/applications",
                              json={"domain_id": domain_id, "name": "To Delete"},
                              headers={"Authorization": f"Bearer {token}"})
    app_id = app_r.json()["id"]
    r = await client.delete(f"/api/v1/applications/{app_id}",
                            headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 204
