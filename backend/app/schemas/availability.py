from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.common import BaseDocument


class AvailabilityCreate(BaseModel):
    user_id: str
    date: str = Field(description="YYYY-MM-DD")
    start_time: str = Field(description="HH:mm")
    end_time: str = Field(description="HH:mm")
    area: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class Availability(BaseDocument):
    user_id: str
    date: str
    start_time: str
    end_time: str
    area: str
    lat: Optional[float] = None
    lng: Optional[float] = None
