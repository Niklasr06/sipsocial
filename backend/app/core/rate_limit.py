"""Shared slowapi limiter, importable from any router.

We register the instance on ``app.state.limiter`` in ``main.py`` so the
SlowAPI middleware sees the same object, and re-export the decorator
here so route modules don't need to know about that wiring.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address


# IP-based limiting. Behind a real proxy you'd swap key_func for one
# that respects X-Forwarded-For; for local dev IP is fine.
limiter = Limiter(key_func=get_remote_address)
