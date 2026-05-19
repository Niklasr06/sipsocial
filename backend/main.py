"""SipSocial FastAPI backend.

Run locally:

    uvicorn main:app --reload

Modes:

- **DB-backed** when ``DATABASE_URL`` is set and reachable (e.g. Neon).
- **Mock-only** otherwise — endpoints still respond using the bundled mock
  dataset so the Expo frontend keeps working without a database.

``GET /api/health`` reports which mode is active and whether the Google
Places key was provided.
"""

from contextlib import asynccontextmanager
import logging

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import auth, availability, blocks, cafes, chat, icebreakers, matching, meetings, profiles, users
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.db import postgres
from app.services import reminder_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger("sipsocial")

# Sentry vor FastAPI initialisieren, sonst greift die Middleware nicht. Wenn
# ``SENTRY_DSN`` leer ist, bleibt das SDK no-op — kein traffic, keine PII.
_sentry_settings = get_settings()
if _sentry_settings.SENTRY_DSN.strip():
    sentry_sdk.init(
        dsn=_sentry_settings.SENTRY_DSN,
        environment=_sentry_settings.SENTRY_ENVIRONMENT,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    await postgres.connect()
    reminder_service.start()
    try:
        yield
    finally:
        await reminder_service.stop()
        await postgres.disconnect()


settings = get_settings()

# Rate limiting via slowapi (defined in core.rate_limit so route modules
# can share the same Limiter instance). Per-route limits are declared on
# the individual endpoints with @limiter.limit().

app = FastAPI(
    title="SipSocial API",
    version="1.0.0",
    description="Backend for the SipSocial coffee-meetup app.",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.BACKEND_CORS_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["meta"])
async def health() -> dict:
    """Liveness + readiness in one. Render/Fly will hit this; if the DB
    is unreachable we still answer 200 (the app degrades gracefully into
    mock mode) but flag ``db_alive: false`` so monitoring can alert.
    """
    db_alive = False
    db_error = postgres.state.error
    if postgres.is_connected():
        try:
            pool = postgres.get_pool()
            if pool is not None:
                async with pool.acquire() as conn:
                    await conn.fetchval("SELECT 1")
                db_alive = True
        except Exception as exc:  # noqa: BLE001
            db_error = str(exc)
    return {
        "ok": True,
        "mode": "postgres" if postgres.is_connected() else "mock",
        "db_alive": db_alive,
        "db_error": db_error,
        "google_places": settings.has_google_maps,
        "anthropic": bool(settings.ANTHROPIC_API_KEY.strip()),
    }


for router in (
    auth.router,
    users.router,
    profiles.router,
    availability.router,
    matching.router,
    cafes.router,
    meetings.router,
    chat.router,
    icebreakers.router,
    blocks.router,
):
    app.include_router(router, prefix="/api")
