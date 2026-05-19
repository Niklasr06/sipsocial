from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    CHAT_ENCRYPTION_KEY: str = ""
    # Anthropic API key (optional). When set, icebreakers are generated via
    # Claude Haiku; otherwise the template bank is used.
    ANTHROPIC_API_KEY: str = ""
    # Set to ``true`` when running behind a reverse proxy (Render, Fly,
    # nginx, …) so rate-limiting reads the real client IP from
    # ``X-Forwarded-For`` instead of seeing every request as the LB.
    TRUST_PROXY: bool = False
    BACKEND_CORS_ORIGINS: str = "http://localhost:8081,http://localhost:8082,http://localhost:19006,http://localhost:19000"
    # Optional regex that matches additional origins (e.g. Vercel previews
    # like https://sipsocial-git-feature-niklas.vercel.app). Leave empty to
    # accept only the explicit BACKEND_CORS_ORIGINS list.
    BACKEND_CORS_ORIGIN_REGEX: str = ""

    # JWT secret for session tokens. Generate with:
    #   python -c 'import secrets; print(secrets.token_urlsafe(48))'
    JWT_SECRET: str = ""
    # Access-token lifetime. Kept short — clients use the refresh token
    # (server-side, rotated) to mint a new access token on 401.
    JWT_EXPIRES_HOURS: int = 1
    # Refresh-token lifetime. 90 days is the practical max — past that the
    # user re-logs in. Tokens rotate on each /auth/refresh call so even a
    # leaked token only works once.
    REFRESH_TOKEN_DAYS: int = 90

    # Sentry-DSN (optional). Ohne DSN bleibt das Sentry-SDK uninitialisiert
    # und sendet nichts — so können lokale Dev-Runs keine Telemetrie leaken.
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "production"

    # Postmark (optional). Ohne Token loggt das Backend nur — produktive
    # Password-Reset-Mails brauchen Token + verifizierte Sender-Signature.
    POSTMARK_SERVER_TOKEN: str = ""
    POSTMARK_FROM_EMAIL: str = ""
    # Public frontend URL — Reset-Mail verlinkt darauf, damit der User
    # nicht händisch durch die App klickt. Leer = nur Hinweistext in Mail.
    FRONTEND_URL: str = ""

    @property
    def has_email(self) -> bool:
        return bool(self.POSTMARK_SERVER_TOKEN.strip() and self.POSTMARK_FROM_EMAIL.strip())

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    @property
    def has_database(self) -> bool:
        return bool(self.DATABASE_URL.strip())

    @property
    def has_google_maps(self) -> bool:
        return bool(self.GOOGLE_MAPS_API_KEY.strip())


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
