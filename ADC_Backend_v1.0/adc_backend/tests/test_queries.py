import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

async def _token(client):
    r = await client.post("/api/v1/auth/login", json={"email": "admin@test.gov.za", "password": "Admin@1234"})
    return r.json()["access_token"]

async def test_create_query(client: AsyncClient, seed_org_and_user):
    token = await _token(client)
    r = await client.post("/api/v1/queries",
                          json={"title": "Licence query", "description": "Need clarification", "priority": "High", "category": "Contract"},
                          headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    assert r.json()["title"] == "Licence query"
    assert r.json()["status"] == "Open"
    assert r.json()["workflow_step"] == "Submitted"

async def test_update_query_status(client: AsyncClient, seed_org_and_user):
    token = await _token(client)
    create = await client.post("/api/v1/queries",
                               json={"title": "Status test", "priority": "Medium", "category": "Technical"},
                               headers={"Authorization": f"Bearer {token}"})
    qid = create.json()["id"]
    r = await client.put(f"/api/v1/queries/{qid}",
                         json={"status": "In Progress", "workflow_step": "Acknowledged"},
                         headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["status"] == "In Progress"

async def test_add_response(client: AsyncClient, seed_org_and_user):
    token = await _token(client)
    create = await client.post("/api/v1/queries",
                               json={"title": "Response test", "priority": "Low", "category": "Other"},
                               headers={"Authorization": f"Bearer {token}"})
    qid = create.json()["id"]
    r = await client.post(f"/api/v1/queries/{qid}/responses",
                          json={"response_text": "We are investigating this issue.", "author": "ICT Director"},
                          headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    assert r.json()["author"] == "ICT Director"

async def test_query_stats(client: AsyncClient, seed_org_and_user):
    token = await _token(client)
    r = await client.get("/api/v1/queries/stats", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "open" in data
    assert "resolved" in data

async def test_delete_query(client: AsyncClient, seed_org_and_user):
    token = await _token(client)
    create = await client.post("/api/v1/queries",
                               json={"title": "Delete me", "priority": "Low", "category": "Other"},
                               headers={"Authorization": f"Bearer {token}"})
    qid = create.json()["id"]
    r = await client.delete(f"/api/v1/queries/{qid}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 204
