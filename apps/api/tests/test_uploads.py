from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core import uploads as upload_config
from app.core.config import settings
from app.core.security import create_customer_token
from app.db.mongo import get_db
from app.main import app
from tests.fakes import FakeDB


client = TestClient(app)


def seed_user(fake_db: FakeDB, user_id: str = "user-1") -> str:
    fake_db["users"].docs.append(
        {
            "_id": user_id,
            "phone": "0393232697",
            "is_active": True,
            "phone_verified": True,
        }
    )
    token, _ = create_customer_token(user_id)
    return token


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def write_fake_jpeg(path: Path, size: int = 16) -> int:
    payload = b"\xFF\xD8\xFF" + b"0" * max(0, size - 3)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    return len(payload)


def test_direct_upload_rejects_over_limit() -> None:
    fake_db = FakeDB()
    token = seed_user(fake_db)
    session_id = "sess-1"
    fake_db["upload_sessions"].docs.append(
        {
            "_id": session_id,
            "user_id": "user-1",
            "status": "open",
            "max_files": 1,
            "max_bytes": 5,
            "counts": {"total_keys": 0, "valid_images": 0, "rejected": 0, "total_bytes": 0},
        }
    )

    app.dependency_overrides[get_db] = lambda: fake_db
    original_backend = settings.storage_backend
    settings.storage_backend = "local"
    try:
        response = client.post(
            f"/api/v1/uploads/sessions/{session_id}/direct",
            files={"file": ("photo.jpg", b"\xFF\xD8\xFF" + b"1234567890", "image/jpeg")},
            headers=auth_headers(token),
        )
    finally:
        settings.storage_backend = original_backend
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 400


def test_direct_upload_updates_counts_and_skips_duplicate_batch() -> None:
    fake_db = FakeDB()
    token = seed_user(fake_db)
    session_id = "sess-3"
    fake_db["upload_sessions"].docs.append(
        {
            "_id": session_id,
            "user_id": "user-1",
            "status": "open",
            "max_files": 5,
            "max_bytes": 1_000_000,
            "counts": {"total_keys": 0, "valid_images": 0, "rejected": 0, "total_bytes": 0},
            "counted_keys": [],
        }
    )

    original_upload_dir = upload_config.UPLOADS_DIR
    tmp_upload_dir = Path("tests/.tmp-upload-test") / uuid4().hex
    upload_config.UPLOADS_DIR = tmp_upload_dir

    app.dependency_overrides[get_db] = lambda: fake_db
    original_backend = settings.storage_backend
    settings.storage_backend = "local"
    try:
        response = client.post(
            f"/api/v1/uploads/sessions/{session_id}/direct",
            files={"file": ("photo.jpg", b"\xFF\xD8\xFF" + b"12345", "image/jpeg")},
            headers=auth_headers(token),
        )
        assert response.status_code == 200
        key = response.json()["key"]

        session = fake_db["upload_sessions"].docs[0]
        assert session["counts"]["total_keys"] == 1
        assert session["counts"]["valid_images"] == 1
        assert session["counts"]["total_bytes"] > 0
        assert key in session.get("counted_keys", [])

        batch = client.post(
            f"/api/v1/uploads/sessions/{session_id}/complete-batch",
            json={"keys": [key]},
            headers=auth_headers(token),
        )
        assert batch.status_code == 200
        payload = batch.json()
        assert payload["total_keys"] == 1
        assert payload["valid_images"] == 1
        assert payload["rejected"] == 0
    finally:
        settings.storage_backend = original_backend
        app.dependency_overrides.pop(get_db, None)
        upload_config.UPLOADS_DIR = original_upload_dir
        if tmp_upload_dir.exists():
            for item in tmp_upload_dir.rglob("*"):
                if item.is_file():
                    item.unlink()
            for item in sorted(tmp_upload_dir.rglob("*"), reverse=True):
                if item.is_dir():
                    item.rmdir()
            if tmp_upload_dir.exists():
                tmp_upload_dir.rmdir()


def test_complete_batch_enforces_limits_and_removes_excess() -> None:
    fake_db = FakeDB()
    token = seed_user(fake_db)
    session_id = "sess-2"
    fake_db["upload_sessions"].docs.append(
        {
            "_id": session_id,
            "user_id": "user-1",
            "status": "open",
            "max_files": 1,
            "max_bytes": 1000,
            "counts": {"total_keys": 0, "valid_images": 0, "rejected": 0, "total_bytes": 0},
        }
    )

    original_upload_dir = upload_config.UPLOADS_DIR
    tmp_upload_dir = Path("tests/.tmp-upload-test") / uuid4().hex
    upload_config.UPLOADS_DIR = tmp_upload_dir

    key1 = "user-uploads/user-1/sess-2/photo-1.jpg"
    key2 = "user-uploads/user-1/sess-2/photo-2.jpg"
    size1 = write_fake_jpeg(tmp_upload_dir / key1)
    write_fake_jpeg(tmp_upload_dir / key2)

    app.dependency_overrides[get_db] = lambda: fake_db
    original_backend = settings.storage_backend
    settings.storage_backend = "local"
    try:
        response = client.post(
            f"/api/v1/uploads/sessions/{session_id}/complete-batch",
            json={"keys": [key1, key2]},
            headers=auth_headers(token),
        )
    finally:
        settings.storage_backend = original_backend
        app.dependency_overrides.pop(get_db, None)
        upload_config.UPLOADS_DIR = original_upload_dir
        if tmp_upload_dir.exists():
            for item in tmp_upload_dir.rglob("*"):
                if item.is_file():
                    item.unlink()
            for item in sorted(tmp_upload_dir.rglob("*"), reverse=True):
                if item.is_dir():
                    item.rmdir()
            if tmp_upload_dir.exists():
                tmp_upload_dir.rmdir()

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_keys"] == 1
    assert payload["valid_images"] == 1
    assert payload["rejected"] == 1
    assert payload["total_bytes"] == size1
    assert not (tmp_upload_dir / key2).exists()
