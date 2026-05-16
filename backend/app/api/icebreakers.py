from typing import List, Optional

from fastapi import APIRouter, Query

from app.schemas.icebreaker import Icebreaker
from app.services import icebreaker_service, matching_service

router = APIRouter(prefix="/chat", tags=["icebreakers"])


@router.get("/{match_id}/icebreakers", response_model=List[Icebreaker])
async def get_icebreakers(
    match_id: str,
    interests: Optional[str] = Query(
        default=None,
        description="Comma-separated fallback interests when the match isn't stored yet",
    ),
) -> List[Icebreaker]:
    shared: List[str] = []
    match = await matching_service.get_match(match_id)
    if match:
        shared = list(match.shared_interests)
    if not shared and interests:
        shared = [i.strip() for i in interests.split(",") if i.strip()]
    return await icebreaker_service.get_icebreakers_by_match(match_id, shared)
