"""Regex-based privacy filter for chat messages.

The goal is to gently nudge users away from sharing personal contact data
*before* the meeting happens. False positives are acceptable — we err on the
side of friendly warnings rather than silent permissiveness.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

# Order matters here only for readability; all patterns are tested independently.
PATTERNS: list[tuple[str, str, re.Pattern[str]]] = [
    (
        "phone",
        "Telefonnummer",
        re.compile(r"(?<!\d)(\+?\d[\d\s/().-]{7,}\d)(?!\d)"),
    ),
    (
        "email",
        "E-Mail-Adresse",
        re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    ),
    (
        "url",
        "Link",
        re.compile(r"\b(?:https?://|www\.)[^\s]+", re.IGNORECASE),
    ),
    (
        "social",
        "Social-Media-Hinweis",
        re.compile(
            r"\b(insta(gram)?|snap(chat)?|tiktok|telegram|signal|fb|facebook|discord)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "whatsapp",
        "WhatsApp-Hinweis",
        re.compile(r"\b(whats[\s-]?app|wa)\b", re.IGNORECASE),
    ),
    (
        "handle",
        "Social-Media Handle",
        re.compile(r"(?<![A-Za-z0-9_])@[A-Za-z0-9_.]{3,}"),
    ),
    (
        "address",
        "Wohnadresse",
        re.compile(
            r"\b[A-ZÄÖÜ][a-zäöüß]+(?:[- ][A-ZÄÖÜ][a-zäöüß]+)*\s?(?:str(?:aße|\.)|weg|allee|platz|gasse)\s*\d+",
        ),
    ),
    (
        "directions",
        "Aufforderung zu externer Plattform",
        re.compile(
            r"\b(schreib|adde|add|schick|füg)\b.{0,30}\b("
            r"whatsapp|wa|insta|instagram|snap|tiktok|nummer|handy|telegram|signal"
            r")\b",
            re.IGNORECASE,
        ),
    ),
]


@dataclass
class FilterResult:
    blocked: bool
    warnings: List[str]
    sanitized: str  # what gets stored after redaction if blocked


REDACT_TEMPLATE = "[entfernt: {}]"

HARD_BLOCK_KINDS = {"phone", "email", "url", "whatsapp", "address", "directions", "handle"}


def evaluate(text: str) -> FilterResult:
    """Inspect a chat message for personal-data leaks.

    A message is **blocked** when it contains any hard-block kind (e.g. phone,
    email, link, address, social-platform handover request). Soft mentions
    (e.g. someone says ``"meine Insta-Story neulich"``) only generate a
    warning without blocking the send.
    """
    warnings: list[str] = []
    sanitized = text
    blocked = False

    for kind, label, pattern in PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        warnings.append(label)
        if kind in HARD_BLOCK_KINDS:
            blocked = True
            sanitized = pattern.sub(REDACT_TEMPLATE.format(label), sanitized)

    # Dedupe while preserving order
    seen = set()
    deduped = []
    for w in warnings:
        if w not in seen:
            seen.add(w)
            deduped.append(w)

    return FilterResult(blocked=blocked, warnings=deduped, sanitized=sanitized)


USER_FACING_HINT = (
    "Zum Schutz deiner Privatsphäre solltest du persönliche Kontaktdaten "
    "erst nach dem Treffen teilen."
)
