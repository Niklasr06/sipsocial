from __future__ import annotations

import json
from typing import List, Optional

from app.db.postgres import get_pool
from app.schemas.user import User, UserCreate, UserUpdate
from app.schemas.common import PrivacySettings
from app.services import mock_data
from app.services.repo import new_id, parse_jsonb


def _initials(name: str) -> str:
    parts = [p for p in name.strip().split() if p]
    if not parts:
        return "··"
    if len(parts) == 1:
        w = parts[0]
        return (w[0] + (w[1] if len(w) > 1 else w[0])).upper()
    return (parts[0][0] + parts[-1][0]).upper()


def _row_to_user(row) -> User:
    return User(
        id=row["id"],
        pseudonym=row["pseudonym"],
        email=row["email"],
        age_range=row["age_range"],
        bio=row["bio"] or "",
        interests=list(row["interests"] or []),
        meeting_preference=row["meeting_preference"],
        privacy_settings=PrivacySettings(**parse_jsonb(row["privacy_settings"])),
        no_show_count=row["no_show_count"],
        trust_status=row["trust_status"],
        initials=row["initials"],
        accent_color=row["accent_color"],
    )


async def create_user(payload: UserCreate) -> User:
    pool = get_pool()
    user_id = new_id("user")
    initials = _initials(payload.pseudonym)
    privacy = PrivacySettings()

    if pool is None:
        return User(
            id=user_id,
            pseudonym=payload.pseudonym,
            email=payload.email,
            initials=initials,
        )

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO users
                (id, pseudonym, email, initials, privacy_settings)
            VALUES ($1, $2, $3, $4, $5::jsonb)
            RETURNING *
            """,
            user_id,
            payload.pseudonym,
            payload.email,
            initials,
            json.dumps(privacy.model_dump()),
        )
    return _row_to_user(row)


async def get_user(user_id: str) -> Optional[User]:
    pool = get_pool()
    if pool is None:
        for u in mock_data.MOCK_USERS:
            if u.id == user_id:
                return u
        return None
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    return _row_to_user(row) if row else None


async def get_user_by_email(email: str) -> Optional[User]:
    """Look up a user by email, case-insensitive (matches users_email_unique)."""
    pool = get_pool()
    if pool is None:
        return None
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM users WHERE lower(email) = lower($1)", email,
        )
    return _row_to_user(row) if row else None


async def get_password_hash(user_id: str) -> Optional[str]:
    """Return the stored bcrypt hash for ``user_id`` (or ``None``)."""
    pool = get_pool()
    if pool is None:
        return None
    async with pool.acquire() as conn:
        return await conn.fetchval(
            "SELECT password_hash FROM users WHERE id = $1", user_id,
        )


async def set_password_hash(user_id: str, hashed: str) -> None:
    pool = get_pool()
    if pool is None:
        return
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1",
            user_id, hashed,
        )


async def create_user_with_password(
    payload: UserCreate, password_hash: str
) -> User:
    """Atomic register: insert user *and* their bcrypt hash."""
    pool = get_pool()
    user_id = new_id("user")
    initials = _initials(payload.pseudonym)
    privacy = PrivacySettings()

    if pool is None:
        return User(
            id=user_id,
            pseudonym=payload.pseudonym,
            email=payload.email,
            initials=initials,
        )

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO users
                (id, pseudonym, email, password_hash, initials, privacy_settings)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb)
            RETURNING *
            """,
            user_id,
            payload.pseudonym,
            payload.email,
            password_hash,
            initials,
            json.dumps(privacy.model_dump()),
        )
    return _row_to_user(row)


async def list_users() -> List[User]:
    pool = get_pool()
    if pool is None:
        return mock_data.MOCK_USERS
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM users ORDER BY created_at")
    return [_row_to_user(r) for r in rows]


_PATCH_COLUMNS = {
    "pseudonym": "pseudonym",
    "age_range": "age_range",
    "bio": "bio",
    "interests": "interests",
    "meeting_preference": "meeting_preference",
}


async def update_user(user_id: str, patch: UserUpdate) -> Optional[User]:
    pool = get_pool()
    if pool is None:
        existing = await get_user(user_id)
        if not existing:
            return None
        data = patch.model_dump(exclude_none=True)
        if "pseudonym" in data:
            data["initials"] = _initials(data["pseudonym"])
        return existing.model_copy(update=data)

    data = patch.model_dump(exclude_none=True)
    if not data:
        return await get_user(user_id)

    set_parts: list[str] = []
    args: list = []
    idx = 1
    for key, value in data.items():
        if key == "pseudonym":
            set_parts.append(f"pseudonym = ${idx}")
            args.append(value)
            idx += 1
            set_parts.append(f"initials = ${idx}")
            args.append(_initials(value))
            idx += 1
            continue
        if key == "privacy_settings":
            set_parts.append(f"privacy_settings = ${idx}::jsonb")
            args.append(json.dumps(value))
            idx += 1
            continue
        if key in _PATCH_COLUMNS:
            set_parts.append(f"{_PATCH_COLUMNS[key]} = ${idx}")
            args.append(value)
            idx += 1
    if not set_parts:
        return await get_user(user_id)
    set_parts.append("updated_at = now()")
    args.append(user_id)
    sql = f"UPDATE users SET {', '.join(set_parts)} WHERE id = ${idx} RETURNING *"
    async with pool.acquire() as conn:
        row = await conn.fetchrow(sql, *args)
    return _row_to_user(row) if row else None


async def set_push_token(user_id: str, token: Optional[str]) -> None:
    """Store (or clear with ``None``) the user's Expo push token."""
    pool = get_pool()
    if pool is None:
        return
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET expo_push_token = $2, updated_at = now() WHERE id = $1",
            user_id, token,
        )


async def get_push_token(user_id: str) -> Optional[str]:
    pool = get_pool()
    if pool is None:
        return None
    async with pool.acquire() as conn:
        return await conn.fetchval(
            "SELECT expo_push_token FROM users WHERE id = $1", user_id,
        )


async def adjust_no_show(user_id: str, delta: int = 1) -> Optional[User]:
    pool = get_pool()
    if pool is None:
        return None
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE users
            SET no_show_count = GREATEST(0, no_show_count + $2), updated_at = now()
            WHERE id = $1
            RETURNING *
            """,
            user_id, delta,
        )
    return _row_to_user(row) if row else None
