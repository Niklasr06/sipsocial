"""Profile service.

In this codebase the ``users`` collection already carries the full profile.
``profiles`` is a public-facing projection — what other users see. We keep
both endpoints to match the requested API surface.
"""

from __future__ import annotations

from typing import Optional

from app.schemas.user import Profile, UserUpdate
from app.services import user_service


async def get_profile(user_id: str) -> Optional[Profile]:
    user = await user_service.get_user(user_id)
    if not user:
        return None
    return Profile(
        id=user.id or user_id,
        pseudonym=user.pseudonym,
        age_range=user.age_range,
        bio="" if user.privacy_settings.hide_bio else user.bio,
        interests=user.interests,
        meeting_preference=user.meeting_preference,
        initials=user.initials,
        accent_color=user.accent_color,
        trust_status=user.trust_status,
    )


async def update_profile(user_id: str, patch: UserUpdate) -> Optional[Profile]:
    await user_service.update_user(user_id, patch)
    return await get_profile(user_id)
