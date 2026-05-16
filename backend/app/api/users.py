from fastapi import APIRouter, Depends, HTTPException, status
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
