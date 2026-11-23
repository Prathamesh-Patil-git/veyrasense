from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models.department import Department
from app.database.models.administrator import Administrator
from app.api.routes.auth import get_current_admin
from app.services.node_service import NodeService
from app.schemas.node import (
    NodeCreate,
    NodeUpdate,
    NodeResponse,
    NodeProvisionRequest,
    NodeProvisionResponse,
    NodeRotateCredentialsResponse,
    NodeMqttCredentialsResponse,
    NodeRevokeResponse,
    NodeAuditResponse,
    NodeFirmwareConfigResponse,
)

router = APIRouter(prefix="/nodes", tags=["Sensor Nodes"])


@router.get("", response_model=List[NodeResponse])
def get_sensor_nodes(
    department_id: Optional[int] = Query(None, description="Filter nodes by department ID"),
    status: Optional[str] = Query(None, description="Filter by status (online, warning, alert, etc.)"),
    environment: Literal["real", "demo"] = Query("real"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: Administrator = Depends(get_current_admin),
):
    """List registered sensor nodes with optional department filtering and status tracking.

    Requires Administrator Authentication.
    """
    return NodeService.list_nodes(
        db,
        department_id=department_id,
        status=status,
        environment=environment,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=NodeResponse, status_code=status.HTTP_201_CREATED)
def register_sensor_node(
    data: NodeCreate,
    db: Session = Depends(get_db),
    _: Administrator = Depends(get_current_admin),
):
    """Register a new edge sensor node (Requires Administrator Authentication)."""
    try:
        node = NodeService.create_node(db, data)
        resp = NodeResponse.model_validate(node)
        if node.department:
            resp.department_name = node.department.name
        resp.has_api_key = bool(node.api_key_hash)
        return resp
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/provision", response_model=NodeProvisionResponse, status_code=status.HTTP_201_CREATED)
def provision_sensor_node(
    data: NodeProvisionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Administrator = Depends(get_current_admin),
):
    """Securely provision a new ESP32 edge sensor node.

    Generates unique credentials, per-node MQTT ACLs, and config snippet.
    The raw secret key is displayed EXACTLY ONCE and never stored in plaintext.
    Requires Administrator Authentication.
    """
    try:
        client_ip = request.client.host if request.client else None
        return NodeService.provision_node(
            db=db,
            data=data,
            actor=current_admin.email,
            ip_address=client_ip,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch("/{node_id}", response_model=NodeResponse)
def update_sensor_node(
    node_id: str,
    data: NodeUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Administrator = Depends(get_current_admin),
):
    """Edit descriptive device information; Node ID and MQTT identity remain fixed."""
    try:
        client_ip = request.client.host if request.client else None
        node = NodeService.update_node(
            db=db,
            node_id=node_id,
            data=data,
            actor=current_admin.email,
            ip_address=client_ip,
        )
        response = NodeResponse.model_validate(node)
        department = db.get(Department, node.department_id)
        response.department_name = department.name if department else None
        response.has_api_key = bool(node.api_key_hash)
        return response
    except ValueError as e:
        message = str(e)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if "does not exist" in message else status.HTTP_400_BAD_REQUEST,
            detail=message,
        )


@router.post("/{node_id}/rotate-credentials", response_model=NodeRotateCredentialsResponse)
def rotate_node_credentials(
    node_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Administrator = Depends(get_current_admin),
):
    """Rotate credentials for an active node and sync Mosquitto broker ACLs.

    Requires Administrator Authentication.
    """
    try:
        client_ip = request.client.host if request.client else None
        return NodeService.rotate_credentials(
            db=db,
            node_id=node_id,
            actor=current_admin.email,
            ip_address=client_ip,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{node_id}/mqtt-credentials", response_model=NodeMqttCredentialsResponse)
def renew_node_mqtt_credentials(
    node_id: str,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_admin: Administrator = Depends(get_current_admin),
):
    """Issue a one-time MQTT-only password reveal for reconnecting a real node."""
    response.headers["Cache-Control"] = "no-store"
    try:
        client_ip = request.client.host if request.client else None
        return NodeService.rotate_mqtt_credentials(
            db=db,
            node_id=node_id,
            actor=current_admin.email,
            ip_address=client_ip,
        )
    except ValueError as e:
        message = str(e)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if "does not exist" in message else status.HTTP_400_BAD_REQUEST,
            detail=message,
        )


@router.post("/{node_id}/revoke", response_model=NodeRevokeResponse)
def revoke_sensor_node(
    node_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Administrator = Depends(get_current_admin),
):
    """Revoke a sensor node. Cuts off all MQTT and API access while preserving historical telemetry.

    Requires Administrator Authentication.
    """
    try:
        client_ip = request.client.host if request.client else None
        return NodeService.revoke_node(
            db=db,
            node_id=node_id,
            actor=current_admin.email,
            ip_address=client_ip,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{node_id}/activate", response_model=NodeResponse)
def activate_sensor_node(
    node_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Administrator = Depends(get_current_admin),
):
    """Reactivate an inactive sensor node.

    Requires Administrator Authentication.
    """
    try:
        client_ip = request.client.host if request.client else None
        return NodeService.activate_node(
            db=db,
            node_id=node_id,
            actor=current_admin.email,
            ip_address=client_ip,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/{node_id}/audit", response_model=List[NodeAuditResponse])
def get_node_audit_trail(
    node_id: str,
    db: Session = Depends(get_db),
    _: Administrator = Depends(get_current_admin),
):
    """Fetch immutable security audit trail for a sensor node.

    Requires Administrator Authentication.
    """
    return NodeService.get_node_audit_logs(db=db, node_id=node_id)
