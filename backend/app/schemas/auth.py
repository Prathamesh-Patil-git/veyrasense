from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class LoginRequest(BaseModel):
    """Administrator credentials request."""
    email: EmailStr
    password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    """JWT Bearer authentication token."""
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int


class AdminResponse(BaseModel):
    """Administrator profile public response (never exposes password hash)."""
    id: int
    email: str
    full_name: str
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PasswordResetRequest(BaseModel):
    """CLI admin password reset request."""
    email: EmailStr
    new_password: str = Field(min_length=8)
