import io
from pathlib import Path
from shutil import rmtree
from uuid import uuid4

from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import settings
from app.core import uploads as upload_config
from app.db.mongo import get_db
from app.main import app
from tests.auth_helpers import login_headers, seed_admin
from tests.fakes import FakeDB


def _make_png_image(width: int = 64, height: int = 64) -> bytes:
    """Generate a real PNG image using PIL."""
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=(255, 0, 0)).save(buf, format="PNG")
    return buf.getvalue()


client = TestClient(app)


def test_menu_crud_flow_and_conflicts() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        headers = login_headers(client)
        created = client.post(
            "/api/v1/content/menu",
            json={"label": "TRANG CHU", "path": "/", "order": 1},
            headers=headers,
        )
        assert created.status_code == 201
        created_payload = created.json()

        duplicate = client.post(
            "/api/v1/content/menu",
            json={"label": "HOME", "path": "/", "order": 2},
            headers=headers,
        )
        assert duplicate.status_code == 409

        item_id = created_payload["id"]
        updated = client.put(
            f"/api/v1/content/menu/{item_id}",
            json={"label": "TRANG CHINH", "path": "/", "order": 3},
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["label"] == "TRANG CHINH"

        listed = client.get("/api/v1/content/menu", headers=headers)
        assert listed.status_code == 200
        assert len(listed.json()) == 1

        deleted = client.delete(f"/api/v1/content/menu/{item_id}", headers=headers)
        assert deleted.status_code == 200
        assert deleted.json() == {"deleted": True, "id": item_id}

        missing = client.delete(f"/api/v1/content/menu/{item_id}", headers=headers)
        assert missing.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_pages_crud_flow_and_public_lookup() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        headers = login_headers(client)
        created = client.post(
            "/api/v1/content/pages",
            json={
                "slug": "gioi-thieu",
                "path": "/gioi-thieu/",
                "title": "Giới thiệu",
                "summary": "Thông tin tổng quan",
                "content": "Nội dung trang giới thiệu",
                "is_published": True,
                "order": 1,
            },
            headers=headers,
        )
        assert created.status_code == 201
        created_payload = created.json()
        assert created_payload["path"] == "/gioi-thieu"

        duplicate = client.post(
            "/api/v1/content/pages",
            json={
                "slug": "gioi-thieu-2",
                "path": "/gioi-thieu",
                "title": "Trang trùng path",
                "summary": "",
                "content": "",
                "is_published": True,
                "order": 2,
            },
            headers=headers,
        )
        assert duplicate.status_code == 409

        listed = client.get("/api/v1/content/pages", headers=headers)
        assert listed.status_code == 200
        assert len(listed.json()) == 1

        public_page = client.get("/api/v1/pages/by-path", params={"path": "/gioi-thieu"})
        assert public_page.status_code == 200
        assert public_page.json()["title"] == "Giới thiệu"

        item_id = created_payload["id"]
        updated = client.put(
            f"/api/v1/content/pages/{item_id}",
            json={
                "slug": "gioi-thieu",
                "path": "/gioi-thieu",
                "title": "Giới thiệu cập nhật",
                "summary": "Tóm tắt mới",
                "content": "Nội dung mới",
                "is_published": False,
                "order": 1,
            },
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["is_published"] is False

        hidden_page = client.get("/api/v1/pages/by-path", params={"path": "/gioi-thieu"})
        assert hidden_page.status_code == 404

        deleted = client.delete(f"/api/v1/content/pages/{item_id}", headers=headers)
        assert deleted.status_code == 200
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_banners_crud_flow_and_invalid_id() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        headers = login_headers(client)
        created = client.post(
            "/api/v1/content/banners",
            json={
                "alt": "banner-1",
                "img": "https://cdn.example.com/banner-1.jpg",
                "order": 1,
                "is_active": True,
            },
            headers=headers,
        )
        assert created.status_code == 201
        created_payload = created.json()
        assert created_payload["order"] == 1
        assert created_payload["is_active"] is True

        duplicate = client.post(
            "/api/v1/content/banners",
            json={
                "alt": "banner-1-dup",
                "img": "https://cdn.example.com/banner-1.jpg",
                "order": 2,
                "is_active": True,
            },
            headers=headers,
        )
        assert duplicate.status_code == 409

        listed = client.get("/api/v1/content/banners", headers=headers)
        assert listed.status_code == 200
        assert len(listed.json()) == 1

        item_id = created_payload["id"]
        updated = client.put(
            f"/api/v1/content/banners/{item_id}",
            json={
                "alt": "banner-1-updated",
                "img": "https://cdn.example.com/banner-1b.jpg",
                "order": 3,
                "is_active": False,
            },
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["alt"] == "banner-1-updated"
        assert updated.json()["order"] == 3
        assert updated.json()["is_active"] is False

        public_list = client.get("/api/v1/banners")
        assert public_list.status_code == 200
        assert public_list.json() == []

        bad_id = client.put(
            "/api/v1/content/banners/not-an-object-id",
            json={
                "alt": "banner-x",
                "img": "https://cdn.example.com/banner-x.jpg",
                "order": 1,
                "is_active": True,
            },
            headers=headers,
        )
        assert bad_id.status_code == 400

        deleted = client.delete(f"/api/v1/content/banners/{item_id}", headers=headers)
        assert deleted.status_code == 200

        missing = client.delete(f"/api/v1/content/banners/{item_id}", headers=headers)
        assert missing.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_content_image_upload_success_and_validation_failure() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    original_upload_dir = upload_config.UPLOADS_DIR
    original_storage_backend = settings.storage_backend
    tmp_upload_dir = Path("tests/.tmp-upload-test") / uuid4().hex
    try:
        settings.storage_backend = "local"
        upload_config.UPLOADS_DIR = tmp_upload_dir
        headers = login_headers(client)

        uploaded = client.post(
            "/api/v1/content/uploads/images",
            content=_make_png_image(),
            headers={**headers, "Content-Type": "image/png", "X-File-Name": "banner.png", "X-Image-Purpose": "banner"},
        )
        assert uploaded.status_code == 201
        payload = uploaded.json()
        assert payload["url"].startswith("http://testserver/uploads/banners/")
        assert len(list((tmp_upload_dir / "banners").iterdir())) == 1

        invalid_file = client.post(
            "/api/v1/content/uploads/images",
            content=b"plain text",
            headers={**headers, "Content-Type": "text/plain", "X-File-Name": "readme.txt"},
        )
        assert invalid_file.status_code == 400
    finally:
        settings.storage_backend = original_storage_backend
        upload_config.UPLOADS_DIR = original_upload_dir
        if tmp_upload_dir.exists():
            rmtree(tmp_upload_dir, ignore_errors=True)
        app.dependency_overrides.pop(get_db, None)


def test_settings_upsert_and_get_content() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        headers = login_headers(client)
        created = client.put(
            "/api/v1/content/settings",
            json={
                "logo_url": "http://localhost:8000/uploads/logos/main.png",
                "google_header": "<meta name='google-site-verification' content='abc'/>",
                "footer": "In anh online 24h",
                "title": "In Anh 24H",
                "address": "85 Pho Gach, TT Phuc Tho, huyen Phuc Tho, TP. Ha Noi",
                "hotline_zalo": "0877.22.66.44 - 0868.321.320",
                "email": "Inanhonline24h@gmail.com",
            },
            headers=headers,
        )
        assert created.status_code == 200
        assert created.json()["id"] == "main"
        assert created.json()["logo_url"] == "http://localhost:8000/uploads/logos/main.png"

        fetched = client.get("/api/v1/content/settings", headers=headers)
        assert fetched.status_code == 200
        assert fetched.json()["email"] == "Inanhonline24h@gmail.com"

        updated = client.put(
            "/api/v1/content/settings",
            json={
                "logo_url": "http://localhost:8000/uploads/logos/main-v2.png",
                "google_header": "<meta name='google-site-verification' content='xyz'/>",
                "footer": "In anh online 24h",
                "title": "In Anh 24H Updated",
                "address": "85 Pho Gach, TT Phuc Tho, huyen Phuc Tho, TP. Ha Noi",
                "hotline_zalo": "0877.22.66.44 - 0868.321.320",
                "email": "Inanhonline24h@gmail.com",
            },
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["title"] == "In Anh 24H Updated"
        assert updated.json()["logo_url"] == "http://localhost:8000/uploads/logos/main-v2.png"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_settings_get_content_returns_404_when_missing() -> None:
    fake_db = FakeDB({"settings": []})
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        response = client.get("/api/v1/content/settings", headers=login_headers(client))
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 404


def test_categories_crud_flow_and_conflicts() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        headers = login_headers(client)
        created = client.post(
            "/api/v1/content/categories",
            json={
                "label": "ALBUM ANH",
                "slug": "album-anh",
                "img": "https://cdn.example.com/categories/album-anh.jpg",
                "order": 1,
            },
            headers=headers,
        )
        assert created.status_code == 201
        created_payload = created.json()
        assert created_payload["img"] == "https://cdn.example.com/categories/album-anh.jpg"

        duplicate = client.post(
            "/api/v1/content/categories",
            json={"label": "ANH ALBUM", "slug": "album-anh", "order": 2},
            headers=headers,
        )
        assert duplicate.status_code == 409

        item_id = created_payload["id"]
        updated = client.put(
            f"/api/v1/content/categories/{item_id}",
            json={
                "label": "ALBUM ANH CUOI",
                "slug": "album-anh-cuoi",
                "img": "https://cdn.example.com/categories/album-anh-cuoi.jpg",
                "order": 2,
            },
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["slug"] == "album-anh-cuoi"
        assert updated.json()["img"] == "https://cdn.example.com/categories/album-anh-cuoi.jpg"

        listed = client.get("/api/v1/content/categories", headers=headers)
        assert listed.status_code == 200
        assert len(listed.json()) == 1

        bad_id = client.put(
            "/api/v1/content/categories/not-an-object-id",
            json={"label": "X", "slug": "x", "order": 1},
            headers=headers,
        )
        assert bad_id.status_code == 400

        deleted = client.delete(f"/api/v1/content/categories/{item_id}", headers=headers)
        assert deleted.status_code == 200
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_hero_crud_flow_and_conflicts() -> None:
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        headers = login_headers(client)
        created = client.post(
            "/api/v1/content/hero",
            json={"title": "In nhanh trong ngày", "description": "Xử lý và giao nhanh", "order": 1},
            headers=headers,
        )
        assert created.status_code == 201
        created_payload = created.json()

        duplicate = client.post(
            "/api/v1/content/hero",
            json={"title": "In nhanh trong ngày", "description": "Mô tả khác", "order": 2},
            headers=headers,
        )
        assert duplicate.status_code == 409

        item_id = created_payload["id"]
        updated = client.put(
            f"/api/v1/content/hero/{item_id}",
            json={"title": "Tư vấn miễn phí", "description": "Hỗ trợ chất liệu", "order": 2},
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["title"] == "Tư vấn miễn phí"

        listed = client.get("/api/v1/content/hero", headers=headers)
        assert listed.status_code == 200
        assert len(listed.json()) == 1

        deleted = client.delete(f"/api/v1/content/hero/{item_id}", headers=headers)
        assert deleted.status_code == 200

        missing = client.put(
            f"/api/v1/content/hero/{item_id}",
            json={"title": "A", "description": "B", "order": 0},
            headers=headers,
        )
        assert missing.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_products_content_crud_flow_and_category_validation() -> None:
    fake_db = FakeDB(
        {
            "categories": [
                {"label": "ALBUM ẢNH", "slug": "album-anh", "img": "", "order": 1},
                {"label": "KHUNG ẢNH", "slug": "khung-anh", "img": "", "order": 2},
            ]
        }
    )
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        headers = login_headers(client)
        created = client.post(
            "/api/v1/content/products",
            json={
                "name": "Album Da Cao Cấp",
                "slug": "album-da-cao-cap",
                "category_slug": "album-anh",
                "price": 259000,
                "image_urls": [
                    "https://cdn.example.com/products/album-da-thumb.jpg",
                    "https://cdn.example.com/products/album-da-side.jpg",
                ],
                "short_description": "Album cao cấp cho ảnh cưới",
                "order": 1,
                "is_active": True,
            },
            headers=headers,
        )
        assert created.status_code == 201
        created_payload = created.json()
        assert created_payload["category_slug"] == "album-anh"
        assert created_payload["name"] == "Album Da Cao Cấp"
        assert created_payload["sale_price"] is None
        assert created_payload["image_url"] == "https://cdn.example.com/products/album-da-thumb.jpg"
        assert created_payload["image_urls"][0] == "https://cdn.example.com/products/album-da-thumb.jpg"

        invalid_category = client.post(
            "/api/v1/content/products",
            json={
                "name": "Sản phẩm lỗi",
                "slug": "san-pham-loi",
                "category_slug": "khong-ton-tai",
                "price": 99000,
                "image_url": "",
                "short_description": "",
                "order": 2,
                "is_active": True,
            },
            headers=headers,
        )
        assert invalid_category.status_code == 400

        duplicate_slug = client.post(
            "/api/v1/content/products",
            json={
                "name": "Album Da Cao Cấp 2",
                "slug": "album-da-cao-cap",
                "category_slug": "khung-anh",
                "price": 289000,
                "image_url": "",
                "short_description": "",
                "order": 3,
                "is_active": True,
            },
            headers=headers,
        )
        assert duplicate_slug.status_code == 409

        listed = client.get("/api/v1/content/products", headers=headers)
        assert listed.status_code == 200
        assert len(listed.json()) == 1

        item_id = created_payload["id"]
        updated = client.put(
            f"/api/v1/content/products/{item_id}",
            json={
                "name": "Khung Anh Go",
                "slug": "khung-anh-go",
                "category_slug": "khung-anh",
                "price": 189000,
                "sale_price": 149000,
                "image_urls": [
                    "https://cdn.example.com/products/khung-go-main.jpg",
                    "https://cdn.example.com/products/khung-go-detail.jpg",
                ],
                "short_description": "Khung go de ban",
                "order": 5,
                "is_active": False,
            },
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["slug"] == "khung-anh-go"
        assert updated.json()["category_slug"] == "khung-anh"
        assert updated.json()["is_active"] is False
        assert updated.json()["sale_price"] == 149000
        assert updated.json()["image_url"] == "https://cdn.example.com/products/khung-go-main.jpg"
        assert updated.json()["image_urls"][1] == "https://cdn.example.com/products/khung-go-detail.jpg"

        deleted = client.delete(f"/api/v1/content/products/{item_id}", headers=headers)
        assert deleted.status_code == 200

        missing = client.delete(f"/api/v1/content/products/{item_id}", headers=headers)
        assert missing.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_content_endpoints_require_admin_token() -> None:
    fake_db = FakeDB()
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        response = client.get("/api/v1/content/banners")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 401
