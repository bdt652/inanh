from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.api.v1.customer_auth import require_user
from app.api.v1.schemas import (
    OrderCreateRequest,
    OrderDetail,
    OrderProduct,
    OrderProductPayload,
    OrderSummary,
    OrderUpdateRequest,
)
from app.core.config import settings
from app.db.mongo import get_db

router = APIRouter(prefix="/orders", tags=["orders"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_timestamp(dt: datetime) -> int:
    return int(dt.timestamp())


def _normalize_products(payloads: list[OrderProductPayload]) -> list[dict]:
    normalized: list[dict] = []
    for item in payloads:
        selected_slug = item.selected_product_slug.strip() if item.selected_product_slug else None
        normalized.append(
            {
                "id": uuid4().hex,
                "name": item.name.strip(),
                "quantity": int(item.quantity),
                "notes": item.notes.strip() if item.notes else None,
                "options": [str(option).strip() for option in item.options if str(option).strip()],
                "images": item.images,
                "selected_product_slug": selected_slug,
            }
        )
    return normalized


def _serialize_product(doc: dict) -> OrderProduct:
    return OrderProduct(
        id=str(doc.get("id")),
        name=str(doc.get("name", "")),
        quantity=int(doc.get("quantity", 0)),
        notes=str(doc.get("notes", "")) if doc.get("notes") else None,
        images=[str(url) for url in doc.get("images", []) if str(url).strip()],
        options=[str(option) for option in doc.get("options", []) if str(option).strip()],
        selected_product_slug=str(doc.get("selected_product_slug")).strip()
        if doc.get("selected_product_slug")
        else None,
    )


async def _assert_online_order_allowed(
    payloads: list[OrderProductPayload],
    db: AsyncIOMotorDatabase,
) -> None:
    slugs = {
        item.selected_product_slug.strip()
        for item in payloads
        if item.selected_product_slug and item.selected_product_slug.strip()
    }
    name_fallbacks = {
        item.name.strip()
        for item in payloads
        if (not item.selected_product_slug or not item.selected_product_slug.strip()) and item.name.strip()
    }

    blocked_docs: list[dict] = []
    if slugs:
        blocked_docs.extend(
            await db["products"]
            .find({"slug": {"$in": list(slugs)}, "allow_online_order": False})
            .to_list(length=len(slugs))
        )

    if name_fallbacks:
        blocked_docs.extend(
            await db["products"]
            .find({"name": {"$in": list(name_fallbacks)}, "allow_online_order": False})
            .to_list(length=len(name_fallbacks))
        )

    if not blocked_docs:
        return

    deduped: dict[str, dict] = {}
    for doc in blocked_docs:
        key = str(doc.get("_id") or doc.get("slug") or doc.get("name") or "")
        if key and key not in deduped:
            deduped[key] = doc

    names = [str(doc.get("name") or doc.get("slug") or "") for doc in deduped.values()]
    readable = ", ".join([name for name in names if name]) or "mot so san pham"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"San pham chi nhan dat qua Zalo: {readable}.",
    )


async def _load_image_limits(db: AsyncIOMotorDatabase) -> tuple[int, int]:
    doc = await db["settings"].find_one({"_id": "main"}) or {}
    min_files = int(doc.get("upload_min_files") or settings.upload_min_files)
    max_files = int(doc.get("upload_max_files") or settings.upload_max_files)
    return min_files, max_files


async def _assert_image_limits(payloads: list[OrderProductPayload], db: AsyncIOMotorDatabase) -> None:
    min_total, max_total = await _load_image_limits(db)
    total_images = sum(len(item.images) for item in payloads)
    if min_total > 0 and total_images < min_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can toi thieu {min_total} anh de gui don.",
        )
    if max_total > 0 and total_images > max_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vuot qua toi da {max_total} anh cho phep.",
        )
    slugs = {
        item.selected_product_slug.strip()
        for item in payloads
        if item.selected_product_slug and item.selected_product_slug.strip()
    }
    names = {
        item.name.strip()
        for item in payloads
        if (not item.selected_product_slug or not item.selected_product_slug.strip()) and item.name.strip()
    }

    products_by_slug: dict[str, dict] = {}
    products_by_name: dict[str, dict] = {}
    if slugs:
        docs = await db["products"].find({"slug": {"$in": list(slugs)}}).to_list(length=len(slugs))
        products_by_slug = {str(doc.get("slug")): doc for doc in docs if doc.get("slug")}
    if names:
        docs = await db["products"].find({"name": {"$in": list(names)}}).to_list(length=len(names))
        products_by_name = {str(doc.get("name")): doc for doc in docs if doc.get("name")}

    for item in payloads:
        count = len(item.images)
        doc = None
        if item.selected_product_slug and item.selected_product_slug.strip():
            doc = products_by_slug.get(item.selected_product_slug.strip())
        elif item.name and item.name.strip():
            doc = products_by_name.get(item.name.strip())

        min_limit = doc.get("min_images") if doc and doc.get("min_images") is not None else None
        max_limit = doc.get("max_images") if doc and doc.get("max_images") is not None else None

        if min_limit is not None and min_limit > 0 and count < min_limit:
            label = item.name.strip() or "San pham"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{label} can toi thieu {min_limit} anh.",
            )
        if max_limit is not None and max_limit > 0 and count > max_limit:
            label = item.name.strip() or "San pham"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{label} vuot qua toi da {max_limit} anh.",
            )


def _serialize_summary(doc: dict) -> OrderSummary:
    timestamp = doc.get("updated_at") if isinstance(doc.get("updated_at"), datetime) else _now()
    return OrderSummary(
        order_id=str(doc.get("_id")),
        status=str(doc.get("status", "new")),
        total_products=int(doc.get("total_products", 0)),
        total_images=int(doc.get("total_images", 0)),
        updated_at=_to_timestamp(timestamp),
    )


def _serialize_detail(doc: dict) -> OrderDetail:
    created = doc.get("created_at") if isinstance(doc.get("created_at"), datetime) else _now()
    updated = doc.get("updated_at") if isinstance(doc.get("updated_at"), datetime) else _now()
    return OrderDetail(
        order_id=str(doc.get("_id")),
        status=str(doc.get("status", "new")),
        total_products=int(doc.get("total_products", 0)),
        total_images=int(doc.get("total_images", 0)),
        updated_at=_to_timestamp(updated),
        created_at=_to_timestamp(created),
        note=str(doc.get("note", "")) if doc.get("note") else None,
        products=[_serialize_product(product) for product in doc.get("products", [])],
    )


@router.get("/my", response_model=list[OrderSummary])
async def list_my_orders(
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[OrderSummary]:
    docs = await (
        db["orders"]
        .find({"user_id": current_user["id"]})
        .sort("updated_at", -1)
        .to_list(length=200)
    )
    return [_serialize_summary(doc) for doc in docs]


@router.post("", response_model=OrderDetail, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreateRequest,
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> OrderDetail:
    await _assert_image_limits(payload.products, db)
    await _assert_online_order_allowed(payload.products, db)
    normalized_products = _normalize_products(payload.products)
    total_images = sum(len(item["images"]) for item in normalized_products)
    now = _now()
    order_id = uuid4().hex
    document = {
        "_id": order_id,
        "user_id": current_user["id"],
        "status": payload.status.strip() if payload.status else "new",
        "products": normalized_products,
        "total_products": len(normalized_products),
        "total_images": total_images,
        "note": payload.note.strip() if payload.note else None,
        "created_at": now,
        "updated_at": now,
    }
    await db["orders"].insert_one(document)
    return _serialize_detail(document)


@router.get("/{order_id}", response_model=OrderDetail)
async def get_order_detail(
    order_id: str,
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> OrderDetail:
    doc = await db["orders"].find_one({"_id": order_id, "user_id": current_user["id"]})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return _serialize_detail(doc)


@router.patch("/{order_id}", response_model=OrderDetail)
async def update_order(
    order_id: str,
    payload: OrderUpdateRequest,
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> OrderDetail:
    update_data: dict = {}
    if payload.status is not None:
        status_value = payload.status.strip()
        if status_value:
            update_data["status"] = status_value
    if payload.note is not None:
        update_data["note"] = payload.note.strip() or None
    if payload.products is not None:
        await _assert_image_limits(payload.products, db)
        await _assert_online_order_allowed(payload.products, db)
        normalized = _normalize_products(payload.products)
        update_data["products"] = normalized
        update_data["total_products"] = len(normalized)
        update_data["total_images"] = sum(len(item["images"]) for item in normalized)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to update.")
    update_data["updated_at"] = _now()
    doc = await db["orders"].find_one_and_update(
        {"_id": order_id, "user_id": current_user["id"]},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return _serialize_detail(doc)
