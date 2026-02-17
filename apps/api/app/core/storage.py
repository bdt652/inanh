from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

try:
    from minio import Minio
    from minio.error import S3Error
except Exception:  # pragma: no cover - optional dependency in local test environments
    Minio = None  # type: ignore[assignment]

    class S3Error(Exception):
        code = "UnknownError"

from app.core.config import settings
from app.core.uploads import ensure_uploads_dir


class StorageUnavailableError(RuntimeError):
    pass


def _storage_backend() -> str:
    return settings.storage_backend.strip().lower()


def _is_local_backend() -> bool:
    return _storage_backend() == "local"


def _parse_minio_endpoint() -> tuple[str, bool]:
    raw_endpoint = settings.minio_endpoint.strip()
    parsed = urlparse(raw_endpoint)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return parsed.netloc, parsed.scheme == "https"
    if raw_endpoint.startswith("http://"):
        return raw_endpoint.replace("http://", "", 1), False
    if raw_endpoint.startswith("https://"):
        return raw_endpoint.replace("https://", "", 1), True
    return raw_endpoint, settings.minio_secure


def _build_minio_client() -> Minio:
    if Minio is None:
        raise StorageUnavailableError("MinIO client dependency is not installed.")
    endpoint, secure = _parse_minio_endpoint()
    return Minio(
        endpoint,
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        secure=secure,
    )


def _resolve_local_path(object_path: str) -> Path:
    parts = [segment for segment in Path(object_path).parts if segment not in {"", ".", "..", "/", "\\"}]
    target_path = (ensure_uploads_dir() / Path(*parts)).resolve()
    uploads_root = ensure_uploads_dir().resolve()
    if uploads_root not in target_path.parents and target_path != uploads_root:
        raise FileNotFoundError(object_path)
    return target_path


def ensure_storage_ready() -> None:
    if _is_local_backend():
        ensure_uploads_dir()
        return
    try:
        client = _build_minio_client()
        if not client.bucket_exists(settings.minio_bucket_name):
            client.make_bucket(settings.minio_bucket_name)
    except Exception as exc:
        raise StorageUnavailableError("Failed to initialize MinIO storage.") from exc


def store_object_bytes(object_path: str, data: bytes, content_type: str) -> None:
    if _is_local_backend():
        destination = _resolve_local_path(object_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        return
    try:
        client = _build_minio_client()
        payload = BytesIO(data)
        client.put_object(
            settings.minio_bucket_name,
            object_path,
            payload,
            length=len(data),
            content_type=content_type,
        )
    except Exception as exc:
        raise StorageUnavailableError("Failed to upload object to MinIO.") from exc


def load_object_bytes(object_path: str) -> tuple[bytes, str]:
    if _is_local_backend():
        source = _resolve_local_path(object_path)
        if not source.exists():
            raise FileNotFoundError(object_path)
        # Upload endpoint only accepts image types. Return a generic image MIME fallback when missing.
        suffix = source.suffix.lower()
        media_type = {
            ".avif": "image/avif",
            ".gif": "image/gif",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }.get(suffix, "application/octet-stream")
        return source.read_bytes(), media_type
    try:
        client = _build_minio_client()
        response = client.get_object(settings.minio_bucket_name, object_path)
        try:
            body = response.read()
            media_type = response.headers.get("Content-Type", "application/octet-stream")
            return body, media_type
        finally:
            response.close()
            response.release_conn()
    except S3Error as exc:
        if exc.code in {"NoSuchKey", "NoSuchObject", "NoSuchBucket"}:
            raise FileNotFoundError(object_path) from exc
        raise StorageUnavailableError("Failed to read object from MinIO.") from exc
    except Exception as exc:
        raise StorageUnavailableError("Failed to read object from MinIO.") from exc
