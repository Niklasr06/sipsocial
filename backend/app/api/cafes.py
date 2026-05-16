from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.cafe import Cafe, CafeSearchQuery
from app.services import cafe_service

router = APIRouter(prefix="/cafes", tags=["cafes"])


@router.get("/search", response_model=List[Cafe])
async def search_cafes(
    area: Optional[str] = Query(default=None),
    lat: Optional[float] = Query(default=None),
    lng: Optional[float] = Query(default=None),
    radius_m: int = Query(default=1500, ge=200, le=5000),
    limit: int = Query(default=12, ge=1, le=30),
) -> List[Cafe]:
    return await cafe_service.search_cafes_near_location(
        CafeSearchQuery(area=area, lat=lat, lng=lng, radius_m=radius_m, limit=limit)
    )


@router.get("/nearby", response_model=List[Cafe])
async def cafes_nearby(
    lat: float,
    lng: float,
    radius_m: int = Query(default=1500, ge=200, le=5000),
    limit: int = Query(default=12, ge=1, le=30),
) -> List[Cafe]:
    return await cafe_service.search_cafes_near_location(
        CafeSearchQuery(lat=lat, lng=lng, radius_m=radius_m, limit=limit)
    )


@router.get("/{cafe_id}", response_model=Cafe)
async def get_cafe(cafe_id: str) -> Cafe:
    cafe = await cafe_service.get_cafe(cafe_id)
    if not cafe:
        raise HTTPException(status_code=404, detail="Café not found")
    return cafe
