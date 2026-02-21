from pathlib import Path

from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_FILE = Path(__file__).resolve().parents[4] / ".env"


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "inanh24h"
    admin_token_secret: str
    admin_token_ttl_seconds: int = 86400
    customer_token_secret: str = "change-this-customer-secret"
    customer_token_ttl_seconds: int = 604800  # 7 days
    google_client_id: str | None = None
    phone_otp_ttl_seconds: int = 300
    phone_otp_debug: bool = False
    sms_provider_url: str | None = None
    sms_provider_token: str | None = None
    sms_sender_id: str | None = None
    upload_min_files: int = 1
    upload_max_files: int = 10000
    upload_max_bytes: int = 20_000_000_000  # 20 GB
    upload_require_verified_phone_threshold: int = 100
    storage_backend: str = "minio"
    minio_endpoint: str = "http://localhost:9000"
    minio_root_user: str = "minio"
    minio_root_password: str = "minio123"
    minio_bucket_name: str = "inanh24h-media"
    minio_secure: bool = False
    cors_allow_origins: List[str] = ["http://localhost:3000", "https://inanh24h.com", "https://www.inanh24h.com"]

    @field_validator("storage_backend")
    @classmethod
    def validate_storage_backend(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"local", "minio"}:
            raise ValueError("storage_backend must be either 'local' or 'minio'.")
        return normalized

    @field_validator("cors_allow_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        raise ValueError("cors_allow_origins must be a comma-separated string or list.")

    model_config = SettingsConfigDict(env_file=(ROOT_ENV_FILE, ".env"), env_file_encoding="utf-8", extra="ignore")


settings = Settings()
