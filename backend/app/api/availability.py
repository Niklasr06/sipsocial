from typing import List

from fastapi import APIRouter, status

from app.schemas.availability import Availability, AvailabilityCreate
from app.services import availability_service

router = APIRouter(prefix="/availability", tags=["availability"])


@router.post("", response_model=Availability, status_code=status.HTTP_201_CREATED)
async def add_availability(payload: AvailabilityCreate) -> Availability:
    return await availability_service.add_availability(payload)


@router.get("/{user_id}", response_model=List[Availability])
async def get_availability(user_id: str) -> List[Availability]:
    return await availability_service.get_for_user(user_id)
