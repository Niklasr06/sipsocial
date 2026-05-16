from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.common import BaseDocument, CafeLocation


class CafeBase(BaseModel):
    name: str
    address: str
    area: str
    opening_hours: str = ""
    rating: float = 0.0
    atmosphere: List[str] = Field(default_factory=list)
    distance_mock: str = ""
    emoji: str = "☕️"
    location: Optional[CafeLocation] = None
    place_id: Optional[str] = None  # Google Places ID when available
    source: str = "mock"  # "mock" | "google"


class CafeCreate(CafeBase):
    pass


class Cafe(BaseDocument, CafeBase):
    pass


class CafeSearchQuery(BaseModel):
    area: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_m: int = 1500
    limit: int = 12
