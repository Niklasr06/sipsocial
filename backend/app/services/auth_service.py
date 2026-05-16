"""Password hashing and JWT session tokens.

The service intentionally exposes a tiny surface:

- :func:`hash_password` / :func:`verify_password` for credential checks.
- :func:`create_access_token` / :func:`decode_access_token` for sessions.

Tokens carry only the user id (``sub`` claim). Profile data is loaded fresh
from the database on every authenticated request so role changes propagate
immediately.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Optional

import bcrypt
import jwt

from app.core.config import get_settings


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

MIN_PASSWORD_LENGTH = 8


def hash_password(plain: str) -> str:
    """Hash a plain password with bcrypt (cost 12 by default)."""
    if not plain or len(plain) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("ascii")


def verify_password(plain: str, hashed: Optional[str]) -> bool:
    """Constant-time compare a plain password against a bcrypt hash.

    Returns ``False`` (rather than raising) for any input the hasher
    can't handle, so callers don't need to wrap this in try/except.
    """
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("ascii"))
    except (ValueError, TypeError):
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

JWT_ALGORITHM = "HS256"


@lru_cache(maxsize=1)
def _signing_secret() -> str:
    """Resolve the JWT secret, falling back to an ephemeral one in dev.

    A missing secret is logged loudly when the module is first imported, so
    operators notice — without it crashing the whole app during local dev.
    """
    secret = get_settings().JWT_SECRET.strip()
    if secret:
        return secret
    return secrets.token_urlsafe(48)


def create_access_token(user_id: str, *, extra_claims: Optional[dict] = None) -> str:
    settings = get_settings()
    now = datetime.now(tz=timezone.utc)
    payload: dict = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.JWT_EXPIRES_HOURS)).timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, _signing_secret(), algorithm=JWT_ALGORITHM)


class InvalidTokenError(Exception):
    """Raised when a bearer token is missing, malformed or expired."""


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, _signing_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise InvalidTokenError("Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidTokenError(f"Invalid token: {exc}") from exc


# ---------------------------------------------------------------------------
# QR check-in tokens
# ---------------------------------------------------------------------------
# Separate ``purpose`` claim so a session token can never be used as a QR
# token (or vice versa) even though they share the signing secret.

QR_PURPOSE = "qr_checkin"


def create_qr_token(meeting_id: str, *, valid_hours: int = 24) -> str:
    now = datetime.now(tz=timezone.utc)
    payload = {
        "purpose": QR_PURPOSE,
        "meeting_id": meeting_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=valid_hours)).timestamp()),
    }
    return jwt.encode(payload, _signing_secret(), algorithm=JWT_ALGORITHM)


def decode_qr_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, _signing_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise InvalidTokenError("QR token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidTokenError(f"Invalid QR token: {exc}") from exc
    if payload.get("purpose") != QR_PURPOSE:
        raise InvalidTokenError("Wrong token purpose.")
    if not payload.get("meeting_id"):
        raise InvalidTokenError("QR token missing meeting id.")
    return payload
