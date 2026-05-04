"""Password hashing and JWT utilities."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from auth_server.config import settings


def _pbkdf2_hash(password: str) -> str:
    """Hash password with PBKDF2-SHA256. Returns salt$hash format."""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()
    return f"{salt}${pwd_hash}"


def _pbkdf2_verify(password: str, hashed: str) -> bool:
    try:
        salt, stored_hash = hashed.split("$", 1)
    except ValueError:
        return False
    computed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()
    return hmac.compare_digest(computed, stored_hash)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _pbkdf2_verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return _pbkdf2_hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None


def hash_api_token(token: str) -> str:
    """Hash an API token for storage (SHA-256, not bcrypt — faster verify)."""
    return hashlib.sha256(token.encode()).hexdigest()


def verify_api_token(provided: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_api_token(provided), expected_hash)
