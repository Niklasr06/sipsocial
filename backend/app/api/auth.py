"""Authentication routes: register, login, refresh, logout, /me.

Note: ``from __future__ import annotations`` is intentionally NOT used.
FastAPI + slowapi + Body() defaults trip pydantic's TypeAdapter when
annotations are postponed (it tries to resolve ForwardRefs and fails).
"""

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status

from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.db.postgres import is_connected
import logging

from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
)
from app.schemas.user import User, UserCreate
from app.services import auth_service, email_service, user_service

logger = logging.getLogger("sipsocial.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterRequest = Body(...)) -> AuthResponse:
    if not is_connected():
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
    access = auth_service.create_access_token(user.id or "")
    refresh, _ = await auth_service.create_refresh_token(user.id or "")
    return AuthResponse(token=access, refresh_token=refresh, user=user)


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest = Body(...)) -> AuthResponse:
    user = await user_service.get_user_by_email(payload.email)
    hashed = await user_service.get_password_hash(user.id) if user else None
    if not user or not auth_service.verify_password(payload.password, hashed):
        # Same wording for both failures so email existence isn't leaked.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-Mail oder Passwort stimmt nicht.",
        )
    access = auth_service.create_access_token(user.id or "")
    refresh, _ = await auth_service.create_refresh_token(user.id or "")
    return AuthResponse(token=access, refresh_token=refresh, user=user)


@router.post("/refresh", response_model=RefreshResponse)
@limiter.limit("30/minute")
async def refresh(request: Request, payload: RefreshRequest = Body(...)) -> RefreshResponse:
    """Exchange a refresh token for a fresh access token *and* refresh token.

    Token rotation: the presented refresh token is revoked atomically and
    a new one issued. If somebody replays an old token after rotation,
    they get 401 — which is the right outcome.
    """
    user_id = await auth_service.consume_refresh_token(payload.refresh_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalid or expired.",
        )
    access = auth_service.create_access_token(user_id)
    new_refresh, _ = await auth_service.create_refresh_token(user_id)
    return RefreshResponse(token=access, refresh_token=new_refresh)


@router.post("/logout", status_code=204, response_class=Response)
async def logout(payload: RefreshRequest) -> Response:
    """Best-effort revocation. We don't 401 if the token is unknown — that
    would leak whether a given refresh token exists. Silent success is fine."""
    await auth_service.revoke_refresh_token(payload.refresh_token)
    return Response(status_code=204)


@router.get("/me", response_model=User)
async def me(current: User = Depends(get_current_user)) -> User:
    return current


@router.post("/password-reset/request", status_code=202, response_class=Response)
@limiter.limit("3/minute")
async def password_reset_request(request: Request, payload: PasswordResetRequest = Body(...)) -> Response:
    """Issue a password-reset token for the given email.

    Always returns 202 — we don't tell the caller whether the email exists,
    otherwise the endpoint becomes an email-enumeration oracle. Tokens
    valid 15 minutes, single use.

    Wenn Postmark konfiguriert ist (``POSTMARK_SERVER_TOKEN`` gesetzt), wird
    der Code per Mail rausgeschickt. Ohne Konfig landet er nur im Backend-Log
    — Fallback für lokale Dev-Runs ohne Mail-Provider.
    """
    user = await user_service.get_user_by_email(payload.email)
    if user and user.id:
        token, expires = await auth_service.create_password_reset_token(user.id)
        sent = await email_service.send_password_reset_email(
            to=payload.email,
            token=token,
            expires_iso=expires.strftime("%d.%m.%Y %H:%M UTC"),
        )
        if not sent:
            # Postmark down oder nicht konfiguriert — Token immer ins Log,
            # damit der User per Out-of-Band-Weg (Support, Render-Log) noch
            # an seinen Reset-Code kommt. Loglevel WARN bleibt, sonst geht
            # die Zeile in Render-Logs unter.
            logger.warning(
                "[password-reset] mail-versand fehlgeschlagen für %s — token=%s expires=%s",
                payload.email, token, expires.isoformat(),
            )
    return Response(status_code=202)


@router.post("/password-reset/confirm", response_model=AuthResponse)
@limiter.limit("5/minute")
async def password_reset_confirm(request: Request, payload: PasswordResetConfirm = Body(...)) -> AuthResponse:
    """Consume a reset token + set a new password atomically.

    Returns a fresh access + refresh pair so the client can transition
    straight into a logged-in state. All previous refresh tokens for the
    user are revoked.
    """
    user_id = await auth_service.consume_password_reset_token(payload.token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token ungültig oder abgelaufen.",
        )
    try:
        hashed = auth_service.hash_password(payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    await user_service.set_password_hash(user_id, hashed)
    await auth_service.revoke_all_refresh_tokens_for_user(user_id)

    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden.")
    access = auth_service.create_access_token(user.id or "")
    refresh, _ = await auth_service.create_refresh_token(user.id or "")
    return AuthResponse(token=access, refresh_token=refresh, user=user)
