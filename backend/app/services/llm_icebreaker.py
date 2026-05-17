"""LLM-backed icebreaker generation via Claude Haiku 4.5.

When ``ANTHROPIC_API_KEY`` is set we ask Claude for a few fresh, friendly
German icebreaker questions tied to the shared interests of two users.
The system prompt is stable so it can be cached (cache-write on the first
call, cache-read on every call after — about 90 % cheaper for the prefix).

Falls back to ``None`` on any of:

- API key missing
- API call raises (network, rate limit, invalid input)
- Response parsing fails

…so the caller can degrade to the template bank without a try/except.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import List, Optional

import anthropic

from app.core.config import get_settings

logger = logging.getLogger("sipsocial.icebreaker.llm")

# Claude Haiku 4.5 — fast + cheap. Plenty for short, friendly questions.
MODEL_ID = "claude-haiku-4-5"

# Stable across every call → perfect for prompt caching.
SYSTEM_PROMPT = """Du bist der Icebreaker-Assistent in SipSocial, einer App für anonyme Café-Begegnungen.
Zwei Menschen haben sich gematched und treffen sich bald auf einen Kaffee. Sie kennen sich nicht.

Deine Aufgabe: 3 bis 5 lockere, freundliche Eisbrecher-Fragen auf Deutsch, die zu den gemeinsamen Interessen passen.

Anforderungen:
- Du-Form, freundlich, kurz (eine Frage = ein Satz, max. ~120 Zeichen).
- Konkret und persönlich, keine generischen "Was machst du gern?"-Fragen.
- Mische Themen wenn mehrere Interessen geteilt sind.
- Keine Fragen zu Beziehungsstatus, Beruf-als-Status, Geld, Wohnort, Politik oder anderen sensiblen Themen.
- Keine Anredefloskeln ("Hey," "Hallo,"), nur die Frage selbst.
- Keine Nummerierung, keine Aufzählungspunkte.

Antworte ausschließlich als JSON-Objekt der Form:
{"questions": ["Frage 1?", "Frage 2?", "Frage 3?"]}

Keine Erklärungen, kein Markdown, nur JSON."""


def _is_enabled() -> bool:
    return bool(get_settings().ANTHROPIC_API_KEY.strip())


def _parse_questions(text: str) -> Optional[List[str]]:
    """Best-effort JSON extraction. Tolerates a stray fenced block."""
    # Strip optional ```json fences in case the model slips into markdown.
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```\s*$", "", text.strip(), flags=re.MULTILINE)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    qs = data.get("questions")
    if not isinstance(qs, list):
        return None
    out: list[str] = []
    for q in qs:
        if not isinstance(q, str):
            continue
        q = q.strip()
        if 4 <= len(q) <= 240:
            out.append(q)
    return out or None


def _build_user_message(interests: List[str]) -> str:
    if interests:
        joined = ", ".join(interests)
        return f"Gemeinsame Interessen: {joined}.\nErzeuge 3–5 Eisbrecher-Fragen."
    return "Keine konkreten gemeinsamen Interessen angegeben. Erzeuge 3–5 allgemeine, warme Eisbrecher-Fragen."


async def generate_questions(interests: List[str]) -> Optional[List[str]]:
    """Return 3–5 German icebreaker questions, or ``None`` to signal fallback.

    Async so callers in the FastAPI request path can await without blocking
    the event loop. Internally bridges to the sync SDK via ``asyncio.to_thread``;
    we deliberately avoid the async SDK here to keep the dependency surface
    identical to other services.
    """
    if not _is_enabled():
        return None

    settings = get_settings()
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _call() -> Optional[List[str]]:
        try:
            response = client.messages.create(
                model=MODEL_ID,
                max_tokens=400,
                # Top-level cache_control auto-caches the rendered prefix
                # (system + tools). The system prompt is stable, so every
                # call after the first is a cheap cache_read.
                cache_control={"type": "ephemeral"},
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": _build_user_message(interests)}],
            )
        except anthropic.AuthenticationError as exc:
            logger.warning("Anthropic auth failed (%s) — falling back to templates.", exc)
            return None
        except anthropic.RateLimitError as exc:
            logger.warning("Anthropic rate limited (%s) — falling back to templates.", exc)
            return None
        except Exception as exc:  # noqa: BLE001
            logger.warning("Anthropic call failed (%s) — falling back to templates.", exc)
            return None

        text = next((b.text for b in response.content if b.type == "text"), "")
        questions = _parse_questions(text)
        if not questions:
            logger.warning("LLM-Antwort konnte nicht geparst werden: %s", text[:200])
            return None

        # Cache visibility for debugging — emits once per call.
        usage = response.usage
        logger.info(
            "Icebreaker LLM ok · cache_read=%d cache_write=%d input=%d output=%d",
            getattr(usage, "cache_read_input_tokens", 0) or 0,
            getattr(usage, "cache_creation_input_tokens", 0) or 0,
            usage.input_tokens,
            usage.output_tokens,
        )
        return questions[:5]

    return await asyncio.to_thread(_call)
