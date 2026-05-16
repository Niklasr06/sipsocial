from fastapi import APIRouter, HTTPException, status

from app.schemas.user import Profile, UserUpdate
from app.services import profile_service

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.post("", response_model=Profile, status_code=status.HTTP_201_CREATED)
async def upsert_profile(user_id: str, patch: UserUpdate) -> Profile:
    profile = await profile_service.update_profile(user_id, patch)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


@router.get("/{user_id}", response_model=Profile)
async def get_profile(user_id: str) -> Profile:
    profile = await profile_service.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.patch("/{user_id}", response_model=Profile)
async def patch_profile(user_id: str, patch: UserUpdate) -> Profile:
    profile = await profile_service.update_profile(user_id, patch)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
