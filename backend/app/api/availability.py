from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.schemas.availability import Availability, AvailabilityCreate
from app.schemas.user import User
from app.services import availability_service

router = APIRouter(prefix="/availability", tags=["availability"])


@router.post("", response_model=Availability, status_code=status.HTTP_201_CREATED)
async def add_availability(payload: AvailabilityCreate) -> Availability:
    return await availability_service.add_availability(payload)


@router.get("/{user_id}", response_model=List[Availability])
async def get_availability(user_id: str) -> List[Availability]:
    return await availability_service.get_for_user(user_id)


@router.delete("/{availability_id}", status_code=204)
async def delete_availability(
    availability_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    """Remove one of the caller's own availability slots."""
    deleted = await availability_service.delete_one(availability_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Availability not found.")
    return None
