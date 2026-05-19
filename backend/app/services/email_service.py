"""Transactional email via Postmark.

Wir nutzen Postmark statt SES/Mailgun, weil:
- HTTP-API (kein SMTP), drei Felder, fertig
- Sender-Signature reicht (kein Domain-Verification-Stress für MVP)
- 100 Mails/Monat Free Tier deckt das Testing locker ab

Ohne ``POSTMARK_SERVER_TOKEN`` ist die Funktion ein No-Op und der Caller
fällt aufs Backend-Log zurück — damit bleibt lokales Dev funktionsfähig.
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger("sipsocial.email")

POSTMARK_URL = "https://api.postmarkapp.com/email"


async def _send_via_postmark(
    *,
    to: str,
    subject: str,
    text_body: str,
    html_body: str,
) -> bool:
    settings = get_settings()
    if not settings.has_email:
        return False
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": settings.POSTMARK_SERVER_TOKEN,
    }
    body = {
        "From": settings.POSTMARK_FROM_EMAIL,
        "To": to,
        "Subject": subject,
        "TextBody": text_body,
        "HtmlBody": html_body,
        "MessageStream": "outbound",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(POSTMARK_URL, headers=headers, json=body)
        if resp.status_code >= 400:
            # Postmark gibt strukturierte Fehler (ErrorCode + Message) zurück.
            # Nicht raisen — Caller darf den Failure schlucken, der User
            # bekommt sonst Wege über die UI angezeigt ("Mail kommt gleich").
            logger.error("[postmark] send to %s failed: %s %s", to, resp.status_code, resp.text)
            return False
        return True
    except httpx.HTTPError as exc:
        logger.error("[postmark] HTTP error sending to %s: %s", to, exc)
        return False


async def send_password_reset_email(*, to: str, token: str, expires_iso: str) -> bool:
    """Schickt eine Password-Reset-Mail. Gibt True zurück, wenn Postmark
    den Auftrag angenommen hat; False bei Fehler oder fehlender Konfig.

    Wir versenden den Token im Klartext — er ist nur 15 Minuten gültig
    und in der DB als SHA-256-Hash gespeichert. Selbst ein abgefangener
    Token verfällt automatisch.
    """
    settings = get_settings()
    frontend_url = settings.FRONTEND_URL.strip()
    cta_block_text = (
        f"\n\nApp öffnen: {frontend_url}\nReset-Code: {token}\n"
        if frontend_url
        else f"\n\nReset-Code: {token}\n"
    )
    cta_block_html = (
        f'<p><a href="{frontend_url}" '
        f'style="background:#7A4E2D;color:#fff;padding:12px 20px;'
        f'border-radius:8px;text-decoration:none;display:inline-block;">'
        f'App öffnen</a></p>'
        f'<p style="margin-top:24px;font-family:Menlo,monospace;font-size:18px;">'
        f'<strong>Code:</strong> {token}</p>'
        if frontend_url
        else f'<p style="margin-top:24px;font-family:Menlo,monospace;font-size:18px;">'
             f'<strong>Code:</strong> {token}</p>'
    )

    text_body = (
        "Hallo,\n\n"
        "du hast ein neues Passwort für SipSocial angefordert. "
        f"Verwende den folgenden Code, gültig bis {expires_iso}:"
        f"{cta_block_text}\n"
        "Wenn du die Anfrage nicht selbst gestellt hast, ignoriere diese Mail — "
        "dein Passwort bleibt unverändert.\n\n"
        "— SipSocial"
    )
    html_body = (
        f'<div style="font-family:Inter,sans-serif;color:#2F241D;line-height:1.5;">'
        f'<h1 style="font-family:Georgia,serif;color:#7A4E2D;">Neues Passwort?</h1>'
        f'<p>Du hast für deinen SipSocial-Account ein neues Passwort angefordert.</p>'
        f'<p>Gültig bis <strong>{expires_iso}</strong>.</p>'
        f'{cta_block_html}'
        f'<p style="margin-top:32px;color:#7A6D63;font-size:13px;">'
        f'War das nicht du? Ignoriere diese Mail — dein Passwort bleibt unverändert.'
        f'</p>'
        f'</div>'
    )
    return await _send_via_postmark(
        to=to,
        subject="Dein SipSocial-Reset-Code",
        text_body=text_body,
        html_body=html_body,
    )


# ``Optional`` import currently unused, kept for future ergonomic helpers
# such as ``send_welcome_email``. Removing later is trivial; keeping
# imports tight now avoids churn when those land.
_ = Optional
