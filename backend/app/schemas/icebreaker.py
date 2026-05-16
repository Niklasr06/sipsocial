from typing import List

from pydantic import BaseModel, Field

from app.schemas.common import BaseDocument


class Icebreaker(BaseDocument):
    match_id: str
    interest: str
    questions: List[str] = Field(default_factory=list)


class IcebreakerBundle(BaseModel):
    match_id: str
    items: List[Icebreaker]
