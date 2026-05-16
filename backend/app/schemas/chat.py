from typing import List

from pydantic import BaseModel, Field

from app.schemas.common import BaseDocument


class ChatMessageCreate(BaseModel):
    sender_id: str
    text: str = Field(min_length=1, max_length=240)


class ChatMessage(BaseDocument):
    match_id: str
    sender_id: str
    encrypted_text: str
    message_number: int
    blocked: bool = False
    privacy_warnings: List[str] = Field(default_factory=list)


class ChatMessageDecrypted(BaseModel):
    """Returned by the API: ``encrypted_text`` is decrypted into ``text`` before
    leaving the backend so the frontend never deals with cipher payloads."""

    id: str
    match_id: str
    sender_id: str
    text: str
    message_number: int
    blocked: bool
    privacy_warnings: List[str]
    created_at: str


class ChatSendResponse(BaseModel):
    ok: bool
    reason: str = ""
    message: ChatMessageDecrypted | None = None
    remaining: int = 0
