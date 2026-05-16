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
from app.services import availability_service, cafe_service, user_service
from app.services.repo import new_id, parse_jsonb, to_date, to_time

WEIGHT_TIME = 40
WEIGHT_AREA = 30
WEIGHT_INTERESTS = 20
WEIGHT_PREFERENCE = 10
MIN_SCORE = 60


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

    results: list[Match] = []
    for other in all_users:
        if other.id == user_id:
            continue
        if other.trust_status == "suspended":
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
    await _persist_matches(user_id, results)
    return results


async def _persist_matches(user_id: str, matches: List[Match]) -> None:
    pool = get_pool()
    if pool is None or not matches:
        return
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "DELETE FROM matches WHERE user_a_id = $1 AND status = 'suggested'",
                user_id,
            )
            for m in matches:
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
