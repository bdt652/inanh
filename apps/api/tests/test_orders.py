from fastapi.testclient import TestClient

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


def test_orders_block_disallowed_slug() -> None:
    fake_db = FakeDB(
        collections={
            "products": [
                {"_id": "prod-1", "slug": "chi-zalo", "name": "Chi Zalo", "allow_online_order": False},
            ]
        }
    )
    token = seed_user(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        response = client.post(
            "/api/v1/orders",
            json={
                "products": [
                    {
                        "name": "Chi Zalo",
                        "quantity": 1,
                        "images": ["img-1"],
                        "options": [],
                        "selected_product_slug": "chi-zalo",
                    }
                ]
            },
            headers=auth_headers(token),
        )
        assert response.status_code == 400
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_orders_block_disallowed_name_fallback() -> None:
    fake_db = FakeDB(
        collections={
            "products": [
                {"_id": "prod-1", "slug": "chi-zalo", "name": "Chi Zalo", "allow_online_order": False},
            ]
        }
    )
    token = seed_user(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        response = client.post(
            "/api/v1/orders",
            json={
                "products": [
                    {
                        "name": "Chi Zalo",
                        "quantity": 1,
                        "images": ["img-1"],
                        "options": [],
                    }
                ]
            },
            headers=auth_headers(token),
        )
        assert response.status_code == 400
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_orders_allow_online_product() -> None:
    fake_db = FakeDB(
        collections={
            "products": [
                {"_id": "prod-2", "slug": "online-ok", "name": "Online Ok", "allow_online_order": True},
            ]
        }
    )
    token = seed_user(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        response = client.post(
            "/api/v1/orders",
            json={
                "products": [
                    {
                        "name": "Online Ok",
                        "quantity": 2,
                        "images": ["img-1", "img-2"],
                        "options": [],
                        "selected_product_slug": "online-ok",
                    }
                ]
            },
            headers=auth_headers(token),
        )
        assert response.status_code == 201
        payload = response.json()
        assert payload["total_products"] == 1
        assert payload["total_images"] == 2
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_orders_enforce_min_files() -> None:
    fake_db = FakeDB(
        collections={
            "products": [
                {"_id": "prod-3", "slug": "online-ok", "name": "Online Ok", "allow_online_order": True},
            ],
            "settings": [
                {"_id": "main", "upload_min_files": 2, "upload_max_files": 10},
            ],
        }
    )
    token = seed_user(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        response = client.post(
            "/api/v1/orders",
            json={
                "products": [
                    {
                        "name": "Online Ok",
                        "quantity": 1,
                        "images": ["img-1"],
                        "options": [],
                        "selected_product_slug": "online-ok",
                    }
                ]
            },
            headers=auth_headers(token),
        )
        assert response.status_code == 400
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_orders_enforce_max_files() -> None:
    fake_db = FakeDB(
        collections={
            "products": [
                {"_id": "prod-4", "slug": "online-ok", "name": "Online Ok", "allow_online_order": True},
            ],
            "settings": [
                {"_id": "main", "upload_min_files": 1, "upload_max_files": 2},
            ],
        }
    )
    token = seed_user(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        response = client.post(
            "/api/v1/orders",
            json={
                "products": [
                    {
                        "name": "Online Ok",
                        "quantity": 3,
                        "images": ["img-1", "img-2", "img-3"],
                        "options": [],
                        "selected_product_slug": "online-ok",
                    }
                ]
            },
            headers=auth_headers(token),
        )
        assert response.status_code == 400
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_orders_enforce_product_min_max() -> None:
    fake_db = FakeDB(
        collections={
            "products": [
                {
                    "_id": "prod-5",
                    "slug": "limited",
                    "name": "Limited",
                    "allow_online_order": True,
                    "min_images": 3,
                    "max_images": 5,
                },
            ],
            "settings": [
                {"_id": "main", "upload_min_files": 1, "upload_max_files": 100},
            ],
        }
    )
    token = seed_user(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        too_few = client.post(
            "/api/v1/orders",
            json={
                "products": [
                    {
                        "name": "Limited",
                        "quantity": 2,
                        "images": ["img-1", "img-2"],
                        "options": [],
                        "selected_product_slug": "limited",
                    }
                ]
            },
            headers=auth_headers(token),
        )
        assert too_few.status_code == 400

        too_many = client.post(
            "/api/v1/orders",
            json={
                "products": [
                    {
                        "name": "Limited",
                        "quantity": 6,
                        "images": ["1", "2", "3", "4", "5", "6"],
                        "options": [],
                        "selected_product_slug": "limited",
                    }
                ]
            },
            headers=auth_headers(token),
        )
        assert too_many.status_code == 400

        ok = client.post(
            "/api/v1/orders",
            json={
                "products": [
                    {
                        "name": "Limited",
                        "quantity": 3,
                        "images": ["1", "2", "3"],
                        "options": [],
                        "selected_product_slug": "limited",
                    }
                ]
            },
            headers=auth_headers(token),
        )
        assert ok.status_code == 201

        ok_with_copies = client.post(
            "/api/v1/orders",
            json={
                "products": [
                    {
                        "name": "Limited",
                        "quantity": 3,
                        "images": ["1", "2"],
                        "image_copies": [
                            {"key": "1", "copies": 2},
                            {"key": "2", "copies": 1},
                        ],
                        "options": [],
                        "selected_product_slug": "limited",
                    }
                ]
            },
            headers=auth_headers(token),
        )
        assert ok_with_copies.status_code == 201
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_orders_combo_defaults_to_exact_limit() -> None:
    fake_db = FakeDB(
        collections={
            "products": [
                {
                    "_id": "prod-6",
                    "slug": "combo-only",
                    "name": "Combo Only",
                    "allow_online_order": True,
                    "pricing_mode": "combo",
                    "min_images": 3,
                },
            ],
            "settings": [
                {"_id": "main", "upload_min_files": 1, "upload_max_files": 100},
            ],
        }
    )
    token = seed_user(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        too_many = client.post(
            "/api/v1/orders",
            json={
                "products": [
                    {
                        "name": "Combo Only",
                        "quantity": 4,
                        "images": ["1", "2", "3", "4"],
                        "options": [],
                        "selected_product_slug": "combo-only",
                    }
                ]
            },
            headers=auth_headers(token),
        )
        assert too_many.status_code == 400

        ok = client.post(
            "/api/v1/orders",
            json={
                "products": [
                    {
                        "name": "Combo Only",
                        "quantity": 3,
                        "images": ["1", "2", "3"],
                        "options": [],
                        "selected_product_slug": "combo-only",
                    }
                ]
            },
            headers=auth_headers(token),
        )
        assert ok.status_code == 201
    finally:
        app.dependency_overrides.pop(get_db, None)
