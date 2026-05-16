"""Background job that pushes a check-in reminder ~1h before each meeting.

How it works:

1. Every ``CHECK_INTERVAL_SECONDS`` (5 min) we look for non-cancelled
   meetings whose start is in [55, 75) minutes from now and whose
   ``reminder_sent_at`` is still NULL.
2. For each match, push to both participants.
3. Stamp ``reminder_sent_at`` so the next tick doesn't double-fire.

The job is started on FastAPI's lifespan startup and cancelled on
shutdown. If the DB is offline we no-op; the next tick retries.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.db.postgres import get_pool
from app.services import cafe_service, notification_service, user_service

logger = logging.getLogger("sipsocial.reminder")

CHECK_INTERVAL_SECONDS = 5 * 60  # 5 min — small enough to not lag too far
REMINDER_WINDOW_MIN = 55
REMINDER_WINDOW_MAX = 75


_task: Optional[asyncio.Task] = None


async def _send_pending_reminders() -> None:
    pool = get_pool()
    if pool is None:
        return

    now = datetime.now(tz=timezone.utc)
    # Window: meetings starting in [55, 75) minutes from now.
    win_start = now + timedelta(minutes=REMINDER_WINDOW_MIN)
    win_end = now + timedelta(minutes=REMINDER_WINDOW_MAX)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT m.id, m.match_id, m.cafe_id, m.date, m.start_time,
                   ma.user_a_id, ma.user_b_id
            FROM meetings m
            JOIN matches ma ON ma.id = m.match_id
            WHERE m.reminder_sent_at IS NULL
              AND m.status NOT IN ('cancelled', 'no_show', 'completed')
              AND (m.date + m.start_time) AT TIME ZONE 'UTC'
                  BETWEEN $1 AND $2
            """,
            win_start,
            win_end,
        )

    if not rows:
        return

    for row in rows:
        meeting_id = row["id"]
        try:
            cafe = await cafe_service.get_cafe(row["cafe_id"])
            cafe_name = cafe.name if cafe else "eurem Café"
            start = row["start_time"].strftime("%H:%M") if hasattr(row["start_time"], "strftime") else str(row["start_time"])
            body = f"In ~1 Stunde bei {cafe_name} um {start}. Vergiss den QR-Check-in nicht."

            await notification_service.notify_users(
                [row["user_a_id"], row["user_b_id"]],
                title="Treffen steht bald an",
                body=body,
                data={"type": "meeting_reminder", "meeting_id": meeting_id},
            )

            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE meetings SET reminder_sent_at = now() WHERE id = $1",
                    meeting_id,
                )
            logger.info("Reminder gesendet für meeting %s", meeting_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Reminder für meeting %s fehlgeschlagen: %s", meeting_id, exc)


async def _reminder_loop() -> None:
    # Small initial delay so the lifespan startup finishes before the first tick.
    await asyncio.sleep(20)
    while True:
        try:
            await _send_pending_reminders()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Reminder-Loop: %s", exc)
        try:
            await asyncio.sleep(CHECK_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            return


def start() -> None:
    """Idempotent: starting twice has no effect."""
    global _task
    if _task and not _task.done():
        return
    _task = asyncio.create_task(_reminder_loop(), name="sipsocial-reminder")
    logger.info("Reminder-Loop gestartet (Intervall %ss)", CHECK_INTERVAL_SECONDS)


async def stop() -> None:
    global _task
    if not _task:
        return
    _task.cancel()
    try:
        await _task
    except asyncio.CancelledError:
        pass
    _task = None
