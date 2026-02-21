from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import OperationFailure

from app.core.config import settings

_client: AsyncIOMotorClient | None = None


async def _create_index_safe(collection, *args, **kwargs) -> None:
    try:
        await collection.create_index(*args, **kwargs)
    except TypeError:
        kwargs.pop("partialFilterExpression", None)
        kwargs.pop("expireAfterSeconds", None)
        await collection.create_index(*args, **kwargs) if kwargs else await collection.create_index(*args)


async def _ensure_google_sub_index(collection) -> None:
    partial_filter = {"google_sub": {"$type": "string"}}
    info = await collection.index_information()
    existing = info.get("uniq_user_google_sub")
    if existing:
        unique_ok = bool(existing.get("unique"))
        filter_ok = existing.get("partialFilterExpression") == partial_filter
        if unique_ok and filter_ok:
            return
        try:
            await collection.drop_index("uniq_user_google_sub")
        except OperationFailure:
            pass
    await _create_index_safe(
        collection,
        "google_sub",
        unique=True,
        name="uniq_user_google_sub",
        partialFilterExpression=partial_filter,
    )


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.db_name]


async def ensure_indexes(db: AsyncIOMotorDatabase | None = None) -> None:
    database = db if db is not None else get_db()
    await _create_index_safe(database["admins"], "username", unique=True, name="uniq_admin_username")
    await _create_index_safe(
        database["users"],
        "phone",
        unique=True,
        name="uniq_user_phone",
        partialFilterExpression={"phone": {"$type": "string"}},
    )
    await _ensure_google_sub_index(database["users"])
    await _create_index_safe(database["phone_otps"], "expires_at", expireAfterSeconds=0, name="ttl_phone_otp")
    await _create_index_safe(database["banners"], "img", unique=True, name="uniq_banner_img")
    await _create_index_safe(database["banners"], [("is_active", 1), ("order", 1)], name="idx_banner_active_order")
    await _create_index_safe(database["menu_items"], "path", unique=True, name="uniq_menu_path")
    await _create_index_safe(database["pages"], "slug", unique=True, name="uniq_page_slug")
    await _create_index_safe(database["pages"], "path", unique=True, name="uniq_page_path")
    await _create_index_safe(database["categories"], "slug", unique=True, name="uniq_category_slug")
    await _create_index_safe(database["hero_statements"], "title", unique=True, name="uniq_hero_title")
    await _create_index_safe(database["products"], "slug", unique=True, name="uniq_product_slug")
    await _create_index_safe(database["products"], "category_slug", name="idx_product_category_slug")
    await _create_index_safe(
        database["orders"],
        "user_id",
        name="idx_order_user_id",
    )
    await _create_index_safe(database["product_views"], "id", unique=True, sparse=True, name="uniq_product_view_id")


async def ping_database(db: AsyncIOMotorDatabase | None = None) -> None:
    database = db if db is not None else get_db()
    await database.command("ping")
