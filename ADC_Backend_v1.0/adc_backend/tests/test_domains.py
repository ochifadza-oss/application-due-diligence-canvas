import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

async def _get_token(client, email="admin@test.gov.za", pwd="Admin@1234"):
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    return r.json()["access_token"]

async def test_list_domains_empty(client: AsyncClient, seed_org_and_user):
    token = await _get_token(client)
    r = await client.get("/api/v1/domains", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)

async def test_create_domain(client: AsyncClient, seed_org_and_user):
    token = await _get_token(client)
    r = await client.post("/api/v1/domains", json={"name": "Finance & Accounting", "sort_order": 0},
                          headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Finance & Accounting"
    assert data["org_id"] == seed_org_and_user["org_id"]

async def test_update_domain(client: AsyncClient, seed_org_and_user):
    token = await _get_token(client)
    create = await client.post("/api/v1/domains", json={"name": "Old Name", "sort_order": 1},
                               headers={"Authorization": f"Bearer {token}"})
    domain_id = create.json()["id"]
    r = await client.put(f"/api/v1/domains/{domain_id}", json={"name": "New Name"},
                         headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["name"] == "New Name"

async def test_delete_domain(client: AsyncClient, seed_org_and_user):
    token = await _get_token(client)
    create = await client.post("/api/v1/domains", json={"name": "To Delete", "sort_order": 9},
                               headers={"Authorization": f"Bearer {token}"})
    domain_id = create.json()["id"]
    r = await client.delete(f"/api/v1/domains/{domain_id}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 204

async def test_tenant_isolation(client: AsyncClient, db_session):
    """Two orgs must not see each other's domains."""
    from app.models.organisation import Organisation
    from app.models.user import User
    from app.core.security import hash_password
    # Org B
    org_b = Organisation(name="Org B", currency_symbol="R", subscription_tier="starter", subscription_status="active")
    db_session.add(org_b)
    await db_session.flush()
    user_b = User(org_id=org_b.id, username="userb", email="userb@other.gov.za",
                  password_hash=hash_password("UserB@1234"), full_name="User B",
                  role="administrator", is_active=True, terms_accepted=True)
    db_session.add(user_b)
    await db_session.commit()

    # Admin (Org A) creates a domain
    token_a = await _get_token(client)
    await client.post("/api/v1/domains", json={"name": "Org A Only Domain", "sort_order": 0},
                      headers={"Authorization": f"Bearer {token_a}"})

    # User B logs in and lists domains — must not see Org A's domain
    login_b = await client.post("/api/v1/auth/login", json={"email": "userb@other.gov.za", "password": "UserB@1234"})
    token_b = login_b.json()["access_token"]
    r = await client.get("/api/v1/domains", headers={"Authorization": f"Bearer {token_b}"})
    assert r.status_code == 200
    names = [d["name"] for d in r.json()]
    assert "Org A Only Domain" not in names
