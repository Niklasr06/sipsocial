from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_user
from app.db.postgres import is_connected
from app.schemas.meeting import Meeting, MeetingCreate, MeetingUpdate
from app.schemas.user import User
from app.services import (
    auth_service,
    cafe_service,
    matching_service,
    meeting_service,
    notification_service,
)

router = APIRouter(prefix="/meetings", tags=["meetings"])


class CheckInRequest(BaseModel):
    qr_token: str


@router.post("", response_model=Meeting)
async def create_meeting(
    payload: MeetingCreate,
    current_user: User = Depends(get_current_user),
) -> Meeting:
    if not is_connected():
        raise HTTPException(
            status_code=503,
            detail="Database is not connected; cannot persist a meeting.",
        )
    match = await matching_service.get_match(payload.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if current_user.id not in {match.user_a_id, match.user_b_id}:
        raise HTTPException(status_code=403, detail="You are not a participant of this match.")

    meeting = await meeting_service.create_meeting(match, payload)
    await matching_service.update_status(payload.match_id, "accepted")

    # Notify the *other* participant that the meeting is locked in.
    other_id = match.user_b_id if current_user.id == match.user_a_id else match.user_a_id
    cafe = await cafe_service.get_cafe(meeting.cafe_id)
    cafe_name = cafe.name if cafe else "ein Café"
    await notification_service.notify_user(
        other_id,
        title="Treffen bestätigt",
        body=f"{current_user.pseudonym} hat das Treffen bei {cafe_name} bestätigt.",
        data={"type": "meeting_created", "meeting_id": meeting.id},
    )
    return meeting


@router.get("/{user_id}", response_model=List[Meeting])
async def list_meetings(user_id: str) -> List[Meeting]:
    return await meeting_service.list_for_user(user_id)


@router.patch("/{meeting_id}", response_model=Meeting)
async def update_meeting(meeting_id: str, patch: MeetingUpdate) -> Meeting:
    meeting = await meeting_service.update(meeting_id, patch)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("/{meeting_id}/check-in", response_model=Meeting)
async def check_in_meeting(
    meeting_id: str,
    payload: CheckInRequest,
    current_user: User = Depends(get_current_user),
) -> Meeting:
    """Mark the authenticated user as checked-in if the scanned QR is valid.

    The QR token must be a JWT issued by us for this exact meeting. The caller
    is identified by the Bearer header — the scanner is whoever points their
    camera at the QR on the café table.
    """
    try:
        claims = auth_service.decode_qr_token(payload.qr_token)
    except auth_service.InvalidTokenError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if claims.get("meeting_id") != meeting_id:
        raise HTTPException(status_code=400, detail="QR token does not match this meeting.")

    meeting = await meeting_service.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    match = await matching_service.get_match(meeting.match_id)
    if not match or current_user.id not in {match.user_a_id, match.user_b_id}:
        raise HTTPException(status_code=403, detail="You are not a participant of this meeting.")

    updated = await meeting_service.update(
        meeting_id, MeetingUpdate(check_in_user_id=current_user.id)
    )
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to record check-in.")
    return updated
