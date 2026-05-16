from typing import List

from fastapi import APIRouter, HTTPException

from app.schemas.match import Match, MatchFindRequest, MatchStatusUpdate
from app.services import icebreaker_service, matching_service, notification_service, user_service

router = APIRouter(prefix="/matches", tags=["matches"])


@router.post("/find", response_model=List[Match])
async def find_matches(payload: MatchFindRequest) -> List[Match]:
    matches = await matching_service.find_matches_for_user(payload.user_id)
    # Best-effort generation of icebreakers up-front so the chat screen has them.
    for m in matches[:5]:
        if m.id and m.shared_interests:
            try:
                await icebreaker_service.generate_icebreakers_for_match(m.id, m.shared_interests)
            except Exception:
                pass
    return matches


@router.get("/{user_id}", response_model=List[Match])
async def list_matches(user_id: str) -> List[Match]:
    return await matching_service.list_for_user(user_id)


@router.patch("/{match_id}/status", response_model=Match)
async def update_match_status(match_id: str, payload: MatchStatusUpdate) -> Match:
    match = await matching_service.update_status(match_id, payload.status)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # When user A accepts the suggestion, ping user B so they know the chat
    # opened up — and vice versa. Only fire once on the suggested→accepted
    # transition; later status flips (cancelled, etc.) stay silent.
    if payload.status == "accepted":
        # We don't know which side initiated; notify the other end of the pair.
        accepter = await user_service.get_user(match.user_a_id)
        if accepter:
            await notification_service.notify_user(
                match.user_b_id,
                title="Neues Match auf SipSocial",
                body=f"{accepter.pseudonym} möchte mit dir auf einen Kaffee.",
                data={"type": "match_accepted", "match_id": match.id},
            )
    return match
