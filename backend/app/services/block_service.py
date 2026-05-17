"""Block + report storage. Match-time filtering plugs in via ``blocked_pair_ids``."""

from __future__ import annotations

from typing import List, Optional, Tuple

from app.db.postgres import get_pool
from app.services.repo import new_id


async def block_user(blocker_id: str, blocked_id: str, reason: Optional[str] = None) -> None:
    if blocker_id == blocked_id:
        # No-op: you can't block yourself. Silent so callers don't need a
        # special path.
        return
    pool = get_pool()
    if pool is None:
        return
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO blocks (blocker_id, blocked_id, reason)
            VALUES ($1, $2, $3)
            ON CONFLICT (blocker_id, blocked_id) DO UPDATE
              SET reason = EXCLUDED.reason
            """,
            blocker_id, blocked_id, reason,
        )


async def unblock_user(blocker_id: str, blocked_id: str) -> bool:
    pool = get_pool()
    if pool is None:
        return False
    async with pool.acquire() as conn:
        res = await conn.execute(
            "DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2",
            blocker_id, blocked_id,
        )
    # asyncpg returns "DELETE n" — anything not ending in " 0" removed something
    return not res.endswith(" 0")


async def list_blocked(blocker_id: str) -> List[str]:
    pool = get_pool()
    if pool is None:
        return []
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT blocked_id FROM blocks WHERE blocker_id = $1",
            blocker_id,
        )
    return [r["blocked_id"] for r in rows]


async def blocked_pair_ids(user_id: str) -> set[str]:
    """Return *every* user id that ``user_id`` should not be paired with —
    both their own blocks and blocks made against them. The match service
    treats this as a hard skip."""
    pool = get_pool()
    if pool is None:
        return set()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT blocked_id AS other FROM blocks WHERE blocker_id = $1
            UNION
            SELECT blocker_id AS other FROM blocks WHERE blocked_id = $1
            """,
            user_id,
        )
    return {r["other"] for r in rows}


async def is_blocked_between(user_a: str, user_b: str) -> bool:
    pool = get_pool()
    if pool is None:
        return False
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT 1 FROM blocks
            WHERE (blocker_id = $1 AND blocked_id = $2)
               OR (blocker_id = $2 AND blocked_id = $1)
            LIMIT 1
            """,
            user_a, user_b,
        )
    return row is not None


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

VALID_REASONS = {
    "harassment",
    "spam",
    "inappropriate",
    "no_show",
    "fake_profile",
    "other",
}


async def submit_report(
    reporter_id: str,
    reported_id: str,
    reason: str,
    *,
    details: str = "",
    match_id: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """Persist a report. Returns (ok, error). Caller-friendly: rejects
    self-reports + unknown reasons without raising."""
    if reporter_id == reported_id:
        return False, "Du kannst dich nicht selbst melden."
    if reason not in VALID_REASONS:
        return False, "Unbekannter Meldegrund."
    pool = get_pool()
    if pool is None:
        return False, "Backend ist nicht verbunden."
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO reports (id, reporter_id, reported_id, match_id, reason, details)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            new_id("report"), reporter_id, reported_id, match_id, reason, details[:1000],
        )
    return True, None
