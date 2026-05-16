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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, availability, cafes, chat, icebreakers, matching, meetings, profiles, users
from app.core.config import get_settings
from app.db import postgres

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger("sipsocial")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await postgres.connect()
    try:
        yield
    finally:
        await postgres.disconnect()


settings = get_settings()

app = FastAPI(
    title="SipSocial API",
    version="1.0.0",
    description="Backend for the SipSocial coffee-meetup app.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["meta"])
async def health() -> dict:
    return {
        "ok": True,
        "mode": "postgres" if postgres.is_connected() else "mock",
        "db_error": postgres.state.error,
        "google_places": settings.has_google_maps,
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
):
    app.include_router(router, prefix="/api")
