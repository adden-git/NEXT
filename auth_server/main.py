"""NEXUS Auth Server — centralized authentication and license management."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth_server.auth import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    hash_api_token,
    verify_api_token,
    verify_password,
)
from auth_server.config import settings
from auth_server.database import SessionLocal, engine, get_db
from auth_server.models import Base, Token, User

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NEXUS Auth Server",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════
#  Schemas
# ═══════════════════════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    email: str | None = Field(default=None, max_length=255)
    admin_secret: str | None = Field(default=None)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str


class VerifyRequest(BaseModel):
    token: str


class VerifyResponse(BaseModel):
    valid: bool
    user_id: int | None = None
    username: str | None = None
    role: str | None = None
    license_expires_at: str | None = None


class MeResponse(BaseModel):
    user_id: int
    username: str
    role: str
    license_expires_at: str | None = None


class CreateApiTokenRequest(BaseModel):
    name: str = Field(default="default", max_length=100)
    expires_days: int | None = Field(default=None, ge=1)


class CreateApiTokenResponse(BaseModel):
    token: str
    name: str
    expires_at: str | None = None


class AdminUserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: str
    license_expires_at: str | None = None


# ═══════════════════════════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _get_current_user(db: Session, token: str) -> User:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


# ═══════════════════════════════════════════════════════════════════════════════
#  Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/healthz")
def health() -> dict:
    return {"status": "ok"}


@app.post("/auth/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Register a new user. Provide admin_secret to create an admin account."""
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")

    role = "user"
    if request.admin_secret and secrets.compare_digest(
        hashlib.sha256(request.admin_secret.encode()).hexdigest(),
        hashlib.sha256(settings.admin_secret.encode()).hexdigest(),
    ):
        role = "admin"

    user = User(
        username=request.username,
        password_hash=get_password_hash(request.password),
        role=role,
    )
    if request.email:
        user.email = request.email

    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": str(user.id), "role": role})
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60,
        role=role,
    )


@app.post("/auth/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate and get JWT token."""
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60,
        role=user.role,
    )


@app.post("/auth/verify", response_model=VerifyResponse)
def verify(request: VerifyRequest, db: Session = Depends(get_db)) -> VerifyResponse:
    """Verify a JWT or API token. Called by NEXUS Station instances."""
    # Try JWT first
    payload = decode_access_token(request.token)
    if payload:
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == int(user_id), User.is_active).first() if user_id else None
        if user:
            return VerifyResponse(
                valid=True,
                user_id=user.id,
                username=user.username,
                role=user.role,
                license_expires_at=user.license_expires_at.isoformat() if user.license_expires_at else None,
            )

    # Try API token
    token_hash = hash_api_token(request.token)
    api_token = db.query(Token).filter(Token.token_hash == token_hash, Token.is_active).first()
    if api_token:
        if api_token.expires_at and api_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            return VerifyResponse(valid=False)
        api_token.last_used_at = datetime.now(timezone.utc)
        db.commit()
        user = db.query(User).filter(User.id == api_token.user_id, User.is_active).first()
        if user:
            return VerifyResponse(
                valid=True,
                user_id=user.id,
                username=user.username,
                role=user.role,
                license_expires_at=user.license_expires_at.isoformat() if user.license_expires_at else None,
            )

    return VerifyResponse(valid=False)


@app.get("/auth/me", response_model=MeResponse)
def me(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> MeResponse:
    """Get current user info from Bearer token."""
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = _get_current_user(db, token)
    return MeResponse(
        user_id=user.id,
        username=user.username,
        role=user.role,
        license_expires_at=user.license_expires_at.isoformat() if user.license_expires_at else None,
    )


@app.post("/auth/tokens", response_model=CreateApiTokenResponse)
def create_api_token(
    request: CreateApiTokenRequest,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
) -> CreateApiTokenResponse:
    """Create a long-lived API token for machine authentication."""
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = _get_current_user(db, token)

    raw_token = secrets.token_urlsafe(32)
    api_token = Token(
        user_id=user.id,
        token_hash=hash_api_token(raw_token),
        name=request.name,
        expires_at=(datetime.now(timezone.utc) + timedelta(days=request.expires_days)) if request.expires_days else None,
    )
    db.add(api_token)
    db.commit()

    return CreateApiTokenResponse(
        token=raw_token,
        name=request.name,
        expires_at=api_token.expires_at.isoformat() if api_token.expires_at else None,
    )


@app.get("/admin/users")
def list_users(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> list[AdminUserOut]:
    """Admin-only: list all registered users."""
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = _get_current_user(db, token)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    users = db.query(User).all()
    return [
        AdminUserOut(
            id=u.id,
            username=u.username,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at.isoformat() if u.created_at else "",
            license_expires_at=u.license_expires_at.isoformat() if u.license_expires_at else None,
        )
        for u in users
    ]
