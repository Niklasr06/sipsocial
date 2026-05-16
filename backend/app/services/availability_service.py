from __future__ import annotations

from datetime import date as _date
from typing import List

from app.db.postgres import get_pool
from app.schemas.availability import Availability, AvailabilityCreate
from app.services import mock_data
from app.services.repo import new_id, to_date, to_time


def _row_to_availability(row) -> Availability:
    return Availability(
        id=row["id"],
        user_id=row["user_id"],
        date=row["date"].isoformat() if isinstance(row["date"], _date) else str(row["date"]),
        start_time=row["start_time"].strftime("%H:%M"),
        end_time=row["end_time"].strftime("%H:%M"),
        area=row["area"],
        lat=row["lat"],
        lng=row["lng"],
    )


async def add_availability(payload: AvailabilityCreate) -> Availability:
    pool = get_pool()
    item = Availability(id=new_id("av"), **payload.model_dump())
    if pool is None:
        return item

    async with pool.acquire() as conn:
        async with conn.transaction():
            # Replace the user's existing availability (single-slot model).
            await conn.execute("DELETE FROM availabilities WHERE user_id = $1", payload.user_id)
            row = await conn.fetchrow(
                """
                INSERT INTO availabilities
                    (id, user_id, date, start_time, end_time, area, lat, lng)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
                """,
                item.id,
                payload.user_id,
                to_date(payload.date),
                to_time(payload.start_time),
                to_time(payload.end_time),
                payload.area,
                payload.lat,
                payload.lng,
            )
    return _row_to_availability(row)


async def get_for_user(user_id: str) -> List[Availability]:
    pool = get_pool()
    if pool is None:
        return [a for a in mock_data.MOCK_AVAILABILITIES if a.user_id == user_id]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM availabilities WHERE user_id = $1 ORDER BY date",
            user_id,
        )
    return [_row_to_availability(r) for r in rows]


async def list_all() -> List[Availability]:
    pool = get_pool()
    if pool is None:
        return mock_data.MOCK_AVAILABILITIES
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM availabilities ORDER BY date")
    return [_row_to_availability(r) for r in rows]
