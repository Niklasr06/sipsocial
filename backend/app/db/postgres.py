"""Postgres (Neon) connection management.

The backend can run in two modes:

- **DB-backed**: ``DATABASE_URL`` is set and the cluster is reachable. All
  collections are read/written through an ``asyncpg`` connection pool.
- **Mock-only**: ``DATABASE_URL`` is empty or the cluster cannot be reached.
  The API still serves data from the bundled mock dataset; writes are
  no-ops. Routes never crash because the database is unavailable — they
  degrade.

Neon needs SSL. We pass ``ssl="require"`` to asyncpg by default. Local
Postgres installs that don't have SSL configured can append
``?sslmode=disable`` to the URL.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Iterable, Optional

import asyncpg

from app.core.config import get_settings

logger = logging.getLogger("sipsocial.db")

SCHEMA_FILE = Path(__file__).parent / "schema.sql"


class _State:
    pool: Optional[asyncpg.Pool] = None
    error: Optional[str] = None


state = _State()


def _ssl_param(url: str) -> str | bool:
    """Decide whether to require SSL based on the connection string.

    Neon URIs include ``sslmode=require``. Local dev URIs that explicitly opt
    out get plain TCP. Anything else falls back to SSL on.
    """
    lowered = url.lower()
    if "sslmode=disable" in lowered:
        return False
    return "require"


async def connect() -> None:
    settings = get_settings()
    if not settings.has_database:
        state.error = "DATABASE_URL not set — running in mock-only mode."
        logger.warning(state.error)
        return
    try:
        pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=1,
            max_size=10,
            command_timeout=10,
            ssl=_ssl_param(settings.DATABASE_URL),
            init=_register_codecs,
        )
        # Probe with a trivial query so we fail fast on bad credentials.
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
    except Exception as exc:  # truly unreachable — degrade gracefully
        state.pool = None
        state.error = f"Postgres unreachable: {exc}"
        logger.warning(state.error)
        return

    state.pool = pool
    state.error = None
    logger.info("Connected to Postgres (Neon).")

    try:
        await _ensure_schema()
        await _seed_initial_data()
    except Exception as exc:
        logger.warning("Schema/seed step failed (DB stays available): %s", exc)


async def disconnect() -> None:
    if state.pool is not None:
        await state.pool.close()
    state.pool = None


def get_pool() -> Optional[asyncpg.Pool]:
    return state.pool


def is_connected() -> bool:
    return state.pool is not None


async def _register_codecs(conn: asyncpg.Connection) -> None:
    """Tell asyncpg to (de)serialise JSONB through Python's stdlib ``json``.

    Without this, JSONB columns come back as plain strings and writes fail
    with "expected str, got dict".
    """
    await conn.set_type_codec(
        "jsonb",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
        format="text",
    )
    await conn.set_type_codec(
        "json",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
        format="text",
    )


async def _ensure_schema() -> None:
    pool = state.pool
    if pool is None:
        return
    sql = SCHEMA_FILE.read_text(encoding="utf-8")
    async with pool.acquire() as conn:
        await conn.execute(sql)


async def _seed_initial_data() -> None:
    """Populate empty tables with the bundled demo dataset.

    Only inserts when the relevant table is empty, so a real database with
    user-created content is never overwritten.
    """
    pool = state.pool
    if pool is None:
        return
    from app.services import mock_data

    async with pool.acquire() as conn:
        async with conn.transaction():
            cafes_count = await conn.fetchval("SELECT count(*) FROM cafes")
            if cafes_count == 0:
                for cafe in mock_data.MOCK_CAFES:
                    await _insert_cafe(conn, cafe)
                logger.info("Seeded %d cafés.", len(mock_data.MOCK_CAFES))

            users_count = await conn.fetchval("SELECT count(*) FROM users")
            if users_count == 0:
                for user in mock_data.MOCK_USERS:
                    await _insert_user(conn, user)
                logger.info("Seeded %d demo users.", len(mock_data.MOCK_USERS))

            av_count = await conn.fetchval("SELECT count(*) FROM availabilities")
            if av_count == 0:
                for av in mock_data.MOCK_AVAILABILITIES:
                    await _insert_availability(conn, av)
                logger.info("Seeded %d availabilities.", len(mock_data.MOCK_AVAILABILITIES))


async def _insert_cafe(conn: asyncpg.Connection, c) -> None:
    await conn.execute(
        """
        INSERT INTO cafes
            (id, place_id, name, address, area, opening_hours, rating,
             atmosphere, distance_mock, emoji, lat, lng, source)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        """,
        c.id, c.place_id, c.name, c.address, c.area, c.opening_hours,
        c.rating, list(c.atmosphere), c.distance_mock, c.emoji,
        c.location.lat if c.location else None,
        c.location.lng if c.location else None,
        c.source,
    )


async def _insert_user(conn: asyncpg.Connection, u) -> None:
    await conn.execute(
        """
        INSERT INTO users
            (id, pseudonym, email, age_range, bio, interests,
             meeting_preference, privacy_settings, no_show_count,
             trust_status, initials, accent_color)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12)
        """,
        u.id, u.pseudonym, u.email, u.age_range, u.bio or "", list(u.interests),
        u.meeting_preference, json.dumps(u.privacy_settings.model_dump()),
        u.no_show_count, u.trust_status, u.initials, u.accent_color,
    )


async def _insert_availability(conn: asyncpg.Connection, a) -> None:
    from app.services.repo import to_date, to_time

    await conn.execute(
        """
        INSERT INTO availabilities
            (id, user_id, date, start_time, end_time, area, lat, lng)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        """,
        a.id, a.user_id, to_date(a.date), to_time(a.start_time), to_time(a.end_time),
        a.area, a.lat, a.lng,
    )


def chunked(items: Iterable, size: int = 100):
    """Yield successive chunks for batch inserts (not used heavily; kept handy)."""
    buf = []
    for item in items:
        buf.append(item)
        if len(buf) >= size:
            yield buf
            buf = []
    if buf:
        yield buf
