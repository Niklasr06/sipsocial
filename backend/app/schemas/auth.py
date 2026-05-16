from pydantic import BaseModel, Field

from app.schemas.user import EMAIL_PATTERN, User


class RegisterRequest(BaseModel):
    pseudonym: str = Field(min_length=2, max_length=24)
    email: str = Field(pattern=EMAIL_PATTERN, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class AuthResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: User
