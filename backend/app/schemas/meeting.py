from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.common import BaseDocument, MeetingStatus


class CheckIn(BaseModel):
    user_id: str
    status: Literal["waiting", "checked_in"] = "waiting"
    checked_in_at: Optional[datetime] = None


class MeetingCreate(BaseModel):
    match_id: str
    cafe_id: str
    date: str
    start_time: str
    end_time: str


class MeetingUpdate(BaseModel):
    status: Optional[MeetingStatus] = None
    cafe_id: Optional[str] = None
    check_in_user_id: Optional[str] = None  # if set, mark this user as checked in


class Meeting(BaseDocument):
    match_id: str
    cafe_id: str
    date: str
    start_time: str
    end_time: str
    status: MeetingStatus = "confirmed"
    qr_code: str
    check_ins: List[CheckIn] = Field(default_factory=list)
