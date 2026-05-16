from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.common import BaseDocument, MatchStatus, MeetingPreference


class MatchReason(BaseModel):
    label: str
    detail: str


class MatchFindRequest(BaseModel):
    user_id: str


class MatchStatusUpdate(BaseModel):
    status: MatchStatus


class Match(BaseDocument):
    user_a_id: str
    user_b_id: str
    score: int
    shared_interests: List[str] = Field(default_factory=list)
    suggested_cafe_id: Optional[str] = None
    suggested_date: str
    suggested_start_time: str
    suggested_end_time: str
    meeting_preference: MeetingPreference = "both"
    status: MatchStatus = "suggested"
    reasons: List[MatchReason] = Field(default_factory=list)
