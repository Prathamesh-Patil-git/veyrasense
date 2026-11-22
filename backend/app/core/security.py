import time
import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Dict, Tuple
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.models.revoked_token import RevokedToken

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login"
)


# ==============================================================================
# 1. Login Attempt Rate Limiter (Brute-force Protection)
# ==============================================================================
class LoginRateLimiter:
    """In-memory sliding window rate limiter for login attempts."""

    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        # key -> (attempt_count, first_attempt_timestamp, lockout_until)
        self._attempts: Dict[str, Tuple[int, float, float]] = {}

    def is_locked(self, key: str) -> Tuple[bool, int]:
        now = time.time()
        record = self._attempts.get(key)
        if not record:
            return False, 0

        count, first_time, lockout_until = record
        if now < lockout_until:
            remaining_seconds = int(lockout_until - now)
            return True, max(1, remaining_seconds)

        # If window expired and not in active lockout, prune
        if now - first_time > self.window_seconds:
            self._attempts.pop(key, None)
            return False, 0

        return False, 0

    def record_failure(self, key: str) -> None:
        now = time.time()
        record = self._attempts.get(key)
        if not record:
            self._attempts[key] = (1, now, 0.0)
            return

        count, first_time, _ = record
        if now - first_time > self.window_seconds:
            # Window expired, start new window
            self._attempts[key] = (1, now, 0.0)
        else:
            new_count = count + 1
            lockout_until = 0.0
            if new_count >= self.max_attempts:
                lockout_until = now + self.window_seconds
            self._attempts[key] = (new_count, first_time, lockout_until)

    def record_success(self, key: str) -> None:
        self._attempts.pop(key, None)


login_rate_limiter = LoginRateLimiter(max_attempts=5, window_seconds=300)


# ==============================================================================
# 2. Password & Key Hashing
# ==============================================================================
def hash_password(password: str) -> str:
    """Hash administrator password using bcrypt with 12 salt rounds."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Safely verify plain password against bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def hash_device_key(raw_key: str) -> str:
    """Deterministic cryptographic hash for edge device pre-shared API keys."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


# ==============================================================================
# 3. JWT Token Creation, Verification & SQLite Revocation
# ==============================================================================
def create_access_token(
    subject: str | Any,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[dict[str, Any]] = None,
) -> str:
    """Create JWT access token with unique jti, explicit expiry, and subject."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    jti = str(uuid.uuid4())
    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "jti": jti,
        "iat": now,
        "exp": expire,
    }
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str, db: Optional[Session] = None) -> dict[str, Any]:
    """Decode and validate JWT access token with algorithm and revocation check."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub", "iat"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check revocation if DB session is provided
    jti = payload.get("jti")
    if db is not None and jti:
        revoked = db.query(RevokedToken).filter(RevokedToken.jti == jti).first()
        if revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return payload


def revoke_token(db: Session, token: str) -> None:
    """Record token's jti in SQLite revoked_tokens table."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False},
        )
        jti = payload.get("jti")
        exp_ts = payload.get("exp")
        if jti and exp_ts:
            expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
            revoked = RevokedToken(jti=jti, expires_at=expires_at)
            db.add(revoked)
            db.commit()
    except Exception:
        # Invalid token cannot be revoked
        pass


# ==============================================================================
# 4. Device & MQTT Dynamic Provisioning Credentials
# ==============================================================================
import secrets


def generate_secure_device_secret(length: int = 32) -> str:
    """Generate a high-entropy cryptographically secure random device secret."""
    return secrets.token_urlsafe(length)


def generate_node_id(dept_code: str = "ESP32") -> str:
    """Generate a unique node identifier with random hex suffix."""
    suffix = secrets.token_hex(2).upper()
    clean_code = "".join(c for c in dept_code.upper() if c.isalnum())[:6] or "ESP32"
    return f"NODE-{clean_code}-{suffix}"


def hash_mqtt_password(password: str) -> str:
    """Hash MQTT device password using SHA-256 for deterministic authentication and Mosquitto integration."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

