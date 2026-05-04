"""SQLAlchemy models for auth server."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from auth_server.crypto import decrypt, encrypt
from auth_server.database import Base


class User(Base):
    """Registered user account."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    _email = Column("email", String(255), unique=True, nullable=True)
    _password_hash = Column("password_hash", Text, nullable=False)
    role = Column(String(20), default="user", nullable=False)  # user, admin
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)
    license_expires_at = Column(DateTime, nullable=True)

    @property
    def email(self) -> str | None:
        return decrypt(self._email) if self._email else None

    @email.setter
    def email(self, value: str | None) -> None:
        self._email = encrypt(value) if value else None

    @property
    def password_hash(self) -> str:
        return self._password_hash

    @password_hash.setter
    def password_hash(self, value: str) -> None:
        self._password_hash = value


class Token(Base):
    """API token for device/session authentication."""

    __tablename__ = "tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    token_hash = Column(String(128), unique=True, index=True, nullable=False)
    name = Column(String(100), default="default", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
