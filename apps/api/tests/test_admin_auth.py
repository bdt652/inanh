from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.mongo import get_db
from app.main import app
from tests.auth_helpers import ADMIN_PASSWORD, ADMIN_USERNAME, seed_admin
from tests.fakes import FakeDB


client = TestClient(app)


def test_admin_bootstrap_success_for_first_admin() -> None:
    fake_db = FakeDB()
    app.dependency_overrides[get_db] = lambda: fake_db
    original_secret = settings.admin_bootstrap_secret
    settings.admin_bootstrap_secret = "bootstrap-secret"
    try:
        response = client.post(
            "/api/v1/admin/bootstrap",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
            headers={"x-admin-bootstrap-secret": "bootstrap-secret"},
        )
    finally:
        settings.admin_bootstrap_secret = original_secret
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 200
    assert response.json() == {"username": ADMIN_USERNAME}


def test_admin_bootstrap_conflict_when_admin_exists() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    original_secret = settings.admin_bootstrap_secret
    settings.admin_bootstrap_secret = "bootstrap-secret"
    try:
        response = client.post(
            "/api/v1/admin/bootstrap",
            json={"username": "admin2", "password": "admin12345"},
            headers={"x-admin-bootstrap-secret": "bootstrap-secret"},
        )
    finally:
        settings.admin_bootstrap_secret = original_secret
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 409


def test_admin_bootstrap_requires_secret() -> None:
    fake_db = FakeDB()
    app.dependency_overrides[get_db] = lambda: fake_db
    original_secret = settings.admin_bootstrap_secret
    settings.admin_bootstrap_secret = "bootstrap-secret"
    try:
        response = client.post(
            "/api/v1/admin/bootstrap",
            json={"username": "admin2", "password": "admin12345"},
            headers={"x-admin-bootstrap-secret": "wrong-secret"},
        )
    finally:
        settings.admin_bootstrap_secret = original_secret
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 401


def test_admin_login_success() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        response = client.post(
            "/api/v1/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert isinstance(payload["access_token"], str)
    assert len(payload["access_token"].split(".")) == 3


def test_admin_login_invalid_credentials() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        response = client.post(
            "/api/v1/admin/login",
            json={"username": ADMIN_USERNAME, "password": "wrong-password"},
        )
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 401


def test_admin_me_requires_token() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        response = client.get("/api/v1/admin/me")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 401


def test_admin_me_success() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        login = client.post(
            "/api/v1/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
        token = login.json()["access_token"]
        response = client.get("/api/v1/admin/me", headers={"Authorization": f"Bearer {token}"})
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 200
    assert response.json() == {"username": ADMIN_USERNAME}
