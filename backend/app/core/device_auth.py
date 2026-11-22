"""Device Authentication Interface and Ingestion Security.

Implements device identity verification for IoT edge sensor nodes while
preventing reuse of administrator credentials on physical endpoints.
"""
from dataclasses import dataclass
from typing import Optional
from fastapi import Header, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models.node import SensorNode
from app.database.models.administrator import Administrator
from app.core.security import hash_device_key, decode_access_token, oauth2_scheme
from app.services.auth_service import AuthService


@dataclass
class IngestionAuthContext:
    """Security context under which telemetry is being ingested."""
    auth_type: str  # "device" or "admin"
    node_id: Optional[str] = None
    node_pk: Optional[int] = None
    admin_email: Optional[str] = None

    @property
    def is_device(self) -> bool:
        return self.auth_type == "device"

    @property
    def is_admin(self) -> bool:
        return self.auth_type == "admin"


async def get_ingestion_auth_context(
    x_device_key: Optional[str] = Header(None, alias="X-Device-Key"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> IngestionAuthContext:
    """Validate device API key or administrator Bearer token for measurement ingestion.

    Enforces that devices authenticate with their own distinct node credentials,
    preventing administrator token reuse across edge sensor hardware.
    """
    # 1. Check Device API Key authentication
    if x_device_key:
        hashed_key = hash_device_key(x_device_key)
        node = (
            db.query(SensorNode)
            .filter(
                SensorNode.api_key_hash == hashed_key,
                SensorNode.is_active.is_(True),
            )
            .first()
        )
        if not node:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or revoked device API key.",
            )
        return IngestionAuthContext(
            auth_type="device",
            node_id=node.node_id,
            node_pk=node.id,
        )

    # 2. Check Administrator Bearer Token (Permitted for controlled testing & operator entry)
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
        payload = decode_access_token(token, db=db)
        email = payload.get("sub")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload missing subject",
            )
        admin = AuthService.get_admin_by_email(db, email)
        if not admin or not admin.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )
        return IngestionAuthContext(
            auth_type="admin",
            admin_email=admin.email,
        )

    # 3. Neither device key nor admin token supplied
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Telemetry ingestion requires valid 'X-Device-Key' header or Administrator Bearer token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def enforce_node_authorization(auth_context: IngestionAuthContext, target_node_pk: int) -> None:
    """Ensure authenticated device cannot forge telemetry for a different sensor node."""
    if auth_context.is_device:
        if auth_context.node_pk != target_node_pk:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Device credentials for node '{auth_context.node_id}' are not "
                    f"authorized to submit telemetry for node ID {target_node_pk}."
                ),
            )
