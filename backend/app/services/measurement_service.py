from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.database.models.measurement import Measurement
from app.database.models.node import SensorNode
from app.database.models.department import Department
from app.schemas.measurement import (
    MeasurementCreate,
    MeasurementResponse,
    PaginatedMeasurementsResponse,
)


class MeasurementService:
    """Universal measurement ingestion and bounded paginated queries."""

    @staticmethod
    def ingest_measurement(db: Session, data: MeasurementCreate) -> Measurement:
        existing = db.scalar(
            select(Measurement).where(Measurement.message_uid == data.message_uid)
        )
        if existing:
            raise ValueError(f"Measurement with message_uid '{data.message_uid}' already recorded.")

        measurement = Measurement(
            message_uid=data.message_uid,
            node_id=data.node_id,
            sensor_id=data.sensor_id,
            measurement_type=data.measurement_type,
            value=data.value,
            unit=data.unit,
            measured_at=data.measured_at,
            quality=data.quality,
            source_type=data.source_type,
        )
        db.add(measurement)

        # Update node's last seen
        node = db.get(SensorNode, data.node_id)
        if node:
            node.last_seen_at = data.measured_at

        db.commit()
        db.refresh(measurement)
        return measurement

    @staticmethod
    def list_measurements(
        db: Session,
        node_id: Optional[int] = None,
        measurement_type: Optional[str] = None,
        from_time: Optional[datetime] = None,
        to_time: Optional[datetime] = None,
        quality: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> PaginatedMeasurementsResponse:
        # Bounded limit for Raspberry Pi 5 memory safety
        limit = min(max(1, limit), 100)
        offset = max(0, offset)

        stmt = select(
            Measurement,
            SensorNode.node_id.label("node_identifier"),
            Department.name.label("department_name"),
        ).join(
            SensorNode, Measurement.node_id == SensorNode.id
        ).join(
            Department, SensorNode.department_id == Department.id
        )

        if node_id is not None:
            stmt = stmt.where(Measurement.node_id == node_id)
        if measurement_type:
            stmt = stmt.where(Measurement.measurement_type == measurement_type)
        if from_time:
            stmt = stmt.where(Measurement.measured_at >= from_time)
        if to_time:
            stmt = stmt.where(Measurement.measured_at <= to_time)
        if quality:
            stmt = stmt.where(Measurement.quality == quality)

        # Total count
        count_stmt = select(func.count(Measurement.id))
        if node_id is not None:
            count_stmt = count_stmt.where(Measurement.node_id == node_id)
        if measurement_type:
            count_stmt = count_stmt.where(Measurement.measurement_type == measurement_type)
        total = db.scalar(count_stmt) or 0

        # Query items
        stmt = stmt.order_by(Measurement.measured_at.desc()).limit(limit).offset(offset)
        rows = db.execute(stmt).all()

        items: List[MeasurementResponse] = []
        for m, node_ident, dept_name in rows:
            resp = MeasurementResponse.model_validate(m)
            resp.node_identifier = node_ident
            resp.department_name = dept_name
            items.append(resp)

        return PaginatedMeasurementsResponse(
            total=total,
            limit=limit,
            offset=offset,
            items=items,
        )
