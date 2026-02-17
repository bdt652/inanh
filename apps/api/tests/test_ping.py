from fastapi.testclient import TestClient

from app.db.mongo import get_db
from app.main import app
from tests.fakes import FakeDB


def test_ping_ok_when_database_reachable() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB(ping_ok=True)
    try:
        client = TestClient(app)
        response = client.get("/api/v1/ping")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 200
    assert response.json() == {"pong": True}


def test_ping_returns_503_when_database_unreachable() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB(ping_ok=False)
    try:
        client = TestClient(app)
        response = client.get("/api/v1/ping")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 503
