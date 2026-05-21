from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import tempfile
from pathlib import Path
import re
from urllib.parse import urlparse
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.api.v1.auth import require_admin
from app.api.v1.orders import _assert_image_limits, _assert_online_order_allowed, _normalize_products, _serialize_product
from app.api.v1.schemas import (
    AdminDraftDetail,
    AdminDraftSummary,
    AdminOrderDetail,
    AdminOrderSummary,
    AdminUserRecord,
    AdminUserUpdateRequest,
    OrderUpdateRequest,
)
from app.core.storage import StorageUnavailableError, load_object_bytes
from app.core.uploads import UPLOADS_ROUTE_PREFIX
from app.db.mongo import get_db

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_timestamp(dt: datetime) -> int:
    return int(dt.timestamp())


def _serialize_admin_order_summary(doc: dict) -> AdminOrderSummary:
    timestamp = doc.get("updated_at") if isinstance(doc.get("updated_at"), datetime) else _now()
    return AdminOrderSummary(
        order_id=str(doc.get("_id")),
        status=str(doc.get("status", "new")),
        total_products=int(doc.get("total_products", 0)),
        total_images=int(doc.get("total_images", 0)),
        updated_at=_to_timestamp(timestamp),
        user_id=str(doc.get("user_id", "")),
    )


def _serialize_admin_order_detail(doc: dict) -> AdminOrderDetail:
    created = doc.get("created_at") if isinstance(doc.get("created_at"), datetime) else _now()
    updated = doc.get("updated_at") if isinstance(doc.get("updated_at"), datetime) else _now()
    return AdminOrderDetail(
        order_id=str(doc.get("_id")),
        status=str(doc.get("status", "new")),
        total_products=int(doc.get("total_products", 0)),
        total_images=int(doc.get("total_images", 0)),
        updated_at=_to_timestamp(updated),
        created_at=_to_timestamp(created),
        note=str(doc.get("note", "")) if doc.get("note") else None,
        shipping_name=str(doc.get("shipping_name", "")) if doc.get("shipping_name") else None,
        shipping_phone=str(doc.get("shipping_phone", "")) if doc.get("shipping_phone") else None,
        shipping_address=str(doc.get("shipping_address", "")) if doc.get("shipping_address") else None,
        products=[_serialize_product(product) for product in doc.get("products", [])],
        user_id=str(doc.get("user_id", "")),
    )


def _draft_totals(doc: dict) -> tuple[int, int]:
    products = doc.get("products", []) or []
    total_products = len(products)
    total_images = 0
    for product in products:
        previews = product.get("previews", []) if isinstance(product, dict) else []
        total_images += len(previews)
    return total_products, total_images


def _serialize_admin_draft_summary(doc: dict) -> AdminDraftSummary:
    saved = doc.get("saved_at") if isinstance(doc.get("saved_at"), datetime) else _now()
    total_products, total_images = _draft_totals(doc)
    return AdminDraftSummary(
        user_id=str(doc.get("user_id", "")),
        saved_at=_to_timestamp(saved),
        total_products=total_products,
        total_images=total_images,
    )


def _serialize_admin_draft_detail(doc: dict) -> AdminDraftDetail:
    saved = doc.get("saved_at") if isinstance(doc.get("saved_at"), datetime) else _now()
    return AdminDraftDetail(
        user_id=str(doc.get("user_id", "")),
        products=doc.get("products", []),
        note=doc.get("note"),
        saved_at=_to_timestamp(saved),
    )


def _serialize_admin_user(doc: dict) -> AdminUserRecord:
    created = doc.get("created_at") if isinstance(doc.get("created_at"), datetime) else _now()
    return AdminUserRecord(
        phone=str(doc.get("phone") or doc.get("_id") or ""),
        email=str(doc.get("email")) if doc.get("email") else None,
        phone_verified=bool(doc.get("phone_verified")),
        is_active=doc.get("is_active", True) is not False,
        created_at=_to_timestamp(created),
    )


def _sanitize_segment(value: str, fallback: str) -> str:
    text = value.strip() or fallback
    text = re.sub(r"[<>:\"/\\\\|?*]+", "-", text)
    text = re.sub(r"\\s+", "-", text)
    return text.strip("-") or fallback


def _safe_filename(value: str, fallback: str) -> str:
    text = value.strip() or fallback
    text = re.sub(r"[<>:\"/\\\\|?*]+", "-", text)
    return text.strip() or fallback


def _normalize_object_key(value: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    parsed = urlparse(raw)
    path = parsed.path if parsed.scheme in {"http", "https"} else raw
    path = path.lstrip("/")
    prefix = UPLOADS_ROUTE_PREFIX.strip("/").lower()
    if prefix and path.lower().startswith(f"{prefix}/"):
        path = path[len(prefix) + 1 :]
    return path


def _cleanup_tempfile(path: Path, handle) -> None:
    try:
        handle.close()
    except Exception:
        pass
    try:
        path.unlink()
    except Exception:
        pass


@router.get("/orders", response_model=list[AdminOrderSummary], summary="List all orders")
async def list_orders(
    limit: int = Query(200, gt=0, le=500, description="Maximum items to return."),
    skip: int = Query(0, ge=0, description="Number of items to skip."),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[AdminOrderSummary]:
    docs = (
        await db["orders"]
        .find({})
        .sort("updated_at", -1)
        .skip(skip)
        .to_list(length=limit)
    )
    return [_serialize_admin_order_summary(doc) for doc in docs]


@router.get("/orders/{order_id}", response_model=AdminOrderDetail, summary="Get order detail")
async def get_order(order_id: str, db: AsyncIOMotorDatabase = Depends(get_db)) -> AdminOrderDetail:
    doc = await db["orders"].find_one({"_id": order_id})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return _serialize_admin_order_detail(doc)


@router.get(
    "/orders/{order_id}/download",
    response_class=StreamingResponse,
    summary="Download order images as zip",
)
async def download_order_archive(
    order_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> StreamingResponse:
    doc = await db["orders"].find_one({"_id": order_id})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    products = doc.get("products", []) or []
    shipping_name = str(doc.get("shipping_name") or "").strip()
    shipping_phone = str(doc.get("shipping_phone") or "").strip()
    order_label_parts = [part for part in [shipping_name, shipping_phone] if part]
    order_label = " - ".join(order_label_parts) if order_label_parts else f"order-{order_id}"
    order_folder = _sanitize_segment(order_label, f"order-{order_id}")
    missing: list[str] = []
    total_written = 0
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    tmp_path = Path(tmp_file.name)

    used_product_folders: set[str] = set()
    with ZipFile(tmp_file, "w", ZIP_DEFLATED) as archive:
        for product_index, product in enumerate(products, 1):
            if not isinstance(product, dict):
                continue
            raw_images = product.get("images", [])
            if isinstance(raw_images, str):
                images = [raw_images]
            elif isinstance(raw_images, list):
                images = raw_images
            else:
                images = []
            if not images:
                continue
            raw_name = str(product.get("name") or product.get("selected_product_slug") or f"san-pham-{product_index}")
            raw_options = product.get("options")
            if isinstance(raw_options, str):
                option_list = [raw_options]
            elif isinstance(raw_options, list):
                option_list = [str(item) for item in raw_options if str(item).strip()]
            else:
                option_list = []
            option_label = ", ".join([opt.strip() for opt in option_list if opt.strip()]) or "khong-option"
            base_folder = _sanitize_segment(f"{option_label} - {raw_name}", f"san-pham-{product_index}")
            product_folder = f"{order_folder}/{base_folder}"
            if base_folder in used_product_folders:
                suffix = 2
                while f"{base_folder}-{suffix}" in used_product_folders:
                    suffix += 1
                base_folder = f"{base_folder}-{suffix}"
                product_folder = f"{order_folder}/{base_folder}"
            used_product_folders.add(base_folder)
            used_names: set[str] = set()
            for image_index, image in enumerate(images, 1):
                key = _normalize_object_key(str(image))
                if not key:
                    continue
                filename = Path(key).name or f"image-{image_index}"
                safe_name = _safe_filename(filename, f"image-{image_index}")
                entry_name = f"{image_index:03d}-{safe_name}"
                counter = 1
                while entry_name in used_names:
                    entry_name = f"{image_index:03d}-{counter}-{safe_name}"
                    counter += 1
                used_names.add(entry_name)
                try:
                    data, _ = await asyncio.to_thread(load_object_bytes, key)
                except FileNotFoundError:
                    missing.append(f"{key} (missing)")
                    continue
                except StorageUnavailableError as exc:
                    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
                except Exception:
                    missing.append(f"{key} (error)")
                    continue
                archive.writestr(f"{product_folder}/{entry_name}", data)
                total_written += 1

        if missing:
            archive.writestr(f"{order_folder}/__missing.txt", "\n".join(missing))

    tmp_file.close()
    if total_written == 0:
        try:
            tmp_path.unlink()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order has no images.")

    file_handle = tmp_path.open("rb")
    filename = _safe_filename(f"{order_folder}.zip", f"order-{order_id}.zip")
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    background_tasks.add_task(_cleanup_tempfile, tmp_path, file_handle)
    return StreamingResponse(file_handle, media_type="application/zip", headers=headers, background=background_tasks)


@router.patch("/orders/{order_id}", response_model=AdminOrderDetail, summary="Update order")
async def update_order(
    order_id: str,
    payload: OrderUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> AdminOrderDetail:
    update_data: dict = {}
    if payload.status is not None:
        status_value = payload.status.strip()
        if status_value:
            update_data["status"] = status_value
    if payload.note is not None:
        update_data["note"] = payload.note.strip() or None
    if payload.shipping_name is not None:
        update_data["shipping_name"] = payload.shipping_name.strip() or None
    if payload.shipping_phone is not None:
        update_data["shipping_phone"] = payload.shipping_phone.strip() or None
    if payload.shipping_address is not None:
        update_data["shipping_address"] = payload.shipping_address.strip() or None
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
        {"_id": order_id},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return _serialize_admin_order_detail(doc)


@router.get("/drafts", response_model=list[AdminDraftSummary], summary="List order drafts")
async def list_drafts(
    limit: int = Query(200, gt=0, le=500, description="Maximum items to return."),
    skip: int = Query(0, ge=0, description="Number of items to skip."),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[AdminDraftSummary]:
    docs = (
        await db["order_drafts"]
        .find({})
        .sort("saved_at", -1)
        .skip(skip)
        .to_list(length=limit)
    )
    return [_serialize_admin_draft_summary(doc) for doc in docs]


@router.get("/drafts/{user_id}", response_model=AdminDraftDetail, summary="Get draft detail")
async def get_draft(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)) -> AdminDraftDetail:
    doc = await db["order_drafts"].find_one({"user_id": user_id})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found.")
    return _serialize_admin_draft_detail(doc)


@router.delete("/drafts/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete draft")
async def delete_draft(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)) -> None:
    await db["order_drafts"].delete_one({"user_id": user_id})
    return None


@router.get("/users", response_model=list[AdminUserRecord], summary="List users")
async def list_users(
    limit: int = Query(200, gt=0, le=500, description="Maximum items to return."),
    skip: int = Query(0, ge=0, description="Number of items to skip."),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[AdminUserRecord]:
    docs = (
        await db["users"]
        .find({})
        .sort("created_at", -1)
        .skip(skip)
        .to_list(length=limit)
    )
    return [_serialize_admin_user(doc) for doc in docs]


@router.patch("/users/{phone}", response_model=AdminUserRecord, summary="Update user")
async def update_user(
    phone: str,
    payload: AdminUserUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> AdminUserRecord:
    update_data: dict = {}
    if payload.email is not None:
        update_data["email"] = payload.email.strip() or None
    if payload.phone_verified is not None:
        update_data["phone_verified"] = bool(payload.phone_verified)
    if payload.is_active is not None:
        update_data["is_active"] = bool(payload.is_active)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to update.")
    doc = await db["users"].find_one_and_update(
        {"_id": phone},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return _serialize_admin_user(doc)
