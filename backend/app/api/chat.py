from typing import List

from fastapi import APIRouter

from app.schemas.chat import ChatMessageCreate, ChatMessageDecrypted, ChatSendResponse
from app.services import chat_service, matching_service, notification_service, user_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/{match_id}", response_model=List[ChatMessageDecrypted])
async def get_messages(match_id: str) -> List[ChatMessageDecrypted]:
    return await chat_service.get_messages(match_id)


@router.post("/{match_id}/message", response_model=ChatSendResponse)
async def send_message(match_id: str, payload: ChatMessageCreate) -> ChatSendResponse:
    response = await chat_service.send_message(match_id, payload)

    # Only push on a successful, non-blocked send so users don't get pinged
    # for their own privacy-filter rejections.
    if response.ok and response.message:
        match = await matching_service.get_match(match_id)
        sender = await user_service.get_user(payload.sender_id)
        if match and sender:
            recipient_id = (
                match.user_b_id if payload.sender_id == match.user_a_id else match.user_a_id
            )
            await notification_service.notify_user(
                recipient_id,
                title=f"Nachricht von {sender.pseudonym}",
                body=response.message.text[:140],
                data={"type": "chat_message", "match_id": match_id},
            )
    return response
