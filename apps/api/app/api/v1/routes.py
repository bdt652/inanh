import hmac
import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.api.v1.auth import require_admin
from app.api.v1.content_admin import router as content_admin_router
from app.api.v1.admin_manage import router as admin_manage_router
from app.api.v1.orders import router as orders_router
from app.api.v1.drafts import router as drafts_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.users import router as users_router
from app.api.v1.schemas import (
    AdminBootstrapRequest,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminProfile,
    Banner,
    Category,
    DynamicPage,
    HeroStatement,
    MenuItem,
    PingResponse,
    PostRecord,
    Product,
    ProductCreate,
    ProductDetail,
    ProductView,
    ReviewRecord,
    ReviewStats,
    ReviewSubmit,
    SiteSetting,
)
from app.core.config import settings
from app.core.security import create_access_token, create_password_hash, verify_password
from app.db.mongo import ensure_indexes, get_db, ping_database

router = APIRouter()
router.include_router(content_admin_router)
router.include_router(admin_manage_router)
router.include_router(users_router)
router.include_router(drafts_router)
router.include_router(orders_router)
router.include_router(uploads_router)


def _normalize_page_path(raw_path: str) -> str:
    normalized = raw_path.strip()
    if not normalized:
        return "/"
    if not normalized.startswith("/"):
        normalized = f"/{normalized}"
    if len(normalized) > 1:
        normalized = normalized.rstrip("/")
    return normalized


def _require_bootstrap_secret(request: Request) -> None:
    secret = (settings.admin_bootstrap_secret or "").strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin bootstrap is disabled.",
        )
    provided = request.headers.get("x-admin-bootstrap-secret", "")
    if not hmac.compare_digest(provided, secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bootstrap secret.")


def _resolve_allow_online_order(doc: dict) -> bool:
    raw_value = doc.get("allow_online_order")
    if raw_value is None:
        return True
    return bool(raw_value)


def _resolve_pricing_mode(doc: dict) -> str:
    raw_value = str(doc.get("pricing_mode", "")).strip().lower()
    if raw_value == "combo":
        return "combo"
    return "retail"


def _resolve_optional_int(doc: dict, key: str) -> int | None:
    raw_value = doc.get(key)
    if raw_value is None:
        return None
    return int(raw_value)


def _serialize_product(doc: dict) -> Product:
    return Product(
        id=str(doc.get("_id")) if doc.get("_id") else None,
        name=str(doc.get("name", "")),
        price=float(doc.get("price", 0)),
        slug=str(doc.get("slug", "")),
        extra_options=[str(option).strip() for option in doc.get("extra_options", []) if str(option).strip()],
        allow_online_order=_resolve_allow_online_order(doc),
        pricing_mode=_resolve_pricing_mode(doc),
        min_images=_resolve_optional_int(doc, "min_images"),
        max_images=_resolve_optional_int(doc, "max_images"),
    )


def _resolve_product_images(doc: dict) -> list[str]:
    raw_urls = doc.get("image_urls")
    if isinstance(raw_urls, list):
        normalized = [str(url).strip() for url in raw_urls if str(url).strip()]
        if normalized:
            return normalized
    legacy_url = str(doc.get("image_url", "")).strip()
    return [legacy_url] if legacy_url else []


def _serialize_product_detail(doc: dict) -> ProductDetail:
    image_urls = _resolve_product_images(doc)
    raw_sale_price = doc.get("sale_price")
    sale_price = float(raw_sale_price) if raw_sale_price is not None else None
    return ProductDetail(
        id=str(doc.get("_id")) if doc.get("_id") else None,
        name=str(doc.get("name", "")),
        price=float(doc.get("price", 0)),
        slug=str(doc.get("slug", "")),
        category_slug=str(doc.get("category_slug", "")),
        sale_price=sale_price,
        image_url=image_urls[0] if image_urls else "",
        image_urls=image_urls,
        short_description=str(doc.get("short_description", "")),
        content=str(doc.get("content", "")),
        extra_options=[str(option).strip() for option in doc.get("extra_options", []) if str(option).strip()],
        allow_online_order=_resolve_allow_online_order(doc),
        pricing_mode=_resolve_pricing_mode(doc),
        min_images=_resolve_optional_int(doc, "min_images"),
        max_images=_resolve_optional_int(doc, "max_images"),
        tags=[str(t) for t in doc.get("tags", [])],
        seo_title=str(doc.get("seo_title", "")),
        seo_description=str(doc.get("seo_description", "")),
        focus_keyword=str(doc.get("focus_keyword", "")),
    )


def _serialize_product_view(doc: dict) -> ProductView:
    return ProductView(
        id=str(doc.get("id")) if doc.get("id") else (str(doc["_id"]) if doc.get("_id") else None),
        title=str(doc.get("title", "")),
        short=str(doc.get("short", "")),
        old_price=str(doc.get("old_price", "")),
        current_price=str(doc.get("current_price", "")),
        description=str(doc.get("description", "")),
        image_url=str(doc.get("image_url", "")),
        highlight=str(doc["highlight"]) if doc.get("highlight") is not None else None,
        tags=[str(tag) for tag in doc.get("tags", [])],
        allow_online_order=_resolve_allow_online_order(doc),
        pricing_mode=_resolve_pricing_mode(doc),
        min_images=_resolve_optional_int(doc, "min_images"),
        max_images=_resolve_optional_int(doc, "max_images"),
    )


def _format_vnd(value: float) -> str:
    rounded = int(round(float(value)))
    return f"{rounded:,}".replace(",", ".") + " đ"


def _serialize_product_record_as_view(doc: dict) -> ProductView:
    name = str(doc.get("name", "")).strip()
    slug = str(doc.get("slug", "")).strip()
    category_slug = str(doc.get("category_slug", "")).strip()
    short_description = str(doc.get("short_description", "")).strip()
    price = float(doc.get("price", 0) or 0)
    raw_sale_price = doc.get("sale_price")
    sale_price = float(raw_sale_price) if raw_sale_price is not None else None
    has_sale = bool(sale_price and sale_price > 0 and sale_price < price)
    current_price = sale_price if has_sale and sale_price is not None else price
    raw_urls = doc.get("image_urls")
    image_urls = [str(url).strip() for url in raw_urls] if isinstance(raw_urls, list) else []
    image_urls = [url for url in image_urls if url]
    image_url = image_urls[0] if image_urls else str(doc.get("image_url", "")).strip()
    return ProductView(
        id=slug or (str(doc["_id"]) if doc.get("_id") else None),
        title=name,
        short=short_description or "Sản phẩm in ảnh theo yêu cầu",
        old_price=_format_vnd(price) if has_sale else "",
        current_price=_format_vnd(current_price),
        description=short_description or f"Danh mục: {category_slug.replace('-', ' ').strip()}",
        image_url=image_url,
        highlight="Sale" if has_sale else None,
        tags=[category_slug.replace("-", " ")] if category_slug else [],
        extra_options=[str(option).strip() for option in doc.get("extra_options", []) if str(option).strip()],
        allow_online_order=_resolve_allow_online_order(doc),
        pricing_mode=_resolve_pricing_mode(doc),
        min_images=_resolve_optional_int(doc, "min_images"),
        max_images=_resolve_optional_int(doc, "max_images"),
    )


def _serialize_site_setting(doc: dict) -> SiteSetting:
    return SiteSetting(
        logo_url=str(doc.get("logo_url", "")),
        google_header=str(doc.get("google_header", "")),
        footer=str(doc.get("footer", "")),
        title=str(doc.get("title", "")),
        address=str(doc.get("address", "")),
        hotline_zalo=str(doc.get("hotline_zalo", "")),
        email=str(doc.get("email", "")),
        upload_min_files=int(doc.get("upload_min_files")) if doc.get("upload_min_files") is not None else None,
        upload_max_files=int(doc.get("upload_max_files")) if doc.get("upload_max_files") is not None else None,
        upload_max_bytes=int(doc.get("upload_max_bytes")) if doc.get("upload_max_bytes") is not None else None,
        upload_require_verified_phone_threshold=int(doc.get("upload_require_verified_phone_threshold"))
        if doc.get("upload_require_verified_phone_threshold") is not None
        else None,
        login_phone_enabled=bool(doc.get("login_phone_enabled", True)),
        login_google_enabled=bool(doc.get("login_google_enabled", True)),
    )


def _serialize_dynamic_page(doc: dict) -> DynamicPage:
    return DynamicPage(
        slug=str(doc.get("slug", "")),
        path=str(doc.get("path", "")),
        title=str(doc.get("title", "")),
        summary=str(doc.get("summary", "")),
        content=str(doc.get("content", "")),
    )


@router.get("/ping", response_model=PingResponse, tags=["system"], summary="Ping API")
async def ping(db: AsyncIOMotorDatabase = Depends(get_db)) -> PingResponse:
    try:
        await ping_database(db)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not reachable.") from exc
    return PingResponse(pong=True)


@router.post("/admin/login", response_model=AdminLoginResponse, tags=["admin"], summary="Admin login")
async def admin_login(payload: AdminLoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> AdminLoginResponse:
    admin_doc = await db["admins"].find_one({"username": payload.username, "is_active": {"$ne": False}})
    if admin_doc is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    salt = str(admin_doc.get("password_salt", ""))
    password_hash = str(admin_doc.get("password_hash", ""))
    if not (salt and password_hash and verify_password(payload.password, salt, password_hash)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    token, expires_at = create_access_token(payload.username)
    return AdminLoginResponse(access_token=token, expires_at=expires_at)


@router.get("/admin/me", response_model=AdminProfile, tags=["admin"], summary="Get current admin profile")
async def admin_me(current_admin: str = Depends(require_admin)) -> AdminProfile:
    return AdminProfile(username=current_admin)


@router.post("/admin/bootstrap", response_model=AdminProfile, tags=["admin"], summary="Bootstrap first admin")
async def admin_bootstrap(
    payload: AdminBootstrapRequest,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> AdminProfile:
    _require_bootstrap_secret(request)
    existing = await db["admins"].find_one({})
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Admin account already exists.")

    await ensure_indexes(db)
    salt, password_hash = create_password_hash(payload.password)
    await db["admins"].insert_one(
        {
            "username": payload.username,
            "password_salt": salt,
            "password_hash": password_hash,
            "is_active": True,
        }
    )
    return AdminProfile(username=payload.username)


@router.get("/banners", response_model=list[Banner], tags=["content"], summary="Get banners")
async def get_banners(db: AsyncIOMotorDatabase = Depends(get_db)) -> list[Banner]:
    docs = await (
        db["banners"]
        .find({"alt": {"$exists": True}, "img": {"$exists": True}, "is_active": {"$ne": False}})
        .sort("order", 1)
        .to_list(length=200)
    )
    return [Banner(alt=str(doc["alt"]), img=str(doc["img"])) for doc in docs if doc.get("alt") and doc.get("img")]


@router.get("/settings", response_model=SiteSetting, tags=["content"], summary="Get site settings")
async def get_site_settings(db: AsyncIOMotorDatabase = Depends(get_db)) -> SiteSetting:
    doc = await db["settings"].find_one({"_id": "main"})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settings not found.")
    return _serialize_site_setting(doc)


@router.get("/menu", response_model=list[MenuItem], tags=["content"], summary="Get navigation menu")
async def get_menu(db: AsyncIOMotorDatabase = Depends(get_db)) -> list[MenuItem]:
    docs = await (
        db["menu_items"]
        .find({"label": {"$exists": True}, "path": {"$exists": True}})
        .sort("order", 1)
        .to_list(length=100)
    )
    return [MenuItem(label=str(doc["label"]), path=str(doc["path"])) for doc in docs if doc.get("label") and doc.get("path")]


@router.get("/pages/by-path", response_model=DynamicPage, tags=["content"], summary="Get published page by path")
async def get_page_by_path(
    path: str = Query("/", min_length=1, description="The website path to lookup."),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> DynamicPage:
    normalized_path = _normalize_page_path(path)
    doc = await db["pages"].find_one({"path": normalized_path, "is_published": {"$ne": False}})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found.")
    return _serialize_dynamic_page(doc)


@router.get("/categories", response_model=list[Category], tags=["content"], summary="Get product categories")
async def get_categories(db: AsyncIOMotorDatabase = Depends(get_db)) -> list[Category]:
    docs = await (
        db["categories"]
        .find({"label": {"$exists": True}, "slug": {"$exists": True}})
        .sort("order", 1)
        .to_list(length=100)
    )
    return [
        Category(label=str(doc["label"]), slug=str(doc["slug"]), img=str(doc.get("img", "")))
        for doc in docs
        if doc.get("label") and doc.get("slug")
    ]


@router.get("/hero", response_model=list[HeroStatement], tags=["content"], summary="Get hero section content")
async def get_hero(db: AsyncIOMotorDatabase = Depends(get_db)) -> list[HeroStatement]:
    docs = await (
        db["hero_statements"]
        .find({"title": {"$exists": True}, "description": {"$exists": True}})
        .sort("order", 1)
        .to_list(length=100)
    )
    return [
        HeroStatement(title=str(doc["title"]), description=str(doc["description"]))
        for doc in docs
        if doc.get("title") and doc.get("description")
    ]


@router.get(
    "/products/best-sellers",
    response_model=list[ProductView],
    tags=["products"],
    summary="Get best-seller products",
)
async def best_sellers(
    featured_only: bool = Query(True, description="Return only featured products when true."),
    limit: int = Query(100, gt=0, le=300, description="Maximum number of returned items."),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[ProductView]:
    product_filter: dict = {"is_active": {"$ne": False}}
    if featured_only:
        product_filter["is_featured"] = True
    product_docs = await db["products"].find(product_filter).sort("order", 1).to_list(length=limit)
    if product_docs:
        return [_serialize_product_record_as_view(doc) for doc in product_docs if str(doc.get("name", "")).strip()]

    if featured_only:
        has_products = await db["products"].find({"is_active": {"$ne": False}}).to_list(length=1)
        if has_products:
            return []

    legacy_docs = await db["product_views"].find({}).sort("order", 1).to_list(length=limit)
    return [
        _serialize_product_view(doc)
        for doc in legacy_docs
        if doc.get("title") and doc.get("short") and doc.get("description")
    ]


@router.get("/products/search", response_model=list[ProductView], tags=["products"], summary="Search best-seller products")
async def search_products(
    q: str = Query("", min_length=0, description="Search keyword."),
    limit: int = Query(6, gt=0, le=20, description="Maximum number of returned items."),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[ProductView]:
    query = q.strip()
    product_filter: dict = {"is_active": {"$ne": False}}
    if query:
        regex_filter = {"$regex": re.escape(query), "$options": "i"}
        product_filter["$or"] = [
            {"name": regex_filter},
            {"short_description": regex_filter},
            {"category_slug": regex_filter},
        ]
    product_docs = await db["products"].find(product_filter).sort("order", 1).to_list(length=limit)
    if product_docs:
        return [_serialize_product_record_as_view(doc) for doc in product_docs if str(doc.get("name", "")).strip()]

    mongo_filter: dict = {}
    if query:
        regex_filter = {"$regex": re.escape(query), "$options": "i"}
        mongo_filter = {
            "$or": [
                {"title": regex_filter},
                {"short": regex_filter},
                {"description": regex_filter},
            ]
        }
    docs = await db["product_views"].find(mongo_filter).sort("order", 1).to_list(length=limit)
    return [
        _serialize_product_view(doc)
        for doc in docs
        if doc.get("title") and doc.get("short") and doc.get("description")
    ]


@router.get("/products", response_model=list[Product], tags=["products"], summary="List products from MongoDB")
async def list_products(db: AsyncIOMotorDatabase = Depends(get_db)) -> list[Product]:
    docs = await db["products"].find({"is_active": {"$ne": False}}).to_list(length=100)
    return [_serialize_product(doc) for doc in docs]


@router.get("/products/{slug}", response_model=ProductDetail, tags=["products"], summary="Get product by slug")
async def get_product_by_slug(slug: str, db: AsyncIOMotorDatabase = Depends(get_db)) -> ProductDetail:
    normalized_slug = slug.strip()
    if not normalized_slug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    doc = await db["products"].find_one({"slug": normalized_slug, "is_active": {"$ne": False}})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return _serialize_product_detail(doc)


@router.post(
    "/products",
    response_model=Product,
    status_code=status.HTTP_201_CREATED,
    tags=["products"],
    summary="Create product",
)
async def create_product(
    payload: ProductCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _current_admin: str = Depends(require_admin),
) -> Product:
    await ensure_indexes(db)
    try:
        result = await db["products"].insert_one(payload.model_dump())
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product slug already exists.") from exc

    created = await db["products"].find_one({"_id": result.inserted_id})
    if created is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load created product.")
    return _serialize_product(created)


# ── Public: Posts (Hướng dẫn / Blog) ─────────────────────────────────────────

def _serialize_post_public(doc: dict) -> PostRecord:
    return PostRecord(
        id=str(doc["_id"]),
        slug=str(doc.get("slug", "")),
        title=str(doc.get("title", "")),
        summary=str(doc.get("summary", "")),
        content=str(doc.get("content", "")),
        cover_image=str(doc["cover_image"]) if doc.get("cover_image") else None,
        is_published=bool(doc.get("is_published", False)),
        tags=[str(t) for t in doc.get("tags", [])],
        order=int(doc.get("order", 0)),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
        seo_title=str(doc.get("seo_title", "")),
        seo_description=str(doc.get("seo_description", "")),
        focus_keyword=str(doc.get("focus_keyword", "")),
    )


@router.get("/posts", response_model=list[PostRecord], tags=["content"], summary="List published posts")
async def list_posts(db: AsyncIOMotorDatabase = Depends(get_db)) -> list[PostRecord]:
    docs = await (
        db["posts"].find({"is_published": True}).sort([("order", 1), ("created_at", -1)]).to_list(length=200)
    )
    return [_serialize_post_public(doc) for doc in docs if doc.get("slug")]


@router.get("/posts/{slug}", response_model=PostRecord, tags=["content"], summary="Get published post by slug")
async def get_post_by_slug(slug: str, db: AsyncIOMotorDatabase = Depends(get_db)) -> PostRecord:
    normalized = slug.strip()
    if not normalized:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    doc = await db["posts"].find_one({"slug": normalized, "is_published": True})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    return _serialize_post_public(doc)


# ── Public: Product Reviews ───────────────────────────────────────────────────

@router.post(
    "/reviews",
    response_model=ReviewRecord,
    status_code=status.HTTP_201_CREATED,
    tags=["content"],
    summary="Submit a product review",
)
async def submit_review(payload: ReviewSubmit, db: AsyncIOMotorDatabase = Depends(get_db)) -> ReviewRecord:
    product = await db["products"].find_one({"slug": payload.product_slug, "is_active": {"$ne": False}})
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    from datetime import UTC, datetime  # local import to avoid circular at module level

    doc = {**payload.model_dump(), "is_approved": False, "created_at": datetime.now(UTC)}
    result = await db["product_reviews"].insert_one(doc)
    created = await db["product_reviews"].find_one({"_id": result.inserted_id})
    if created is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save review.")
    return ReviewRecord(
        id=str(created["_id"]),
        product_slug=str(created["product_slug"]),
        rating=int(created["rating"]),
        body=str(created["body"]),
        reviewer_name=str(created["reviewer_name"]),
        is_approved=False,
        created_at=created.get("created_at"),
    )


@router.get(
    "/products/{slug}/reviews",
    response_model=ReviewStats,
    tags=["products"],
    summary="Get approved reviews and aggregate rating for a product",
)
async def get_product_reviews(slug: str, db: AsyncIOMotorDatabase = Depends(get_db)) -> ReviewStats:
    normalized = slug.strip()
    docs = await (
        db["product_reviews"]
        .find({"product_slug": normalized, "is_approved": True})
        .sort("created_at", -1)
        .to_list(length=200)
    )
    reviews = [
        ReviewRecord(
            id=str(doc["_id"]),
            product_slug=str(doc["product_slug"]),
            rating=int(doc["rating"]),
            body=str(doc["body"]),
            reviewer_name=str(doc["reviewer_name"]),
            is_approved=True,
            created_at=doc.get("created_at"),
        )
        for doc in docs
    ]
    avg = round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else 0.0
    return ReviewStats(product_slug=normalized, average_rating=avg, review_count=len(reviews), reviews=reviews)

