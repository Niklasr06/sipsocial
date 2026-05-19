"""Server-side matching logic — mirrors the frontend algorithm.

Weights match the product spec:
- Zeitüberschneidung: 40 %
- Standort / Bereich: 30 %
- Gemeinsame Interessen: 20 %
- Treffenstyp: 10 %

Only matches >= ``MIN_SCORE`` are surfaced.
"""

from __future__ import annotations

import json
from typing import List, Optional

from app.db.postgres import get_pool
from app.schemas.availability import Availability
from app.schemas.match import Match, MatchReason
from app.schemas.user import User
from app.services import availability_service, block_service, cafe_service, user_service
from app.services.repo import new_id, parse_jsonb, to_date, to_time

WEIGHT_TIME = 40
WEIGHT_AREA = 30
WEIGHT_INTERESTS = 20
WEIGHT_PREFERENCE = 10
MIN_SCORE = 60
# Wer abgelehnt wurde (egal von welcher Seite) fällt für diese Anzahl Tage
# aus den Match-Vorschlägen. Verhindert „Stalking via Refresh".
DECLINE_COOLDOWN_DAYS = 7


def _to_minutes(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m or 0)


def _overlap(a: Availability, b: Availability) -> int:
    if a.date != b.date:
        return 0
    start = max(_to_minutes(a.start_time), _to_minutes(b.start_time))
    end = min(_to_minutes(a.end_time), _to_minutes(b.end_time))
    return max(0, end - start)


def _max_time(a: str, b: str) -> str:
    return a if a > b else b


def _min_time(a: str, b: str) -> str:
    return a if a < b else b


def _shared_interests(a: User, b: User) -> List[str]:
    bs = set(b.interests)
    return [i for i in a.interests if i in bs]


def _compatible_pref(a: str, b: str) -> bool:
    if a == "both" or b == "both":
        return True
    return a == b


def _derive_pref(a: str, b: str) -> str:
    if a == b:
        return a
    if a == "both":
        return b
    if b == "both":
        return a
    return "one_on_one"


def _row_to_match(row) -> Match:
    return Match(
        id=row["id"],
        user_a_id=row["user_a_id"],
        user_b_id=row["user_b_id"],
        score=row["score"],
        shared_interests=list(row["shared_interests"] or []),
        suggested_cafe_id=row["suggested_cafe_id"],
        suggested_date=row["suggested_date"].isoformat()
        if hasattr(row["suggested_date"], "isoformat") else str(row["suggested_date"]),
        suggested_start_time=row["suggested_start_time"].strftime("%H:%M"),
        suggested_end_time=row["suggested_end_time"].strftime("%H:%M"),
        meeting_preference=row["meeting_preference"],
        status=row["status"],
        reasons=[MatchReason(**r) for r in parse_jsonb(row["reasons"]) or []],
    )


async def find_matches_for_user(user_id: str) -> List[Match]:
    me = await user_service.get_user(user_id)
    if not me:
        return []
    my_avails = await availability_service.get_for_user(user_id)
    if not my_avails:
        return []

    all_users = await user_service.list_users()
    all_avails = await availability_service.list_all()
    avails_by_user: dict[str, list[Availability]] = {}
    for a in all_avails:
        avails_by_user.setdefault(a.user_id, []).append(a)

    blocked_ids = await block_service.blocked_pair_ids(user_id)
    cooldown_ids = await _recently_declined_partner_ids(user_id)

    results: list[Match] = []
    for other in all_users:
        if other.id == user_id:
            continue
        if other.trust_status == "suspended":
            continue
        if other.id and other.id in blocked_ids:
            continue
        if other.id and other.id in cooldown_ids:
            continue
        for av_other in avails_by_user.get(other.id or "", []):
            best_score = -1
            best_reasons: list[MatchReason] = []
            best_shared: list[str] = []
            best_window = (av_other.start_time, av_other.end_time)
            best_date = av_other.date
            best_area = av_other.area
            for av_me in my_avails:
                overlap = _overlap(av_me, av_other)
                time_score = round(min(1.0, overlap / 90) * WEIGHT_TIME) if overlap else 0
                area_score = WEIGHT_AREA if av_me.area == av_other.area else 0
                shared = _shared_interests(me, other)
                interest_score = round(min(1.0, len(shared) / 5) * WEIGHT_INTERESTS)
                pref_score = WEIGHT_PREFERENCE if _compatible_pref(me.meeting_preference, other.meeting_preference) else 0
                total = time_score + area_score + interest_score + pref_score
                if total <= best_score:
                    continue
                reasons: list[MatchReason] = []
                if overlap:
                    reasons.append(MatchReason(label="Zeitfenster", detail=f"Euer Zeitfenster überschneidet sich um {overlap} Minuten."))
                if area_score:
                    reasons.append(MatchReason(label="Bereich", detail=f"Ihr seid beide in {av_me.area} verfügbar."))
                if shared:
                    detail = (
                        f"Ihr habt {len(shared)} gemeinsame Interessen: "
                        + ", ".join(shared[:3])
                        + ("…" if len(shared) > 3 else ".")
                    )
                    reasons.append(MatchReason(label="Interessen", detail=detail))
                if pref_score:
                    reasons.append(MatchReason(label="Treffenstyp", detail="Euer bevorzugter Treffenstyp passt zusammen."))
                best_score = total
                best_reasons = reasons
                best_shared = shared
                if overlap:
                    best_window = (
                        _max_time(av_me.start_time, av_other.start_time),
                        _min_time(av_me.end_time, av_other.end_time),
                    )
                best_date = av_other.date
                best_area = av_other.area

            if best_score < MIN_SCORE:
                continue

            cafe = await cafe_service.choose_best_cafe_for_match(best_area)
            if cafe:
                best_reasons.append(
                    MatchReason(
                        label="Café",
                        detail=f"Vorgeschlagenes Café in der Nähe: {cafe.name}.",
                    )
                )
            match = Match(
                id=new_id("match"),
                user_a_id=user_id,
                user_b_id=other.id or "",
                score=best_score,
                shared_interests=best_shared,
                suggested_cafe_id=cafe.id if cafe else None,
                suggested_date=best_date,
                suggested_start_time=best_window[0],
                suggested_end_time=best_window[1],
                meeting_preference=_derive_pref(me.meeting_preference, other.meeting_preference),
                status="suggested",
                reasons=best_reasons,
            )
            results.append(match)

    results.sort(key=lambda m: m.score, reverse=True)
    # Dedup gegen bereits existierende Pair-Matches (siehe _persist_matches),
    # damit beide User auf die gleiche match_id zeigen — sonst hat jede Seite
    # ihre eigene Match-Row und Chat-Messages liegen auf verschiedenen IDs.
    final = await _persist_matches(user_id, results)
    return final


async def _recently_declined_partner_ids(user_id: str) -> set[str]:
    """User-IDs, mit denen es in den letzten ``DECLINE_COOLDOWN_DAYS`` Tagen
    einen abgelehnten Match-Vorschlag gab — egal in welche Richtung. Wird
    aus den Vorschlägen ausgeschlossen, damit niemand per Refresh ein
    bereits abgelehntes Gegenüber erneut präsentiert bekommt.
    """
    pool = get_pool()
    if pool is None:
        return set()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT user_a_id, user_b_id
            FROM matches
            WHERE status = 'declined'
              AND (user_a_id = $1 OR user_b_id = $1)
              AND updated_at > now() - ($2::int * INTERVAL '1 day')
            """,
            user_id, DECLINE_COOLDOWN_DAYS,
        )
    ids: set[str] = set()
    for r in rows:
        other = r["user_b_id"] if r["user_a_id"] == user_id else r["user_a_id"]
        ids.add(other)
    return ids


async def _existing_pair_matches(conn, user_id: str) -> dict[str, dict]:
    """Map other-user-id → existing match row for any match involving user_id.

    Used by ``_persist_matches`` to reuse an existing pair-match-row instead
    of inserting a duplicate when the other user already had us as user_b.
    """
    rows = await conn.fetch(
        """
        SELECT * FROM matches
        WHERE (user_a_id = $1 OR user_b_id = $1)
          AND status NOT IN ('declined')
        """,
        user_id,
    )
    out: dict[str, dict] = {}
    for r in rows:
        other = r["user_b_id"] if r["user_a_id"] == user_id else r["user_a_id"]
        out[other] = dict(r)
    return out


async def _persist_matches(user_id: str, matches: List[Match]) -> List[Match]:
    """Insert new matches, but reuse any existing pair-match. Returns the
    canonical list (existing rows take precedence over freshly computed
    candidates so chat-messages stay on a stable match-id)."""
    pool = get_pool()
    if pool is None or not matches:
        return matches

    final: list[Match] = []
    async with pool.acquire() as conn:
        async with conn.transaction():
            existing = await _existing_pair_matches(conn, user_id)
            # Welche Other-IDs sind in der neuen Vorschlagsliste?
            candidate_others = {m.user_b_id for m in matches}
            # Stale-cleanup: gelöschte/verschollene Vorschläge wo ich user_a war.
            await conn.execute(
                """
                DELETE FROM matches
                WHERE user_a_id = $1
                  AND status = 'suggested'
                  AND user_b_id <> ALL($2::text[])
                """,
                user_id, list(candidate_others),
            )

            for m in matches:
                ex = existing.get(m.user_b_id)
                if ex:
                    # Existierende Pair-Row beibehalten — Status, IDs, etc.
                    final.append(
                        Match(
                            id=ex["id"],
                            user_a_id=ex["user_a_id"],
                            user_b_id=ex["user_b_id"],
                            score=m.score,  # refreshed score
                            shared_interests=m.shared_interests,
                            suggested_cafe_id=ex["suggested_cafe_id"] or m.suggested_cafe_id,
                            suggested_date=ex["suggested_date"].isoformat()
                                if hasattr(ex["suggested_date"], "isoformat")
                                else str(ex["suggested_date"]),
                            suggested_start_time=ex["suggested_start_time"].strftime("%H:%M")
                                if hasattr(ex["suggested_start_time"], "strftime")
                                else str(ex["suggested_start_time"]),
                            suggested_end_time=ex["suggested_end_time"].strftime("%H:%M")
                                if hasattr(ex["suggested_end_time"], "strftime")
                                else str(ex["suggested_end_time"]),
                            meeting_preference=ex["meeting_preference"],
                            status=ex["status"],
                            reasons=m.reasons,
                        )
                    )
                    continue
                # Truly new: insert
                await conn.execute(
                    """
                    INSERT INTO matches
                        (id, user_a_id, user_b_id, score, shared_interests,
                         suggested_cafe_id, suggested_date, suggested_start_time,
                         suggested_end_time, meeting_preference, status, reasons)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
                    """,
                    m.id, m.user_a_id, m.user_b_id, m.score,
                    list(m.shared_interests), m.suggested_cafe_id,
                    to_date(m.suggested_date),
                    to_time(m.suggested_start_time),
                    to_time(m.suggested_end_time),
                    m.meeting_preference, m.status,
                    json.dumps([r.model_dump() for r in m.reasons]),
                )
                final.append(m)
    return final


async def list_for_user(user_id: str) -> List[Match]:
    pool = get_pool()
    if pool is None:
        return await find_matches_for_user(user_id)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT * FROM matches
            WHERE user_a_id = $1 OR user_b_id = $1
            ORDER BY score DESC
            """,
            user_id,
        )
    if not rows:
        return await find_matches_for_user(user_id)
    return [_row_to_match(r) for r in rows]


async def get_match(match_id: str) -> Optional[Match]:
    pool = get_pool()
    if pool is None:
        return None
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM matches WHERE id = $1", match_id)
    return _row_to_match(row) if row else None


async def update_status(match_id: str, status: str) -> Optional[Match]:
    pool = get_pool()
    if pool is None:
        return None
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE matches SET status = $2, updated_at = now() WHERE id = $1 RETURNING *",
            match_id, status,
        )
    return _row_to_match(row) if row else None
