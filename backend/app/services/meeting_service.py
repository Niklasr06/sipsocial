from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from app.db.postgres import get_pool
from app.schemas.match import Match
from app.schemas.meeting import CheckIn, Meeting, MeetingCreate, MeetingUpdate
from app.services import auth_service
from app.services.repo import new_id, parse_jsonb, to_date, to_time


def _row_to_meeting(row) -> Meeting:
    check_ins_data = parse_jsonb(row["check_ins"]) or []
    return Meeting(
        id=row["id"],
        match_id=row["match_id"],
        cafe_id=row["cafe_id"],
        date=row["date"].isoformat() if hasattr(row["date"], "isoformat") else str(row["date"]),
        start_time=row["start_time"].strftime("%H:%M"),
        end_time=row["end_time"].strftime("%H:%M"),
        status=row["status"],
        qr_code=row["qr_code"],
        check_ins=[CheckIn(**ci) for ci in check_ins_data],
    )


async def create_meeting(match: Match, payload: MeetingCreate) -> Meeting:
    pool = get_pool()
    meeting_id = new_id("meet")
    qr_code = auth_service.create_qr_token(meeting_id)
    check_ins = [
        CheckIn(user_id=match.user_a_id),
        CheckIn(user_id=match.user_b_id),
    ]
    meeting = Meeting(
        id=meeting_id,
        match_id=payload.match_id,
        cafe_id=payload.cafe_id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        status="confirmed",
        qr_code=qr_code,
        check_ins=check_ins,
    )
    if pool is None:
        return meeting

    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO meetings
                (id, match_id, cafe_id, date, start_time, end_time,
                 status, qr_code, check_ins)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
            """,
            meeting.id,
            meeting.match_id,
            meeting.cafe_id,
            to_date(meeting.date),
            to_time(meeting.start_time),
            to_time(meeting.end_time),
            meeting.status,
            meeting.qr_code,
            json.dumps([ci.model_dump(mode="json") for ci in check_ins]),
        )
    return meeting


async def list_for_user(user_id: str) -> List[Meeting]:
    pool = get_pool()
    if pool is None:
        return []
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT meetings.*
            FROM meetings
            JOIN matches ON matches.id = meetings.match_id
            WHERE matches.user_a_id = $1 OR matches.user_b_id = $1
            ORDER BY meetings.date, meetings.start_time
            """,
            user_id,
        )
    return [_row_to_meeting(r) for r in rows]


async def get(meeting_id: str) -> Optional[Meeting]:
    pool = get_pool()
    if pool is None:
        return None
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM meetings WHERE id = $1", meeting_id)
    return _row_to_meeting(row) if row else None


async def update(meeting_id: str, patch: MeetingUpdate) -> Optional[Meeting]:
    pool = get_pool()
    if pool is None:
        return None

    async with pool.acquire() as conn:
        async with conn.transaction():
            updates: list[str] = []
            args: list = []
            idx = 1
            if patch.status:
                updates.append(f"status = ${idx}")
                args.append(patch.status)
                idx += 1
            if patch.cafe_id:
                updates.append(f"cafe_id = ${idx}")
                args.append(patch.cafe_id)
                idx += 1
            if updates:
                args.append(meeting_id)
                await conn.execute(
                    f"UPDATE meetings SET {', '.join(updates)}, updated_at = now() WHERE id = ${idx}",
                    *args,
                )

            if patch.check_in_user_id:
                row = await conn.fetchrow(
                    "SELECT check_ins, status FROM meetings WHERE id = $1",
                    meeting_id,
                )
                if row:
                    check_ins = parse_jsonb(row["check_ins"]) or []
                    now = datetime.utcnow().isoformat()
                    for ci in check_ins:
                        if ci.get("user_id") == patch.check_in_user_id and ci.get("status") != "checked_in":
                            ci["status"] = "checked_in"
                            ci["checked_in_at"] = now
                            break
                    new_status = row["status"]
                    if new_status not in {"cancelled", "no_show", "completed"}:
                        checked = sum(1 for ci in check_ins if ci.get("status") == "checked_in")
                        new_status = "both_checked_in" if checked >= 2 else "one_checked_in" if checked == 1 else "confirmed"
                    await conn.execute(
                        """
                        UPDATE meetings
                        SET check_ins = $2::jsonb, status = $3, updated_at = now()
                        WHERE id = $1
                        """,
                        meeting_id, json.dumps(check_ins), new_status,
                    )

    return await get(meeting_id)
