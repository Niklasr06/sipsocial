from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


AgeRange = Literal["18-24", "25-34", "35-44", "45+"]
MeetingPreference = Literal["one_on_one", "group", "both"]
TrustStatus = Literal["trusted", "warning", "restricted", "suspended"]
MatchStatus = Literal["suggested", "proposed", "accepted", "declined", "completed"]
MeetingStatus = Literal[
    "pending",
    "confirmed",
    "one_checked_in",
    "both_checked_in",
    "completed",
    "cancelled",
    "no_show",
]


class PrivacySettings(BaseModel):
    hide_exact_age: bool = False
    hide_bio: bool = False
    share_only_area: bool = True


class CafeLocation(BaseModel):
    lat: float
    lng: float


class BaseDocument(BaseModel):
    """Pydantic base for documents returned from MongoDB.

    Allows population by either alias ``_id`` or field name ``id``.
    """

    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    id: Optional[str] = Field(default=None, alias="_id")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


__all__ = [
    "AgeRange",
    "BaseDocument",
    "CafeLocation",
    "EmailStr",
    "MatchStatus",
    "MeetingPreference",
    "MeetingStatus",
    "PrivacySettings",
    "TrustStatus",
]
