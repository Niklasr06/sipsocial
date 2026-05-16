"""Authentication routes: register, login, /me.

All other API endpoints stay open for now; we'll lock down mutating routes
incrementally. ``GET /api/auth/me`` is the canonical "who am I" endpoint that
the frontend polls on launch to restore a session.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.db.postgres import is_connected
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.schemas.user import User, UserCreate
from app.services import auth_service, user_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest) -> AuthResponse:
    if not is_connected():
        # Without persistence we can't make the credential round-trip stable.
        raise HTTPException(
            status_code=503,
            detail="Database not connected — registration is not available.",
        )

    existing = await user_service.get_user_by_email(payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Diese E-Mail ist bereits registriert.",
        )

    try:
        hashed = auth_service.hash_password(payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    user = await user_service.create_user_with_password(
        UserCreate(pseudonym=payload.pseudonym, email=payload.email),
        hashed,
    )
    token = auth_service.create_access_token(user.id or "")
    return AuthResponse(token=token, user=user)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
    user = await user_service.get_user_by_email(payload.email)
    hashed = await user_service.get_password_hash(user.id) if user else None
    if not user or not auth_service.verify_password(payload.password, hashed):
        # Use the same wording for "no such user" and "wrong password" so
        # email existence isn't leaked through the error message.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-Mail oder Passwort stimmt nicht.",
        )
    token = auth_service.create_access_token(user.id or "")
    return AuthResponse(token=token, user=user)


@router.get("/me", response_model=User)
async def me(current: User = Depends(get_current_user)) -> User:
    return current
