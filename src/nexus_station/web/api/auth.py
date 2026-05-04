"""Auth API routes for Kimi Next."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from nexus_station.web.auth_users import (
    create_first_user,
    is_auth_configured,
    verify_login,
    verify_token,
    regenerate_token,
    verify_admin_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthStatusResponse(BaseModel):
    configured: bool


class SetupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)


class SetupResponse(BaseModel):
    success: bool
    username: str
    token: str


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    username: str
    token: str


class MeResponse(BaseModel):
    username: str


class TokenRequest(BaseModel):
    token: str


@router.get("/status", summary="Check if auth is configured")
async def auth_status() -> AuthStatusResponse:
    """Returns whether at least one user exists."""
    return AuthStatusResponse(configured=is_auth_configured())


@router.post("/setup", summary="Create first admin user")
async def auth_setup(request: SetupRequest) -> SetupResponse:
    """Create the first user. Only works when no users exist."""
    if is_auth_configured():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Auth already configured. Use /login instead.",
        )
    try:
        result = create_first_user(request.username, request.password)
        return SetupResponse(success=True, username=result["username"], token=result["token"])
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post("/login", summary="Login and get API token")
async def auth_login(request: LoginRequest) -> LoginResponse:
    """Authenticate with username/password. Returns API token."""
    result = verify_login(request.username, request.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return LoginResponse(success=True, username=result["username"], token=result["token"])


@router.post("/me", summary="Get current user info from token")
async def auth_me(request: TokenRequest) -> MeResponse:
    """Verify token and return user info."""
    user = verify_token(request.token)
    if not user:
        # Check master admin token
        admin = verify_admin_token(request.token)
        if admin:
            return MeResponse(username=admin["username"])
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    return MeResponse(username=user["username"])


@router.post("/refresh", summary="Generate new API token")
async def auth_refresh(request: TokenRequest) -> LoginResponse:
    """Generate new token for the user. Old token becomes invalid."""
    user = verify_token(request.token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    new_token = regenerate_token(user["username"])
    if not new_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate token",
        )
    return LoginResponse(success=True, username=user["username"], token=new_token)
