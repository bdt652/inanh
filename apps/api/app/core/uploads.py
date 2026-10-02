from pathlib import Path

import json
from fastapi import Request

UPLOADS_ROUTE_PREFIX = "/uploads"
UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"


def _is_local_backend() -> bool:
    """Check if using local storage backend (avoids circular import with storage.py)."""
    from app.core.config import settings
    return settings.storage_backend.strip().lower() == "local"


def ensure_uploads_dir() -> Path:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOADS_DIR


def resolve_upload_dir(*segments: str) -> Path:
    base = ensure_uploads_dir()
    target = base.joinpath(*segments)
    target.mkdir(parents=True, exist_ok=True)
    return target


def _resolve_forwarded_proto(request: Request) -> str | None:
    proto = request.headers.get("x-forwarded-proto")
    if proto:
        return proto.split(",")[0].strip()
    cf_visitor = request.headers.get("cf-visitor")
    if cf_visitor:
        try:
            data = json.loads(cf_visitor)
            scheme = str(data.get("scheme") or "").strip()
            return scheme or None
        except Exception:
            return None
    return None


def build_public_upload_url(request: Request, relative_path: str) -> str:
    """
    Build the public URL for an uploaded file.

    Strategy:
    1. If using MinIO with MINIO_PUBLIC_BASE_URL set, return direct MinIO URL.
    2. Otherwise, proxy through the backend API's /uploads route.
    """
    normalized_path = relative_path.replace("\\", "/").lstrip("/")

    # Option 1: Direct MinIO public URL (no backend proxy)
    if not _is_local_backend():
        from app.core.config import settings
        if settings.minio_public_base_url:
            base = settings.minio_public_base_url.rstrip("/")
            return f"{base}/{normalized_path}"

    # Option 2: Proxy through backend API
    proto = _resolve_forwarded_proto(request)
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if proto and host:
        base = f"{proto}://{host}".rstrip("/")
        return f"{base}{UPLOADS_ROUTE_PREFIX}/{normalized_path}"

    # Fallback: use request.base_url (works in development)
    return f"{str(request.base_url).rstrip('/')}{UPLOADS_ROUTE_PREFIX}/{normalized_path}"


def build_object_url(relative_path: str) -> str:
    """
    Build a public URL for a stored object without needing a Request.

    Used by backend-only flows (e.g. AI-generated images) that store bytes
    directly. Mirrors build_public_upload_url but resolves the host from
    settings instead of request headers.
    """
    normalized = relative_path.replace("\\", "/").lstrip("/")

    # Option 1: Direct MinIO public URL (no backend proxy)
    if not _is_local_backend():
        from app.core.config import settings

        if settings.minio_public_base_url:
            base = settings.minio_public_base_url.rstrip("/")
            return f"{base}/{normalized}"

    # Fallback: relative /uploads path (works when served from same origin)
    return f"{UPLOADS_ROUTE_PREFIX}/{normalized}"
