from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    CHAT_ENCRYPTION_KEY: str = ""
    BACKEND_CORS_ORIGINS: str = "http://localhost:8081,http://localhost:8082,http://localhost:19006,http://localhost:19000"

    # JWT secret for session tokens. Generate with:
    #   python -c 'import secrets; print(secrets.token_urlsafe(48))'
    JWT_SECRET: str = ""
    JWT_EXPIRES_HOURS: int = 24 * 7  # one week default

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
