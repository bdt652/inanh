import asyncio
from pathlib import Path
from uuid import uuid4

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.api.v1.auth import require_admin
from app.api.v1.schemas import (
    BannerRecord,
    BannerUpsert,
    CategoryRecord,
    CategoryUpsert,
    DeleteResult,
    DynamicPageRecord,
    DynamicPageUpsert,
    HeroStatementRecord,
    HeroStatementUpsert,
    MenuItemRecord,
    MenuItemUpsert,
    ProductRecord,
    ProductUpsert,
    SiteSettingRecord,
    SiteSettingUpsert,
    UploadImageResponse,
)
from app.core.storage import StorageUnavailableError, store_object_bytes
from app.core.uploads import UPLOADS_ROUTE_PREFIX, build_public_upload_url
from app.db.mongo import ensure_indexes, get_db

router = APIRouter(tags=["content"], dependencies=[Depends(require_admin)])
ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/avif",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_UPLOAD_IMAGE_BYTES = 5 * 1024 * 1024
_CONTENT_TYPE_EXTENSION_MAP = {
    "image/avif": ".avif",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
_ALLOWED_IMAGE_EXTENSIONS = {".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"}


def _parse_object_id(raw_id: str) -> ObjectId:
    try:
        return ObjectId(raw_id)
    except (InvalidId, TypeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid id format.") from exc


def _serialize_menu_item(doc: dict) -> MenuItemRecord:
    return MenuItemRecord(
        id=str(doc["_id"]),
        label=str(doc["label"]),
        path=str(doc["path"]),
        order=int(doc.get("order", 0)),
    )


def _normalize_page_path(raw_path: str) -> str:
    normalized = raw_path.strip()
    if not normalized:
        return "/"
    if not normalized.startswith("/"):
        normalized = f"/{normalized}"
    if len(normalized) > 1:
        normalized = normalized.rstrip("/")
    return normalized


def _serialize_dynamic_page(doc: dict) -> DynamicPageRecord:
    return DynamicPageRecord(
        id=str(doc["_id"]),
        slug=str(doc.get("slug", "")),
        path=str(doc.get("path", "")),
        title=str(doc.get("title", "")),
        summary=str(doc.get("summary", "")),
        content=str(doc.get("content", "")),
        is_published=bool(doc.get("is_published", True)),
        order=int(doc.get("order", 0)),
    )


def _serialize_category(doc: dict) -> CategoryRecord:
    return CategoryRecord(
        id=str(doc["_id"]),
        label=str(doc["label"]),
        slug=str(doc["slug"]),
        img=str(doc.get("img", "")),
        order=int(doc.get("order", 0)),
    )


def _serialize_hero_statement(doc: dict) -> HeroStatementRecord:
    return HeroStatementRecord(
        id=str(doc["_id"]),
        title=str(doc["title"]),
        description=str(doc["description"]),
        order=int(doc.get("order", 0)),
    )


def _serialize_banner(doc: dict) -> BannerRecord:
    return BannerRecord(
        id=str(doc["_id"]),
        alt=str(doc["alt"]),
        img=str(doc["img"]),
        order=int(doc.get("order", 0)),
        is_active=bool(doc.get("is_active", True)),
    )


def _serialize_site_setting(doc: dict) -> SiteSettingRecord:
    return SiteSettingRecord(
        id=str(doc["_id"]),
        logo_url=str(doc.get("logo_url", "")),
        google_header=str(doc.get("google_header", "")),
        footer=str(doc.get("footer", "")),
        title=str(doc.get("title", "")),
        address=str(doc.get("address", "")),
        hotline_zalo=str(doc.get("hotline_zalo", "")),
        email=str(doc.get("email", "")),
    )


def _resolve_product_images(doc: dict) -> list[str]:
    raw_urls = doc.get("image_urls")
    if isinstance(raw_urls, list):
        normalized = [str(url).strip() for url in raw_urls if str(url).strip()]
        if normalized:
            return normalized
    legacy_url = str(doc.get("image_url", "")).strip()
    return [legacy_url] if legacy_url else []


def _serialize_product(doc: dict) -> ProductRecord:
    image_urls = _resolve_product_images(doc)
    sale_price = doc.get("sale_price")
    normalized_sale_price = float(sale_price) if sale_price is not None else None
    return ProductRecord(
        id=str(doc["_id"]),
        name=str(doc.get("name", "")),
        slug=str(doc.get("slug", "")),
        category_slug=str(doc.get("category_slug", "")),
        price=float(doc.get("price", 0)),
        sale_price=normalized_sale_price,
        image_url=image_urls[0] if image_urls else "",
        image_urls=image_urls,
        short_description=str(doc.get("short_description", "")),
        order=int(doc.get("order", 0)),
        is_active=bool(doc.get("is_active", True)),
        is_featured=bool(doc.get("is_featured", False)),
    )


async def _assert_category_slug_exists(category_slug: str, db: AsyncIOMotorDatabase) -> None:
    category = await db["categories"].find_one({"slug": category_slug})
    if category is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category slug not found.")


def _resolve_image_extension(filename: str | None, content_type: str) -> str:
    extension = Path(filename or "").suffix.lower()
    if extension in _ALLOWED_IMAGE_EXTENSIONS:
        return ".jpg" if extension == ".jpeg" else extension
    return _CONTENT_TYPE_EXTENSION_MAP[content_type]


@router.get("/content/banners", response_model=list[BannerRecord], summary="List banners from MongoDB")
async def list_banners_content(db: AsyncIOMotorDatabase = Depends(get_db)) -> list[BannerRecord]:
    docs = await db["banners"].find({}).sort("order", 1).to_list(length=200)
    return [_serialize_banner(doc) for doc in docs if doc.get("_id") and doc.get("alt") and doc.get("img")]


@router.post(
    "/content/banners",
    response_model=BannerRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Create banner",
)
async def create_banner_content(payload: BannerUpsert, db: AsyncIOMotorDatabase = Depends(get_db)) -> BannerRecord:
    await ensure_indexes(db)
    try:
        result = await db["banners"].insert_one(payload.model_dump())
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Banner image already exists.") from exc
    created = await db["banners"].find_one({"_id": result.inserted_id})
    if created is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load created banner.")
    return _serialize_banner(created)


@router.put("/content/banners/{item_id}", response_model=BannerRecord, summary="Update banner")
async def update_banner_content(
    item_id: str, payload: BannerUpsert, db: AsyncIOMotorDatabase = Depends(get_db)
) -> BannerRecord:
    object_id = _parse_object_id(item_id)
    await ensure_indexes(db)
    try:
        result = await db["banners"].update_one({"_id": object_id}, {"$set": payload.model_dump()})
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Banner image already exists.") from exc
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found.")

    updated = await db["banners"].find_one({"_id": object_id})
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found.")
    return _serialize_banner(updated)


@router.delete("/content/banners/{item_id}", response_model=DeleteResult, summary="Delete banner")
async def delete_banner_content(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)) -> DeleteResult:
    object_id = _parse_object_id(item_id)
    result = await db["banners"].delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found.")
    return DeleteResult(deleted=True, id=item_id)


@router.post(
    "/content/uploads/images",
    response_model=UploadImageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload image for content",
)
async def upload_content_image(request: Request) -> UploadImageResponse:
    content_type = str(request.headers.get("content-type", "")).split(";")[0].strip().lower()
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed.")

    source_filename = request.headers.get("x-file-name")
    extension = _resolve_image_extension(source_filename, content_type)
    object_path = f"banners/{uuid4().hex}{extension}"

    total_size = 0
    chunks: list[bytes] = []
    try:
        async for chunk in request.stream():
            if not chunk:
                continue
            total_size += len(chunk)
            if total_size > MAX_UPLOAD_IMAGE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Image size exceeds 5MB.",
                )
            chunks.append(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded image.",
        ) from exc

    if total_size == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty image body.")

    try:
        await asyncio.to_thread(store_object_bytes, object_path, b"".join(chunks), content_type)
    except StorageUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image storage service is not available.",
        ) from exc

    public_path = f"{UPLOADS_ROUTE_PREFIX}/{object_path}"
    return UploadImageResponse(url=build_public_upload_url(request, public_path))


@router.get("/content/settings", response_model=SiteSettingRecord, summary="Get site settings from MongoDB")
async def get_site_settings_content(db: AsyncIOMotorDatabase = Depends(get_db)) -> SiteSettingRecord:
    doc = await db["settings"].find_one({"_id": "main"})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settings not found.")
    return _serialize_site_setting(doc)


@router.put("/content/settings", response_model=SiteSettingRecord, summary="Create or update site settings")
async def upsert_site_settings_content(
    payload: SiteSettingUpsert, db: AsyncIOMotorDatabase = Depends(get_db)
) -> SiteSettingRecord:
    existing = await db["settings"].find_one({"_id": "main"})
    if existing is None:
        await db["settings"].insert_one({"_id": "main", **payload.model_dump()})
    else:
        await db["settings"].update_one({"_id": "main"}, {"$set": payload.model_dump()})

    saved = await db["settings"].find_one({"_id": "main"})
    if saved is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load site settings.")
    return _serialize_site_setting(saved)


@router.get("/content/menu", response_model=list[MenuItemRecord], summary="List menu content from MongoDB")
async def list_menu_content(db: AsyncIOMotorDatabase = Depends(get_db)) -> list[MenuItemRecord]:
    docs = await db["menu_items"].find({}).sort("order", 1).to_list(length=200)
    return [_serialize_menu_item(doc) for doc in docs if doc.get("_id") and doc.get("label") and doc.get("path")]


@router.post("/content/menu", response_model=MenuItemRecord, status_code=status.HTTP_201_CREATED, summary="Create menu item")
async def create_menu_content(payload: MenuItemUpsert, db: AsyncIOMotorDatabase = Depends(get_db)) -> MenuItemRecord:
    await ensure_indexes(db)
    try:
        result = await db["menu_items"].insert_one(payload.model_dump())
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Menu path already exists.") from exc

    created = await db["menu_items"].find_one({"_id": result.inserted_id})
    if created is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load created menu item.")
    return _serialize_menu_item(created)


@router.put("/content/menu/{item_id}", response_model=MenuItemRecord, summary="Update menu item")
async def update_menu_content(
    item_id: str, payload: MenuItemUpsert, db: AsyncIOMotorDatabase = Depends(get_db)
) -> MenuItemRecord:
    object_id = _parse_object_id(item_id)
    await ensure_indexes(db)
    try:
        result = await db["menu_items"].update_one({"_id": object_id}, {"$set": payload.model_dump()})
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Menu path already exists.") from exc

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found.")

    updated = await db["menu_items"].find_one({"_id": object_id})
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found.")
    return _serialize_menu_item(updated)


@router.delete("/content/menu/{item_id}", response_model=DeleteResult, summary="Delete menu item")
async def delete_menu_content(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)) -> DeleteResult:
    object_id = _parse_object_id(item_id)
    result = await db["menu_items"].delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found.")
    return DeleteResult(deleted=True, id=item_id)


@router.get("/content/pages", response_model=list[DynamicPageRecord], summary="List dynamic pages from MongoDB")
async def list_pages_content(db: AsyncIOMotorDatabase = Depends(get_db)) -> list[DynamicPageRecord]:
    docs = await db["pages"].find({}).sort("order", 1).to_list(length=300)
    return [
        _serialize_dynamic_page(doc)
        for doc in docs
        if doc.get("_id") and doc.get("slug") and doc.get("path") and doc.get("title")
    ]


@router.post("/content/pages", response_model=DynamicPageRecord, status_code=status.HTTP_201_CREATED, summary="Create dynamic page")
async def create_page_content(payload: DynamicPageUpsert, db: AsyncIOMotorDatabase = Depends(get_db)) -> DynamicPageRecord:
    await ensure_indexes(db)
    document = payload.model_dump()
    document["path"] = _normalize_page_path(payload.path)
    try:
        result = await db["pages"].insert_one(document)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Page slug or path already exists.") from exc

    created = await db["pages"].find_one({"_id": result.inserted_id})
    if created is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load created page.")
    return _serialize_dynamic_page(created)


@router.put("/content/pages/{item_id}", response_model=DynamicPageRecord, summary="Update dynamic page")
async def update_page_content(
    item_id: str, payload: DynamicPageUpsert, db: AsyncIOMotorDatabase = Depends(get_db)
) -> DynamicPageRecord:
    object_id = _parse_object_id(item_id)
    await ensure_indexes(db)
    document = payload.model_dump()
    document["path"] = _normalize_page_path(payload.path)
    try:
        result = await db["pages"].update_one({"_id": object_id}, {"$set": document})
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Page slug or path already exists.") from exc

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found.")

    updated = await db["pages"].find_one({"_id": object_id})
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found.")
    return _serialize_dynamic_page(updated)


@router.delete("/content/pages/{item_id}", response_model=DeleteResult, summary="Delete dynamic page")
async def delete_page_content(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)) -> DeleteResult:
    object_id = _parse_object_id(item_id)
    result = await db["pages"].delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found.")
    return DeleteResult(deleted=True, id=item_id)


@router.get("/content/categories", response_model=list[CategoryRecord], summary="List categories from MongoDB")
async def list_categories_content(db: AsyncIOMotorDatabase = Depends(get_db)) -> list[CategoryRecord]:
    docs = await db["categories"].find({}).sort("order", 1).to_list(length=200)
    return [_serialize_category(doc) for doc in docs if doc.get("_id") and doc.get("label") and doc.get("slug")]


@router.post(
    "/content/categories",
    response_model=CategoryRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Create category",
)
async def create_category_content(payload: CategoryUpsert, db: AsyncIOMotorDatabase = Depends(get_db)) -> CategoryRecord:
    await ensure_indexes(db)
    try:
        result = await db["categories"].insert_one(payload.model_dump())
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists.") from exc

    created = await db["categories"].find_one({"_id": result.inserted_id})
    if created is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load created category.")
    return _serialize_category(created)


@router.put("/content/categories/{item_id}", response_model=CategoryRecord, summary="Update category")
async def update_category_content(
    item_id: str, payload: CategoryUpsert, db: AsyncIOMotorDatabase = Depends(get_db)
) -> CategoryRecord:
    object_id = _parse_object_id(item_id)
    await ensure_indexes(db)
    try:
        result = await db["categories"].update_one({"_id": object_id}, {"$set": payload.model_dump()})
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists.") from exc

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    updated = await db["categories"].find_one({"_id": object_id})
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    return _serialize_category(updated)


@router.delete("/content/categories/{item_id}", response_model=DeleteResult, summary="Delete category")
async def delete_category_content(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)) -> DeleteResult:
    object_id = _parse_object_id(item_id)
    result = await db["categories"].delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    return DeleteResult(deleted=True, id=item_id)


@router.get("/content/products", response_model=list[ProductRecord], summary="List products from MongoDB")
async def list_products_content(db: AsyncIOMotorDatabase = Depends(get_db)) -> list[ProductRecord]:
    docs = await db["products"].find({}).sort("order", 1).to_list(length=500)
    return [
        _serialize_product(doc)
        for doc in docs
        if doc.get("_id") and doc.get("name") and doc.get("slug") and doc.get("category_slug") is not None
    ]


@router.post(
    "/content/products",
    response_model=ProductRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Create product",
)
async def create_product_content(payload: ProductUpsert, db: AsyncIOMotorDatabase = Depends(get_db)) -> ProductRecord:
    await ensure_indexes(db)
    await _assert_category_slug_exists(payload.category_slug, db)
    try:
        result = await db["products"].insert_one(payload.model_dump())
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product slug already exists.") from exc

    created = await db["products"].find_one({"_id": result.inserted_id})
    if created is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load created product.")
    return _serialize_product(created)


@router.put("/content/products/{item_id}", response_model=ProductRecord, summary="Update product")
async def update_product_content(
    item_id: str, payload: ProductUpsert, db: AsyncIOMotorDatabase = Depends(get_db)
) -> ProductRecord:
    object_id = _parse_object_id(item_id)
    await ensure_indexes(db)
    await _assert_category_slug_exists(payload.category_slug, db)
    try:
        result = await db["products"].update_one({"_id": object_id}, {"$set": payload.model_dump()})
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product slug already exists.") from exc

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    updated = await db["products"].find_one({"_id": object_id})
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return _serialize_product(updated)


@router.delete("/content/products/{item_id}", response_model=DeleteResult, summary="Delete product")
async def delete_product_content(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)) -> DeleteResult:
    object_id = _parse_object_id(item_id)
    result = await db["products"].delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return DeleteResult(deleted=True, id=item_id)


@router.get("/content/hero", response_model=list[HeroStatementRecord], summary="List hero statements from MongoDB")
async def list_hero_content(db: AsyncIOMotorDatabase = Depends(get_db)) -> list[HeroStatementRecord]:
    docs = await db["hero_statements"].find({}).sort("order", 1).to_list(length=200)
    return [
        _serialize_hero_statement(doc)
        for doc in docs
        if doc.get("_id") and doc.get("title") and doc.get("description")
    ]


@router.post(
    "/content/hero",
    response_model=HeroStatementRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Create hero statement",
)
async def create_hero_content(
    payload: HeroStatementUpsert, db: AsyncIOMotorDatabase = Depends(get_db)
) -> HeroStatementRecord:
    await ensure_indexes(db)
    try:
        result = await db["hero_statements"].insert_one(payload.model_dump())
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Hero title already exists.") from exc

    created = await db["hero_statements"].find_one({"_id": result.inserted_id})
    if created is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load created hero statement."
        )
    return _serialize_hero_statement(created)


@router.put("/content/hero/{item_id}", response_model=HeroStatementRecord, summary="Update hero statement")
async def update_hero_content(
    item_id: str, payload: HeroStatementUpsert, db: AsyncIOMotorDatabase = Depends(get_db)
) -> HeroStatementRecord:
    object_id = _parse_object_id(item_id)
    await ensure_indexes(db)
    try:
        result = await db["hero_statements"].update_one({"_id": object_id}, {"$set": payload.model_dump()})
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Hero title already exists.") from exc

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hero statement not found.")

    updated = await db["hero_statements"].find_one({"_id": object_id})
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hero statement not found.")
    return _serialize_hero_statement(updated)


@router.delete("/content/hero/{item_id}", response_model=DeleteResult, summary="Delete hero statement")
async def delete_hero_content(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)) -> DeleteResult:
    object_id = _parse_object_id(item_id)
    result = await db["hero_statements"].delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hero statement not found.")
    return DeleteResult(deleted=True, id=item_id)
