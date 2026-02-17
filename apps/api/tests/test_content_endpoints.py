from fastapi.testclient import TestClient

from app.db.mongo import get_db
from app.main import app
from tests.fakes import FakeDB


client = TestClient(app)


def test_menu_endpoint_reads_from_db() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB(
        {
            "menu_items": [
                {"label": "TRANG CHU", "path": "/", "order": 1},
                {"label": "TIN TUC", "path": "/tin-tuc", "order": 2},
            ]
        }
    )
    try:
        response = client.get("/api/v1/menu")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    assert response.json() == [
        {"label": "TRANG CHU", "path": "/"},
        {"label": "TIN TUC", "path": "/tin-tuc"},
    ]


def test_page_by_path_endpoint_reads_published_page() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB(
        {
            "pages": [
                {
                    "slug": "gioi-thieu",
                    "path": "/gioi-thieu",
                    "title": "Giới thiệu",
                    "summary": "Thông tin tổng quan",
                    "content": "Nội dung trang",
                    "is_published": True,
                    "order": 1,
                },
                {
                    "slug": "an",
                    "path": "/an",
                    "title": "Ẩn",
                    "summary": "",
                    "content": "",
                    "is_published": False,
                    "order": 2,
                },
            ]
        }
    )
    try:
        ok_response = client.get("/api/v1/pages/by-path", params={"path": "/gioi-thieu"})
        hidden_response = client.get("/api/v1/pages/by-path", params={"path": "/an"})
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert ok_response.status_code == 200
    assert ok_response.json()["slug"] == "gioi-thieu"
    assert hidden_response.status_code == 404


def test_banners_endpoint_reads_from_db() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB(
        {
            "banners": [
                {"alt": "banner-hidden", "img": "https://cdn.example.com/0.jpg", "order": 0, "is_active": False},
                {"alt": "banner-2", "img": "https://cdn.example.com/2.jpg", "order": 2, "is_active": True},
                {"alt": "banner-1", "img": "https://cdn.example.com/1.jpg", "order": 1, "is_active": True},
            ]
        }
    )
    try:
        response = client.get("/api/v1/banners")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 200
    assert response.json() == [
        {"alt": "banner-1", "img": "https://cdn.example.com/1.jpg"},
        {"alt": "banner-2", "img": "https://cdn.example.com/2.jpg"},
    ]


def test_settings_endpoint_reads_from_db() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB(
        {
            "settings": [
                {
                    "_id": "main",
                    "logo_url": "http://localhost:8000/uploads/logos/main.png",
                    "google_header": "<meta name='google-site-verification' content='abc'/>",
                    "footer": "In anh online 24h",
                    "title": "In Anh 24H",
                    "address": "85 Pho Gach, TT Phuc Tho, huyen Phuc Tho, TP. Ha Noi",
                    "hotline_zalo": "0877.22.66.44 - 0868.321.320",
                    "email": "Inanhonline24h@gmail.com",
                }
            ]
        }
    )
    try:
        response = client.get("/api/v1/settings")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 200
    assert response.json()["title"] == "In Anh 24H"
    assert response.json()["logo_url"] == "http://localhost:8000/uploads/logos/main.png"


def test_settings_endpoint_returns_404_when_missing() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB({"settings": []})
    try:
        response = client.get("/api/v1/settings")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 404


def test_categories_endpoint_reads_from_db() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB(
        {
            "categories": [
                {
                    "label": "ALBUM ANH",
                    "slug": "album-anh",
                    "img": "https://cdn.example.com/categories/album-anh.jpg",
                    "order": 1,
                },
                {"label": "KHUNG ANH", "slug": "khung-anh", "order": 2},
            ]
        }
    )
    try:
        response = client.get("/api/v1/categories")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 200
    assert response.json() == [
        {"label": "ALBUM ANH", "slug": "album-anh", "img": "https://cdn.example.com/categories/album-anh.jpg"},
        {"label": "KHUNG ANH", "slug": "khung-anh", "img": ""},
    ]


def test_hero_endpoint_reads_from_db() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB(
        {
            "hero_statements": [
                {"title": "In nhanh trong ngay", "description": "Xu ly va giao nhanh", "order": 1},
                {"title": "Tu van mien phi", "description": "Ho tro chat lieu", "order": 2},
            ]
        }
    )
    try:
        response = client.get("/api/v1/hero")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 200
    assert response.json() == [
        {"title": "In nhanh trong ngay", "description": "Xu ly va giao nhanh"},
        {"title": "Tu van mien phi", "description": "Ho tro chat lieu"},
    ]


def test_best_sellers_endpoint_reads_from_db() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB(
        {
            "product_views": [
                {
                    "id": "best-13x18",
                    "title": "Anh in 13x18",
                    "short": "In nhanh",
                    "old_price": "8000d",
                    "current_price": "6000d",
                    "description": "Chat luong cao",
                    "highlight": "Sale",
                    "tags": ["plastic"],
                    "order": 1,
                }
            ]
        }
    )
    try:
        response = client.get("/api/v1/products/best-sellers")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 200
    assert response.json()[0]["highlight"] == "Sale"


def test_best_sellers_endpoint_uses_featured_products_from_products_collection() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB(
        {
            "products": [
                {
                    "name": "Album cưới nổi bật",
                    "slug": "album-cuoi-noi-bat",
                    "category_slug": "album-anh",
                    "price": 350000,
                    "sale_price": 299000,
                    "image_urls": ["https://cdn.example.com/products/album-cuoi.jpg"],
                    "short_description": "Album in cao cấp",
                    "order": 1,
                    "is_active": True,
                    "is_featured": True,
                },
                {
                    "name": "Khung ảnh thường",
                    "slug": "khung-anh-thuong",
                    "category_slug": "khung-anh",
                    "price": 120000,
                    "image_urls": ["https://cdn.example.com/products/khung-anh.jpg"],
                    "short_description": "Khung ảnh phổ thông",
                    "order": 2,
                    "is_active": True,
                    "is_featured": False,
                },
            ]
        }
    )
    try:
        featured_response = client.get("/api/v1/products/best-sellers")
        full_response = client.get("/api/v1/products/best-sellers", params={"featured_only": "false"})
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert featured_response.status_code == 200
    featured_payload = featured_response.json()
    assert len(featured_payload) == 1
    assert featured_payload[0]["title"] == "Album cưới nổi bật"
    assert featured_payload[0]["image_url"] == "https://cdn.example.com/products/album-cuoi.jpg"

    assert full_response.status_code == 200
    full_payload = full_response.json()
    assert len(full_payload) == 2


def test_search_endpoint_filters_from_db() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB(
        {
            "product_views": [
                {
                    "id": "p1",
                    "title": "In Plastic 13x18",
                    "short": "Plastic",
                    "old_price": "8000d",
                    "current_price": "6000d",
                    "description": "Ep plastic",
                    "tags": [],
                    "order": 1,
                },
                {
                    "id": "p2",
                    "title": "Album cuoi",
                    "short": "Album",
                    "old_price": "9000d",
                    "current_price": "7000d",
                    "description": "In dep",
                    "tags": [],
                    "order": 2,
                },
            ]
        }
    )
    try:
        response = client.get("/api/v1/products/search", params={"q": "Plastic", "limit": 2})
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["id"] == "p1"


def test_product_detail_endpoint_reads_active_product_by_slug() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDB(
        {
            "products": [
                {
                    "name": "Album Da Cao Cap",
                    "slug": "album-da-cao-cap",
                    "category_slug": "album-anh",
                    "price": 259000,
                    "sale_price": 199000,
                    "image_urls": ["https://cdn.example.com/products/album-da-thumb.jpg"],
                    "short_description": "Album cao cap cho anh cuoi",
                    "is_active": True,
                }
            ]
        }
    )
    try:
        ok_response = client.get("/api/v1/products/album-da-cao-cap")
        missing_response = client.get("/api/v1/products/khong-ton-tai")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert ok_response.status_code == 200
    ok_payload = ok_response.json()
    assert ok_payload["slug"] == "album-da-cao-cap"
    assert ok_payload["image_url"] == "https://cdn.example.com/products/album-da-thumb.jpg"
    assert ok_payload["sale_price"] == 199000
    assert missing_response.status_code == 404
