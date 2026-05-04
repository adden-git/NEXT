"""AES-256-GCM encryption for sensitive database fields."""

from __future__ import annotations

import base64

from cryptography.fernet import Fernet

from auth_server.config import settings


# Derive Fernet key from settings.encryption_key
# Fernet requires 32 bytes base64-encoded key
_fernet_key = base64.urlsafe_b64encode(
    settings.encryption_key.encode()[:32].ljust(32, b"\0")
)
_fernet = Fernet(_fernet_key)


def encrypt(plaintext: str) -> str:
    """Encrypt plaintext string. Returns base64-encoded ciphertext."""
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt base64-encoded ciphertext."""
    return _fernet.decrypt(ciphertext.encode()).decode()
