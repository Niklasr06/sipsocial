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
    refresh_token: str
    user: User


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN, max_length=254)


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=8, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)
