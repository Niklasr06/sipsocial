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
    # ``hide_exact_age``: standardmäßig zeigen wir den Altersbereich
    # statt der genauen Zahl. Wer den Slider umlegt, lässt auch die
    # exakte Zahl Matches sehen.
    hide_exact_age: bool = True
    hide_bio: bool = False
    share_only_area: bool = True


def age_to_range(age: Optional[int]) -> AgeRange:
    """Bucket eine konkrete Alterszahl in den passenden Bereich. Werte
    außerhalb 18-99 schnappen auf die Ränder ein — wir validieren auf
    Eingabe-Ebene, hier soll bloß nichts crashen."""
    if age is None:
        return "25-34"
    if age < 25:
        return "18-24"
    if age < 35:
        return "25-34"
    if age < 45:
        return "35-44"
    return "45+"


class CafeLocation(BaseModel):
    lat: float
    lng: float


class BaseDocument(BaseModel):
    """Pydantic base for persisted objects returned from the API.

    Plain ``id`` field — the leftover ``_id`` alias from the MongoDB days
    caused the frontend to read ``user.id`` as ``undefined`` (the JSON
    came out with ``_id``), which then sent every PATCH/DELETE to
    ``/api/users/undefined`` and silently 404'd.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    id: Optional[str] = Field(default=None)
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
    "age_to_range",
]
