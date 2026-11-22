import math
from datetime import datetime, timedelta, timezone
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models.administrator import Administrator
from app.database.models.node import SensorNode
from app.database.models.sensor import Sensor
from app.database.models.measurement import Measurement
from app.api.routes.auth import get_current_admin
from app.core.device_auth import (
    IngestionAuthContext,
    get_ingestion_auth_context,
    enforce_node_authorization,
)
from app.services.measurement_service import MeasurementService
from app.schemas.measurement import (
    MeasurementCreate,
    MeasurementResponse,
    PaginatedMeasurementsResponse,
)

router = APIRouter(prefix="/measurements", tags=["Measurements"])


@router.get("", response_model=PaginatedMeasurementsResponse)
def get_measurements(
    node_id: Optional[int] = Query(None, description="Filter by integer node foreign key ID"),
    measurement_type: Optional[str] = Query(None, description="Filter by physical measurement type"),
    from_time: Optional[datetime] = Query(None, description="ISO timestamp start filter"),
    to_time: Optional[datetime] = Query(None, description="ISO timestamp end filter"),
    quality: Optional[str] = Query(None, description="Quality indicator filter (good, suspect, synthetic_recovery)"),
    environment: Literal["real", "demo"] = Query("real"),
    limit: int = Query(50, ge=1, le=100, description="Page limit (max 100 for edge memory bounds)"),
    offset: int = Query(0, ge=0, description="Offset cursor for pagination"),
    db: Session = Depends(get_db),
    _: Administrator = Depends(get_current_admin),
):
    """Query high-frequency universal sensor measurements with pagination and time filters.

    Requires Administrator Authentication.
    """
    return MeasurementService.list_measurements(
        db,
        node_id=node_id,
        measurement_type=measurement_type,
        from_time=from_time,
        to_time=to_time,
        quality=quality,
        environment=environment,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
def ingest_measurement(
    data: MeasurementCreate,
    db: Session = Depends(get_db),
    auth_context: IngestionAuthContext = Depends(get_ingestion_auth_context),
):
    """Ingest sensor telemetry measurement.

    Requires valid X-Device-Key or Administrator Bearer token.
    Validates finite values, timestamp skew, cross-node sensor integrity,
    and idempotency via unique message_uid.
    """
    # 1. Enforce device authorization (Device A cannot submit for Device B)
    enforce_node_authorization(auth_context, data.node_id)

    # 2. Validate numeric value is finite
    if math.isnan(data.value) or math.isinf(data.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Measurement value must be a finite numerical quantity (NaN and Infinity are rejected).",
        )

    # 3. Validate timestamp within reasonable clock skew bounds
    now = datetime.now(timezone.utc)
    measured_dt = data.measured_at if data.measured_at.tzinfo else data.measured_at.replace(tzinfo=timezone.utc)
    if measured_dt > now + timedelta(minutes=5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Measurement timestamp cannot be in the future (exceeds 5-minute clock skew threshold).",
        )
    if measured_dt < datetime(2020, 1, 1, tzinfo=timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Measurement timestamp is implausibly in the past (predates system epoch).",
        )

    # 4. Verify target node exists
    node = db.get(SensorNode, data.node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target sensor node ID {data.node_id} does not exist.",
        )
    if node.environment != "real":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="HTTP telemetry ingestion is reserved for real sensor nodes.")

    # 5. Cross-node validation: verify sensor belongs to target node
    if data.sensor_id is not None:
        sensor = db.get(Sensor, data.sensor_id)
        if not sensor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Referenced sensor ID {data.sensor_id} does not exist.",
            )
        if sensor.node_id != data.node_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cross-node validation failed: Sensor {data.sensor_id} belongs to node {sensor.node_id}, not node {data.node_id}.",
            )

    # 6. Check duplicate message_uid (Idempotency)
    existing_msg = db.query(Measurement).filter(Measurement.message_uid == data.message_uid).first()
    if existing_msg:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Measurement with message_uid '{data.message_uid}' has already been processed.",
        )

    try:
        meas = MeasurementService.ingest_measurement(db, data)
        # Update node heartbeat and provisioning state
        node.last_seen_at = now
        if node.provisioning_status == "pending":
            node.provisioning_status = "connected"
        db.commit()
        return meas
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
