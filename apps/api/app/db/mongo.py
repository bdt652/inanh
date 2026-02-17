from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.db_name]


async def ensure_indexes(db: AsyncIOMotorDatabase | None = None) -> None:
    database = db if db is not None else get_db()
    await database["admins"].create_index("username", unique=True, name="uniq_admin_username")
    await database["banners"].create_index("img", unique=True, name="uniq_banner_img")
    await database["banners"].create_index([("is_active", 1), ("order", 1)], name="idx_banner_active_order")
    await database["menu_items"].create_index("path", unique=True, name="uniq_menu_path")
    await database["pages"].create_index("slug", unique=True, name="uniq_page_slug")
    await database["pages"].create_index("path", unique=True, name="uniq_page_path")
    await database["categories"].create_index("slug", unique=True, name="uniq_category_slug")
    await database["hero_statements"].create_index("title", unique=True, name="uniq_hero_title")
    await database["products"].create_index("slug", unique=True, name="uniq_product_slug")
    await database["products"].create_index("category_slug", name="idx_product_category_slug")
    await database["product_views"].create_index("id", unique=True, sparse=True, name="uniq_product_view_id")


async def ping_database(db: AsyncIOMotorDatabase | None = None) -> None:
    database = db if db is not None else get_db()
    await database.command("ping")
