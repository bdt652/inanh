from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time

from app.core.config import settings


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + padding)


def create_access_token(subject: str) -> tuple[str, int]:
    now = int(time.time())
    expires_at = now + settings.admin_token_ttl_seconds
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": subject, "iat": now, "exp": expires_at}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":"), ensure_ascii=True).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":"), ensure_ascii=True).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = hmac.new(settings.admin_token_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    token = f"{header_b64}.{payload_b64}.{_b64url_encode(signature)}"
    return token, expires_at


def verify_access_token(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token format.")
    header_b64, payload_b64, signature_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_signature = hmac.new(settings.admin_token_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    actual_signature = _b64url_decode(signature_b64)
    if not hmac.compare_digest(expected_signature, actual_signature):
        raise ValueError("Invalid token signature.")

    payload_raw = _b64url_decode(payload_b64)
    payload = json.loads(payload_raw.decode("utf-8"))
    exp = int(payload.get("exp", 0))
    if exp <= int(time.time()):
        raise ValueError("Token is expired.")
    return payload


def create_password_hash(password: str) -> tuple[str, str]:
    salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return _b64url_encode(salt), _b64url_encode(derived)


def verify_password(password: str, salt_b64: str, password_hash_b64: str) -> bool:
    salt = _b64url_decode(salt_b64)
    expected = _b64url_decode(password_hash_b64)
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return hmac.compare_digest(candidate, expected)
