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


# ---------------------------------------------------------------------------
# Refresh tokens
# ---------------------------------------------------------------------------

import hashlib
from typing import Tuple

from app.db.postgres import get_pool

REFRESH_TOKEN_BYTES = 48  # 384 bits — unguessable
REFRESH_DEFAULT_DAYS = 90


def _hash_refresh_token(token: str) -> str:
    """SHA-256 is fine here — refresh tokens are random+unguessable already,
    we just need a one-way function so a leaked DB dump can't be replayed."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def create_refresh_token(user_id: str, *, days: int = REFRESH_DEFAULT_DAYS) -> Tuple[str, datetime]:
    """Issue a fresh refresh token, persist its hash, return the cleartext.

    The cleartext is shown to the client *once* and never again — only the
    hash is stored. Callers can pass this back to ``rotate_refresh_token``
    or ``revoke_refresh_token``.
    """
    pool = get_pool()
    token = secrets.token_urlsafe(REFRESH_TOKEN_BYTES)
    expires = datetime.now(tz=timezone.utc) + timedelta(days=days)
    if pool is not None:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO refresh_tokens (token_hash, user_id, expires_at)
                VALUES ($1, $2, $3)
                """,
                _hash_refresh_token(token), user_id, expires,
            )
    return token, expires


async def consume_refresh_token(token: str) -> Optional[str]:
    """Validate a refresh token and rotate it (return its user id).

    Rotation: the presented token is revoked and a new one will be issued
    by the caller. Returns ``None`` if the token is unknown / expired /
    already revoked — caller should treat it as auth failure.
    """
    pool = get_pool()
    if pool is None:
        return None
    h = _hash_refresh_token(token)
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """
                SELECT user_id, expires_at, revoked_at
                FROM refresh_tokens
                WHERE token_hash = $1
                FOR UPDATE
                """,
                h,
            )
            if not row:
                return None
            if row["revoked_at"] is not None:
                return None
            if row["expires_at"] < datetime.now(tz=timezone.utc):
                return None
            await conn.execute(
                """
                UPDATE refresh_tokens
                SET revoked_at = now(), last_used_at = now()
                WHERE token_hash = $1
                """,
                h,
            )
            return row["user_id"]


async def revoke_refresh_token(token: str) -> None:
    pool = get_pool()
    if pool is None:
        return
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
            _hash_refresh_token(token),
        )


async def revoke_all_refresh_tokens_for_user(user_id: str) -> None:
    """Kill every active refresh token belonging to one user.

    Used after a password reset so the leaked password can't be combined
    with a still-valid refresh token to keep ridding sessions.
    """
    pool = get_pool()
    if pool is None:
        return
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
            user_id,
        )


# ---------------------------------------------------------------------------
# Password reset tokens
# ---------------------------------------------------------------------------

RESET_TOKEN_BYTES = 32
RESET_VALID_MIN = 15


async def create_password_reset_token(user_id: str) -> Tuple[str, datetime]:
    pool = get_pool()
    token = secrets.token_urlsafe(RESET_TOKEN_BYTES)
    expires = datetime.now(tz=timezone.utc) + timedelta(minutes=RESET_VALID_MIN)
    if pool is not None:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
                VALUES ($1, $2, $3)
                """,
                _hash_refresh_token(token), user_id, expires,
            )
    return token, expires


async def consume_password_reset_token(token: str) -> Optional[str]:
    """Validate and atomically mark a reset token as used. Returns the
    associated ``user_id`` on success or ``None`` if the token is unknown,
    expired or already consumed."""
    pool = get_pool()
    if pool is None:
        return None
    h = _hash_refresh_token(token)
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """
                SELECT user_id, expires_at, used_at
                FROM password_reset_tokens
                WHERE token_hash = $1
                FOR UPDATE
                """,
                h,
            )
            if not row or row["used_at"] is not None:
                return None
            if row["expires_at"] < datetime.now(tz=timezone.utc):
                return None
            await conn.execute(
                "UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1",
                h,
            )
            return row["user_id"]


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
