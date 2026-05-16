"""Expo Push Notifications client.

Posts to ``https://exp.host/--/api/v2/push/send`` — Expo's public push
gateway. No API key needed; Expo authenticates by the token recipient.
Failures are logged but never raised: a push that doesn't deliver should
not break the parent request (sending a match, posting a chat message).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Iterable, Optional

import httpx

from app.services import user_service

logger = logging.getLogger("sipsocial.push")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _is_valid_expo_token(token: Optional[str]) -> bool:
    """Expo tokens look like ``ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]``.

    We accept the legacy ``ExpoPushToken[...]`` variant too. Anything else
    is ignored — it's almost always a stale web-debug placeholder.
    """
    if not token:
        return False
    return token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")


async def _send_messages(messages: list[dict]) -> None:
    if not messages:
        return
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                EXPO_PUSH_URL,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
                json=messages,
            )
        if resp.status_code >= 400:
            logger.warning(
                "Expo push HTTP %s: %s", resp.status_code, resp.text[:300],
            )
            return
        data = resp.json()
        # Expo returns one ticket per message; log the failures so we notice
        # invalid/unregistered tokens during dev.
        for msg, ticket in zip(messages, data.get("data") or []):
            if ticket.get("status") == "error":
                logger.warning(
                    "Expo push ticket error for %s: %s",
                    msg.get("to"), ticket.get("message"),
                )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Expo push failed: %s", exc)


async def notify_user(
    user_id: str,
    *,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> None:
    """Send a single push to a user (no-op if they have no valid token)."""
    token = await user_service.get_push_token(user_id)
    if not _is_valid_expo_token(token):
        return
    await _send_messages(
        [{
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
        }]
    )


async def notify_users(
    user_ids: Iterable[str],
    *,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> None:
    """Fan-out to several users — fetches tokens concurrently."""
    ids = list(user_ids)
    tokens = await asyncio.gather(*(user_service.get_push_token(uid) for uid in ids))
    messages = [
        {
            "to": tok,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
        }
        for tok in tokens
        if _is_valid_expo_token(tok)
    ]
    await _send_messages(messages)
