from pathlib import Path

from fastapi import Request

UPLOADS_ROUTE_PREFIX = "/uploads"
UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"


def ensure_uploads_dir() -> Path:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOADS_DIR


def resolve_upload_dir(*segments: str) -> Path:
    base = ensure_uploads_dir()
    target = base.joinpath(*segments)
    target.mkdir(parents=True, exist_ok=True)
    return target


def build_public_upload_url(request: Request, relative_path: str) -> str:
    normalized_path = relative_path.replace("\\", "/").lstrip("/")
    return f"{str(request.base_url).rstrip('/')}/{normalized_path}"
