import json

from app.api.v1.uploads import _public_presigned_url
from app.core.config import settings
from app.core.storage import _public_read_policy


def _with_public_base(value: str | None):
    original = settings.minio_public_base_url
    settings.minio_public_base_url = value
    return original


def test_public_read_policy_allows_get_object() -> None:
    policy = json.loads(_public_read_policy("inanh24h-media"))
    statements = policy["Statement"]
    assert len(statements) == 1
    statement = statements[0]
    assert statement["Effect"] == "Allow"
    assert statement["Action"] == ["s3:GetObject"]
    assert statement["Resource"] == ["arn:aws:s3:::inanh24h-media/*"]


def test_presigned_url_rewritten_to_public_host() -> None:
    original = _with_public_base("https://media.inanh24h.com/inanh24h-media")
    try:
        raw = (
            "http://192.168.53.105:9000/inanh24h-media/user-uploads/u/s/photo.jpg"
            "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123"
        )
        rewritten = _public_presigned_url(raw)
        assert rewritten.startswith("https://media.inanh24h.com/inanh24h-media/user-uploads/u/s/photo.jpg?")
        assert "X-Amz-Signature=abc123" in rewritten
        assert "192.168.53.105" not in rewritten
    finally:
        settings.minio_public_base_url = original


def test_presigned_url_falls_back_without_public_base() -> None:
    original = _with_public_base("")
    try:
        raw = "http://192.168.53.105:9000/inanh24h-media/photo.jpg?sig=1"
        assert _public_presigned_url(raw) == raw
    finally:
        settings.minio_public_base_url = original
