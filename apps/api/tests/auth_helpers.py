from fastapi.testclient import TestClient

from app.core.security import create_password_hash
from tests.fakes import FakeDB

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin12345"


def seed_admin(fake_db: FakeDB, username: str = ADMIN_USERNAME, password: str = ADMIN_PASSWORD, is_active: bool = True) -> None:
    salt, password_hash = create_password_hash(password)
    fake_db["admins"].docs.append(
        {
            "username": username,
            "password_salt": salt,
            "password_hash": password_hash,
            "is_active": is_active,
        }
    )


def login_headers(client: TestClient, username: str = ADMIN_USERNAME, password: str = ADMIN_PASSWORD) -> dict[str, str]:
    login = client.post("/api/v1/admin/login", json={"username": username, "password": password})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
