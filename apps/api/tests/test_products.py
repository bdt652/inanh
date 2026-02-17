from fastapi.testclient import TestClient

from app.db.mongo import get_db
from app.main import app
from tests.auth_helpers import login_headers, seed_admin
from tests.fakes import FakeDB


client = TestClient(app)


def test_products_create_and_list_from_db() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        headers = login_headers(client)
        created = client.post(
            "/api/v1/products",
            json={"name": "Canvas Print", "price": 12.5, "slug": "canvas-print"},
            headers=headers,
        )
        assert created.status_code == 201
        payload = created.json()
        assert payload["name"] == "Canvas Print"
        assert payload["slug"] == "canvas-print"

        listed = client.get("/api/v1/products")
        assert listed.status_code == 200
        data = listed.json()
        assert len(data) == 1
        assert data[0]["slug"] == "canvas-print"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_products_create_returns_409_for_duplicate_slug() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        headers = login_headers(client)
        first = client.post(
            "/api/v1/products",
            json={"name": "Canvas Print", "price": 12.5, "slug": "canvas-print"},
            headers=headers,
        )
        assert first.status_code == 201

        duplicate = client.post(
            "/api/v1/products",
            json={"name": "Canvas Print 2", "price": 15.5, "slug": "canvas-print"},
            headers=headers,
        )
        assert duplicate.status_code == 409
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_products_create_requires_admin_token() -> None:
    fake_db = FakeDB()
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        response = client.post(
            "/api/v1/products",
            json={"name": "Canvas Print", "price": 12.5, "slug": "canvas-print"},
        )
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 401
