from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.schemas.user import User, UserCreate, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


class PushTokenPayload(BaseModel):
    token: str | None = None


@router.post("", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate) -> User:
    return await user_service.create_user(payload)


@router.get("/{user_id}", response_model=User)
async def get_user(user_id: str) -> User:
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=User)
async def update_user(user_id: str, patch: UserUpdate) -> User:
    user = await user_service.update_user(user_id, patch)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/me/push-token", status_code=204)
async def set_push_token(
    payload: PushTokenPayload,
    current_user: User = Depends(get_current_user),
) -> None:
    """Register (or clear with ``token=null``) the user's Expo push token."""
    await user_service.set_push_token(current_user.id, payload.token)
    return None


@router.delete("/me", status_code=204, response_class=Response)
async def delete_me(current_user: User = Depends(get_current_user)) -> Response:
    """Permanently delete the authenticated user's account.

    DSGVO Art. 17 (right to erasure). Cascades through availabilities,
    matches, meetings, chat history, blocks, reports, and the user's auth
    tokens. There is no undo — the client should confirm intent before
    calling this.
    """
    await user_service.delete_user(current_user.id or "")
    return Response(status_code=204)
