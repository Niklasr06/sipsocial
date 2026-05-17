"""Block + report endpoints. All require auth — block decisions belong to
the bearer's identity, not a path param, to prevent client-side spoofing."""

from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.schemas.user import User
from app.services import block_service

router = APIRouter(tags=["blocks"])


class BlockPayload(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=200)


class ReportPayload(BaseModel):
    reported_id: str
    reason: str = Field(min_length=1, max_length=64)
    details: str = Field(default="", max_length=1000)
    match_id: Optional[str] = None


@router.post("/blocks/{user_id}", status_code=204, response_class=Response)
async def create_block(
    user_id: str,
    payload: BlockPayload = Body(default_factory=BlockPayload),
    current: User = Depends(get_current_user),
) -> Response:
    if current.id and user_id == current.id:
        raise HTTPException(status_code=400, detail="Du kannst dich nicht selbst blockieren.")
    await block_service.block_user(current.id or "", user_id, payload.reason)
    return Response(status_code=204)


@router.delete("/blocks/{user_id}", status_code=204, response_class=Response)
async def remove_block(
    user_id: str,
    current: User = Depends(get_current_user),
) -> Response:
    await block_service.unblock_user(current.id or "", user_id)
    return Response(status_code=204)


@router.get("/blocks", response_model=List[str])
async def list_blocks(current: User = Depends(get_current_user)) -> List[str]:
    """Returns the ids of users the caller has blocked."""
    return await block_service.list_blocked(current.id or "")


@router.post("/reports", status_code=201)
async def submit_report(
    payload: ReportPayload = Body(...),
    current: User = Depends(get_current_user),
) -> dict:
    ok, err = await block_service.submit_report(
        current.id or "",
        payload.reported_id,
        payload.reason,
        details=payload.details,
        match_id=payload.match_id,
    )
    if not ok:
        raise HTTPException(status_code=400, detail=err or "Meldung fehlgeschlagen.")
    # Always also block the reported user — reports usually mean "I don't
    # want to see this person again", and not blocking would be a surprise.
    await block_service.block_user(current.id or "", payload.reported_id, reason=f"report:{payload.reason}")
    return {"ok": True}
