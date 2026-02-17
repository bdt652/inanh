from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_FILE = Path(__file__).resolve().parents[4] / ".env"


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "inanh24h"
    admin_token_secret: str
    admin_token_ttl_seconds: int = 86400
    storage_backend: str = "minio"
    minio_endpoint: str = "http://localhost:9000"
    minio_root_user: str = "minio"
    minio_root_password: str = "minio123"
    minio_bucket_name: str = "inanh24h-media"
    minio_secure: bool = False

    @field_validator("storage_backend")
    @classmethod
    def validate_storage_backend(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"local", "minio"}:
            raise ValueError("storage_backend must be either 'local' or 'minio'.")
        return normalized

    model_config = SettingsConfigDict(env_file=(ROOT_ENV_FILE, ".env"), env_file_encoding="utf-8", extra="ignore")


settings = Settings()
