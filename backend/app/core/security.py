"""FastAPI dependency for Bearer-token authentication."""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, Header, HTTPException, status

from app.schemas.user import User
from app.services import auth_service, user_service


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> User:
    """Resolve the authenticated user from ``Authorization: Bearer <token>``.

    Raises 401 when the header is missing, malformed, the token is invalid
    or the user it points at no longer exists.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = auth_service.decode_access_token(token)
    except auth_service.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has no subject.",
        )
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )
    return user


CurrentUser = Depends(get_current_user)
