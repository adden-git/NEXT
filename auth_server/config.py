"""Auth server configuration."""

from __future__ import annotations

import secrets
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Auth server settings loaded from env or .env file."""

    # Security
    secret_key: str = secrets.token_urlsafe(32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Database
    database_url: str = "sqlite:///./auth_server.db"

    # Encryption key for sensitive fields (AES-256-GCM)
    # Must be 32 bytes base64-encoded or auto-generated
    encryption_key: str = secrets.token_urlsafe(32)

    # Server
    host: str = "0.0.0.0"
    port: int = 5601

    # Admin registration secret (prevents anyone from registering as admin)
    admin_secret: str = secrets.token_urlsafe(16)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"
        env_prefix = "NEXUS_"


settings = Settings()
