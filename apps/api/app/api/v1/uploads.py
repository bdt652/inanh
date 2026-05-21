from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Tuple

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.v1.customer_auth import require_user
from app.api.v1.schemas import (
    UploadBatchCompleteRequest,
    UploadPresignRequest,
    UploadPresignResponseItem,
    UploadDirectResponse,
    UploadSessionCreateRequest,
    UploadSessionResponse,
    UploadSessionSummary,
)
from app.core.config import settings
from app.core.storage import (
    StorageUnavailableError,
    _build_minio_client,
    _is_local_backend,
    store_object_stream,
)
from app.core.uploads import ensure_uploads_dir
from app.db.mongo import get_db

router = APIRouter(prefix="/uploads", tags=["uploads"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _load_setting_overrides(db: AsyncIOMotorDatabase) -> Tuple[int, int, int]:
    doc = await db["settings"].find_one({"_id": "main"}) or {}
    max_files = int(doc.get("upload_max_files") or settings.upload_max_files)
    max_bytes = int(doc.get("upload_max_bytes") or settings.upload_max_bytes)
    require_threshold = int(
        doc.get("upload_require_verified_phone_threshold") or settings.upload_require_verified_phone_threshold
    )
    return max_files, max_bytes, require_threshold


@router.post("/sessions", response_model=UploadSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: UploadSessionCreateRequest,
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UploadSessionResponse:
    max_files, max_bytes, verified_threshold = await _load_setting_overrides(db)
    if payload.total_files > max_files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vượt quá số ảnh tối đa cho phép.")
    if payload.total_bytes is not None and payload.total_bytes > max_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vượt quá dung lượng tối đa.")

    require_verified = payload.total_files >= verified_threshold if verified_threshold > 0 else False
    if require_verified and not current_user.get("phone_verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cần xác thực số điện thoại trước khi tải nhiều ảnh.",
        )

    session_id = uuid.uuid4().hex
    expires_at_dt = _now() + timedelta(hours=24)
    await db["upload_sessions"].insert_one(
        {
            "_id": session_id,
            "user_id": current_user["id"],
            "status": "open",
            "max_files": max_files,
            "max_bytes": max_bytes,
            "require_verified_phone": require_verified,
            "counts": {"total_keys": 0, "valid_images": 0, "rejected": 0, "total_bytes": 0},
            "counted_keys": [],
            "created_at": _now(),
            "expires_at": expires_at_dt,
        }
    )
    return UploadSessionResponse(
        session_id=session_id,
        expires_at=int(expires_at_dt.timestamp()),
        max_files=max_files,
        max_bytes=max_bytes,
        require_verified_phone=require_verified,
    )


def _safe_object_key(user_id: str, session_id: str, filename: str) -> str:
    base = os.path.basename(filename).replace("\\", "_").replace("/", "_")
    random_prefix = uuid.uuid4().hex[:8]
    return f"user-uploads/{user_id}/{session_id}/{random_prefix}-{base}"


def _get_upload_size(file: UploadFile) -> int:
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    return int(size)


def _peek_upload_sample(file: UploadFile, sample_size: int = 262144) -> bytes:
    try:
        file.file.seek(0)
        sample = file.file.read(sample_size)
        file.file.seek(0)
        return sample
    except Exception:
        return b""


def _resolve_local_path(object_path: str) -> Path:
    base = ensure_uploads_dir().resolve()
    parts = [segment for segment in Path(object_path).parts if segment not in {"", ".", "..", "/", "\\"}]
    target_path = (base / Path(*parts)).resolve()
    if base not in target_path.parents and target_path != base:
        raise FileNotFoundError(object_path)
    return target_path


def _remove_object_key(object_path: str) -> None:
    if _is_local_backend():
        try:
            _resolve_local_path(object_path).unlink()
        except Exception:
            pass
        return
    try:
        client = _build_minio_client()
        client.remove_object(settings.minio_bucket_name, object_path)
    except Exception:
        pass


@router.post("/sessions/{session_id}/presigned", response_model=list[UploadPresignResponseItem])
async def presign_uploads(
    session_id: str,
    payload: UploadPresignRequest,
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[UploadPresignResponseItem]:
    session = await db["upload_sessions"].find_one({"_id": session_id, "user_id": current_user["id"]})
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên upload.")
    if session.get("status") != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phiên upload đã đóng.")

    counts = session.get("counts", {}) or {}
    total_keys = int(counts.get("total_keys", 0))
    total_bytes = int(counts.get("total_bytes", 0))
    max_files = int(session.get("max_files") or settings.upload_max_files)
    max_bytes = int(session.get("max_bytes") or settings.upload_max_bytes)

    if max_files > 0 and total_keys + len(payload.files) > max_files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vượt quá số ảnh tối đa cho phép.")

    if max_bytes > 0:
        if any(item.size is None for item in payload.files):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thiếu kích thước file để kiểm tra dung lượng.",
            )
        sizes = [int(item.size) for item in payload.files]
        if total_bytes + sum(sizes) > max_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vượt quá dung lượng tối đa.")

    if _is_local_backend():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Presigned URL chỉ khả dụng với MinIO/S3 backend.",
        )
    try:
        client = _build_minio_client()
    except Exception as exc:
        raise StorageUnavailableError("MinIO không sẵn sàng.") from exc

    responses: list[UploadPresignResponseItem] = []
    for item in payload.files:
        key = _safe_object_key(current_user["id"], session_id, item.filename)
        expires_dt = _now() + timedelta(minutes=10)
        url = client.presigned_put_object(settings.minio_bucket_name, key, expires=timedelta(minutes=10))
        responses.append(
            UploadPresignResponseItem(
                key=key,
                url=url,
                expires_at=int(expires_dt.timestamp()),
                content_type=item.content_type,
            )
        )
    return responses


@router.post("/sessions/{session_id}/direct", response_model=UploadDirectResponse)
async def direct_upload(
    session_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UploadDirectResponse:
    session = await db["upload_sessions"].find_one({"_id": session_id, "user_id": current_user["id"]})
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên upload.")
    if session.get("status") != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phiên upload đã đóng.")

    content_type = file.content_type or "application/octet-stream"
    try:
        size = await asyncio.to_thread(_get_upload_size, file)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không đọc được file.") from exc
    if size <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File rỗng.")

    sample = await asyncio.to_thread(_peek_upload_sample, file)
    if not _looks_like_image(sample):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File không phải ảnh hợp lệ.")

    counts = session.get("counts", {}) or {}
    total_keys = int(counts.get("total_keys", 0))
    total_bytes = int(counts.get("total_bytes", 0))
    max_files = int(session.get("max_files") or settings.upload_max_files)
    max_bytes = int(session.get("max_bytes") or settings.upload_max_bytes)

    if max_files > 0 and total_keys + 1 > max_files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vượt quá số ảnh tối đa cho phép.")
    if max_bytes > 0 and total_bytes + size > max_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vượt quá dung lượng tối đa.")

    key = _safe_object_key(current_user["id"], session_id, file.filename or "upload.bin")
    try:
        await asyncio.to_thread(store_object_stream, key, file.file, size, content_type)
    except StorageUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    update_result = await db["upload_sessions"].update_one(
        {"_id": session_id, "user_id": current_user["id"], "status": "open"},
        {
            "$inc": {"counts.total_keys": 1, "counts.valid_images": 1, "counts.total_bytes": size},
            "$addToSet": {"counted_keys": key},
        },
    )
    if update_result.matched_count == 0:
        await asyncio.to_thread(_remove_object_key, key)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phiên upload đã đóng.")

    return UploadDirectResponse(key=key, size=size, content_type=content_type)


def _looks_like_image(sample_bytes: bytes) -> bool:
    if not sample_bytes:
        return False
    # JPEG
    if sample_bytes.startswith(b"\xFF\xD8\xFF"):
        return True
    # PNG
    if sample_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    # GIF
    if sample_bytes.startswith(b"GIF87a") or sample_bytes.startswith(b"GIF89a"):
        return True
    # WebP
    if sample_bytes.startswith(b"RIFF") and sample_bytes[8:12] == b"WEBP":
        return True
    # TIFF
    if sample_bytes.startswith(b"II*\x00") or sample_bytes.startswith(b"MM\x00*"):
        return True
    return False


@router.post("/sessions/{session_id}/complete-batch", response_model=UploadSessionSummary)
async def complete_batch(
    session_id: str,
    payload: UploadBatchCompleteRequest,
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UploadSessionSummary:
    session = await db["upload_sessions"].find_one({"_id": session_id, "user_id": current_user["id"]})
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên upload.")
    if session.get("status") != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phiên upload đã đóng.")

    counts = session.get("counts", {}) or {}
    total_keys = int(counts.get("total_keys", 0))
    valid_images = int(counts.get("valid_images", 0))
    rejected = int(counts.get("rejected", 0))
    total_bytes = int(counts.get("total_bytes", 0))
    max_files = int(session.get("max_files") or settings.upload_max_files)
    max_bytes = int(session.get("max_bytes") or settings.upload_max_bytes)

    seen: set[str] = set()
    keys: list[str] = []
    for item in payload.keys:
        normalized = str(item).strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        keys.append(normalized)

    counted_keys = set(session.get("counted_keys", []) or [])
    if counted_keys:
        keys = [key for key in keys if key not in counted_keys]

    new_counted: list[str] = []

    if _is_local_backend():
        for key in keys:
            try:
                target_path = _resolve_local_path(key)
                size = target_path.stat().st_size
                if max_files > 0 and total_keys + 1 > max_files:
                    try:
                        target_path.unlink()
                    except Exception:
                        pass
                    rejected += 1
                    continue
                if max_bytes > 0 and total_bytes + size > max_bytes:
                    try:
                        target_path.unlink()
                    except Exception:
                        pass
                    rejected += 1
                    continue
                with target_path.open("rb") as handle:
                    sample = handle.read(262144)
            except FileNotFoundError:
                rejected += 1
                continue

            if not sample:
                rejected += 1
                continue

            total_keys += 1
            total_bytes += size
            if not _looks_like_image(sample):
                try:
                    target_path.unlink()
                except Exception:
                    pass
                rejected += 1
                continue

            valid_images += 1
            new_counted.append(key)
    else:
        try:
            client = _build_minio_client()
        except Exception as exc:
            raise StorageUnavailableError("MinIO không sẵn sàng.") from exc

        for key in keys:
            obj = None
            try:
                stat = client.stat_object(settings.minio_bucket_name, key)
                size = stat.size or 0
                if max_files > 0 and total_keys + 1 > max_files:
                    try:
                        client.remove_object(settings.minio_bucket_name, key)
                    except Exception:
                        pass
                    rejected += 1
                    continue
                if max_bytes > 0 and total_bytes + size > max_bytes:
                    try:
                        client.remove_object(settings.minio_bucket_name, key)
                    except Exception:
                        pass
                    rejected += 1
                    continue
                obj = client.get_object(settings.minio_bucket_name, key, offset=0, length=262144)
                sample = obj.read()
            finally:
                try:
                    if obj is not None:
                        obj.close()
                        obj.release_conn()
                except Exception:
                    pass

            if not sample:
                rejected += 1
                continue

            total_keys += 1
            total_bytes += size
            if not _looks_like_image(sample):
                try:
                    client.remove_object(settings.minio_bucket_name, key)
                except Exception:
                    pass
                rejected += 1
                continue

            valid_images += 1
            new_counted.append(key)

    await db["upload_sessions"].update_one(
        {"_id": session_id},
        {
            "$set": {
                "counts": {
                    "total_keys": total_keys,
                    "valid_images": valid_images,
                    "rejected": rejected,
                    "total_bytes": total_bytes,
                }
            },
            "$addToSet": {"counted_keys": {"$each": new_counted}},
        },
    )
    return UploadSessionSummary(
        session_id=session_id,
        total_keys=total_keys,
        valid_images=valid_images,
        rejected=rejected,
        total_bytes=total_bytes,
    )


@router.post("/sessions/{session_id}/finalize", response_model=UploadSessionSummary)
async def finalize_session(
    session_id: str,
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UploadSessionSummary:
    session = await db["upload_sessions"].find_one({"_id": session_id, "user_id": current_user["id"]})
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên upload.")
    await db["upload_sessions"].update_one({"_id": session_id}, {"$set": {"status": "completed", "closed_at": _now()}})
    counts = session.get("counts", {})
    return UploadSessionSummary(
        session_id=session_id,
        total_keys=int(counts.get("total_keys", 0)),
        valid_images=int(counts.get("valid_images", 0)),
        rejected=int(counts.get("rejected", 0)),
        total_bytes=int(counts.get("total_bytes", 0)),
    )
