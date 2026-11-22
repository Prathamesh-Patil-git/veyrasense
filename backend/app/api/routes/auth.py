from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models.administrator import Administrator
from app.core.security import (
    create_access_token,
    decode_access_token,
    revoke_token,
    login_rate_limiter,
    oauth2_scheme,
)
from app.core.config import settings
from app.services.auth_service import AuthService
from app.schemas.auth import TokenResponse, AdminResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_current_admin(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
) -> Administrator:
    """Dependency ensuring caller possesses a valid, unrevoked admin JWT."""
    payload = decode_access_token(token, db=db)
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )
    admin = AuthService.get_admin_by_email(db, email)
    if not admin or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return admin


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    db: Session = Depends(get_db),
):
    """Authenticate administrator and return Bearer access token.

    Enforces brute-force rate limiting (5 failed attempts per 5 minutes)
    and returns a generic error on credential mismatch.
    """
    content_type = request.headers.get("content-type", "")
    email = ""
    password = ""

    if "application/json" in content_type:
        try:
            body = await request.json()
            email = str(body.get("email") or body.get("username") or "").strip()
            password = str(body.get("password") or "")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON payload",
            )
    else:
        try:
            form = await request.form()
            email = str(form.get("username") or form.get("email") or "").strip()
            password = str(form.get("password") or "")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid form data payload",
            )

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password credentials required.",
        )

    rate_key = email.lower()

    # Check brute-force rate limiter
    is_locked, remaining_seconds = login_rate_limiter.is_locked(rate_key)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Authentication locked for {remaining_seconds} seconds.",
        )

    admin = AuthService.authenticate_admin(db, email, password)
    if not admin:
        login_rate_limiter.record_failure(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Reset failure counter on successful authentication
    login_rate_limiter.record_success(rate_key)

    token = create_access_token(
        subject=admin.email,
        extra_claims={"name": admin.full_name, "role": "admin"},
    )
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=AdminResponse)
def get_current_admin_profile(
    current_admin: Administrator = Depends(get_current_admin),
):
    """Return currently authenticated administrator profile."""
    return current_admin


@router.post("/logout")
def logout(
    token: Annotated[str, Depends(oauth2_scheme)],
    current_admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Acknowledge administrator logout and persist token revocation in SQLite."""
    revoke_token(db, token)
    return {"message": "Successfully signed out. Token revoked."}
