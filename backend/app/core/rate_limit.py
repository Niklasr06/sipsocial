"""Shared slowapi limiter, importable from any router.

We register the instance on ``app.state.limiter`` in ``main.py`` so the
SlowAPI middleware sees the same object, and re-export the decorator
here so route modules don't need to know about that wiring.
"""

from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings


def _client_ip(request: Request) -> str:
    """Return the client IP, honoring ``X-Forwarded-For`` behind a proxy.

    Render/Fly/etc. terminate TLS and forward the request to uvicorn;
    without trusting the header, every request looks like it comes from
    the LB and our rate-limit hits all users at once.

    We only trust the header when ``TRUST_PROXY=true`` so a misconfigured
    local dev deploy doesn't accidentally let any client spoof its IP.
    The first hop in ``X-Forwarded-For`` is the original client; everything
    after is proxy chaining.
    """
    if get_settings().TRUST_PROXY:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",", 1)[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_client_ip)
