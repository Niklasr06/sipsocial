from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.common import (
    AgeRange,
    BaseDocument,
    MeetingPreference,
    PrivacySettings,
    TrustStatus,
)


# Pragmatic, permissive email check — accepts `niki@test.local` etc. so the
# demo isn't blocked by the reserved-TLD rules of ``email-validator``.
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class UserCreate(BaseModel):
    pseudonym: str = Field(min_length=2, max_length=24)
    email: str = Field(pattern=EMAIL_PATTERN, max_length=254)


ALL_AGE_RANGES: List[AgeRange] = ["18-24", "25-34", "35-44", "45+"]


class UserUpdate(BaseModel):
    pseudonym: Optional[str] = Field(default=None, min_length=2, max_length=24)
    age_range: Optional[AgeRange] = None
    bio: Optional[str] = Field(default=None, max_length=240)
    interests: Optional[List[str]] = None
    meeting_preference: Optional[MeetingPreference] = None
    privacy_settings: Optional[PrivacySettings] = None
    match_age_ranges: Optional[List[AgeRange]] = Field(default=None, min_length=1)


class User(BaseDocument):
    pseudonym: str
    email: str
    age_range: AgeRange = "25-34"
    bio: str = ""
    interests: List[str] = Field(default_factory=list)
    meeting_preference: MeetingPreference = "both"
    privacy_settings: PrivacySettings = Field(default_factory=PrivacySettings)
    no_show_count: int = 0
    trust_status: TrustStatus = "trusted"
    initials: str = ""
    accent_color: str = "#7A4E2D"
    # Default: alle Bereiche — neue User bekommen sonst keine Matches.
    match_age_ranges: List[AgeRange] = Field(default_factory=lambda: list(ALL_AGE_RANGES))


class Profile(BaseModel):
    """Public-facing slice of a user, used when other users see them."""

    id: str
    pseudonym: str
    age_range: AgeRange
    bio: str
    interests: List[str]
    meeting_preference: MeetingPreference
    initials: str
    accent_color: str
    trust_status: TrustStatus
