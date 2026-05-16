"""Chat service with at-rest encryption and privacy filter."""

from __future__ import annotations

from datetime import datetime
from typing import List

from app.db.postgres import get_pool
from app.schemas.chat import ChatMessageCreate, ChatMessageDecrypted, ChatSendResponse
from app.services.privacy_filter import USER_FACING_HINT, evaluate
from app.services.repo import new_id
from app.utils.crypto import decrypt_message, encrypt_message

MAX_MESSAGES_PER_USER = 3


async def count_messages_by_user(match_id: str, sender_id: str) -> int:
    pool = get_pool()
    if pool is None:
        return 0
    async with pool.acquire() as conn:
        return await conn.fetchval(
            "SELECT count(*) FROM chat_messages WHERE match_id = $1 AND sender_id = $2",
            match_id, sender_id,
        )


async def check_message_limit(match_id: str, sender_id: str) -> tuple[int, bool]:
    used = await count_messages_by_user(match_id, sender_id)
    remaining = max(0, MAX_MESSAGES_PER_USER - used)
    return remaining, remaining == 0


async def send_message(match_id: str, payload: ChatMessageCreate) -> ChatSendResponse:
    pool = get_pool()
    text = payload.text.strip()
    if not text:
        return ChatSendResponse(ok=False, reason="Bitte gib eine Nachricht ein.", remaining=0)

    remaining, reached = await check_message_limit(match_id, payload.sender_id)
    if reached:
        return ChatSendResponse(
            ok=False,
            reason="Du hast dein Nachrichten-Limit für diesen Match erreicht.",
            remaining=0,
        )

    verdict = evaluate(text)
    if verdict.blocked:
        return ChatSendResponse(
            ok=False,
            reason=USER_FACING_HINT,
            remaining=remaining,
            message=None,
        )

    used = MAX_MESSAGES_PER_USER - remaining
    message_id = new_id("msg")
    encrypted = encrypt_message(text)
    created_at = datetime.utcnow()

    if pool is not None:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO chat_messages
                    (id, match_id, sender_id, encrypted_text, message_number,
                     blocked, privacy_warnings, created_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                """,
                message_id, match_id, payload.sender_id, encrypted,
                used + 1, False, list(verdict.warnings), created_at,
            )

    return ChatSendResponse(
        ok=True,
        reason="",
        remaining=remaining - 1,
        message=ChatMessageDecrypted(
            id=message_id,
            match_id=match_id,
            sender_id=payload.sender_id,
            text=text,
            message_number=used + 1,
            blocked=False,
            privacy_warnings=verdict.warnings,
            created_at=created_at.isoformat(),
        ),
    )


async def get_messages(match_id: str) -> List[ChatMessageDecrypted]:
    pool = get_pool()
    if pool is None:
        return []
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT * FROM chat_messages
            WHERE match_id = $1
            ORDER BY message_number ASC
            """,
            match_id,
        )
    out: list[ChatMessageDecrypted] = []
    for r in rows:
        out.append(
            ChatMessageDecrypted(
                id=r["id"],
                match_id=r["match_id"],
                sender_id=r["sender_id"],
                text=decrypt_message(r["encrypted_text"]),
                message_number=r["message_number"],
                blocked=r["blocked"],
                privacy_warnings=list(r["privacy_warnings"] or []),
                created_at=r["created_at"].isoformat() if r["created_at"] else "",
            )
        )
    return out
