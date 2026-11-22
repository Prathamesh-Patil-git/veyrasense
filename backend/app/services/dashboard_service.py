from datetime import datetime, timezone
import json
from typing import Optional, List
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session
from app.database.models.node import SensorNode
from app.database.models.department import Department
from app.database.models.measurement import Measurement
from app.database.models.research_record import ResearchRecord
from app.schemas.dashboard import (
    DashboardOverviewResponse,
    RecentTelemetryItem,
    ActivityEventItem,
    MetricSummary,
)


class DashboardService:
    """Aggregates platform metrics and telemetry summaries dynamically from SQLite."""

    @staticmethod
    def get_overview(
        db: Session,
        department_id: Optional[int] = None,
        environment: str = "real",
    ) -> DashboardOverviewResponse:
        dept_name = "All Departments"
        active_dept_id: int | str = "all"

        if department_id is not None:
            dept = db.get(Department, department_id)
            if dept:
                dept_name = dept.name
                active_dept_id = dept.id

        # Query node counts
        node_query = select(SensorNode)
        node_query = node_query.where(SensorNode.environment == environment)
        if department_id is not None:
            node_query = node_query.where(SensorNode.department_id == department_id)

        all_nodes = db.scalars(node_query).all()
        registered_nodes = len(all_nodes)
        online_nodes = sum(1 for n in all_nodes if n.status in ["online", "healthy"])
        investigation_query = select(ResearchRecord).join(SensorNode, ResearchRecord.node_id == SensorNode.node_id).where(
            ResearchRecord.environment == environment, ResearchRecord.record_type == "investigation",
            SensorNode.environment == environment,
        ).order_by(ResearchRecord.id.desc())
        if department_id is not None:
            investigation_query = investigation_query.where(SensorNode.department_id == department_id)
        investigation_rows = db.scalars(investigation_query).all()
        latest_cases: dict[tuple[str, int | None], ResearchRecord] = {}
        for row in investigation_rows:
            latest_cases.setdefault((row.node_id, row.related_record_id), row)
        investigations = sum(1 for row in latest_cases.values() if json.loads(row.payload).get("status") == "active")
        calibrating_nodes = sum(1 for n in all_nodes if n.status == "calibrating")

        # Count only recovery candidates that passed independent validation.
        recovery_query = select(ResearchRecord).join(SensorNode, ResearchRecord.node_id == SensorNode.node_id).where(
            ResearchRecord.record_type == "recovery_validation", ResearchRecord.environment == environment,
            SensorNode.environment == environment,
        )
        if department_id is not None:
            recovery_query = recovery_query.where(SensorNode.department_id == department_id)
        validated_recoveries = sum(1 for row in db.scalars(recovery_query).all() if json.loads(row.payload).get("decision") == "accepted")
        hypothesis_query = select(ResearchRecord).join(SensorNode, ResearchRecord.node_id == SensorNode.node_id).where(
            ResearchRecord.environment == environment, ResearchRecord.record_type == "hypothesis_analysis",
            SensorNode.environment == environment,
        )
        if department_id is not None:
            hypothesis_query = hypothesis_query.where(SensorNode.department_id == department_id)
        sensor_fault_count = sum(1 for row in db.scalars(hypothesis_query).all() if json.loads(row.payload).get("selected") == "sensor_fault")

        # Health calculations
        network_health = (
            round((online_nodes / registered_nodes) * 100, 1)
            if registered_nodes > 0
            else 100.0
        )
        comm_health = network_health
        measurement_total = db.scalar(select(func.count(Measurement.id)).where(Measurement.environment == environment)) or 0
        good_measurements = db.scalar(select(func.count(Measurement.id)).where(Measurement.environment == environment, Measurement.quality == "good")) or 0
        quality_score = round(good_measurements / measurement_total * 100, 1) if measurement_total else 0.0

        # Build Primary Metric Cards
        metrics: List[MetricSummary] = [
            MetricSummary(
                label="Registered Sensor Nodes",
                value=registered_nodes,
                unit="nodes",
                change="Active Edge Fleet",
                change_type="neutral",
                timeframe="locally registered",
                accent="slate",
                sparkline=[],
            ),
            MetricSummary(
                label="Online Nodes",
                value=online_nodes,
                unit="nodes",
                change=f"{network_health}% operational",
                change_type="positive" if network_health >= 90 else "neutral",
                timeframe="current node status",
                accent="mint",
                sparkline=[],
            ),
            MetricSummary(
                label="Active Investigations",
                value=investigations,
                unit="cases",
                change="All nodes normal" if investigations == 0 else f"{investigations} require attention",
                change_type="positive" if investigations == 0 else "negative",
                timeframe="pending evidence",
                accent="yellow",
                sparkline=[],
            ),
            MetricSummary(
                label="Validated Recoveries",
                value=validated_recoveries,
                unit="points",
                change="Independently validated",
                change_type="positive" if validated_recoveries else "neutral",
                timeframe="accepted recovery candidates",
                accent="blue",
                sparkline=[],
            ),
        ]

        # Recent Telemetry Items
        recent_telemetry: List[RecentTelemetryItem] = []
        for n in all_nodes[:16]:
            # Fetch latest measurement for this node if available
            latest_m = db.scalar(
                select(Measurement)
                .where(Measurement.node_id == n.id)
                .where(Measurement.environment == environment)
                .order_by(Measurement.measured_at.desc())
                .limit(1)
            )

            # Map department name
            node_dept = db.get(Department, n.department_id)
            department_label = node_dept.name if node_dept else "Unknown"

            last_rec = (
                latest_m.measured_at.strftime("%Y-%m-%d %H:%M:%S")
                if latest_m and latest_m.measured_at
                else (n.last_seen_at.strftime("%Y-%m-%d %H:%M:%S") if n.last_seen_at else "—")
            )

            recent_telemetry.append(
                RecentTelemetryItem(
                    id=n.node_id,
                    sensor_type=n.hardware_type,
                    department_id=n.department_id,
                    department_name=department_label,
                    latest_measurement=latest_m.value if latest_m else "—",
                    unit=latest_m.unit if latest_m else "",
                    health_status=n.status,
                    last_received=last_rec,
                )
            )

        # Recent activity events (derived from real nodes)
        recent_activity: List[ActivityEventItem] = []
        for idx, n in enumerate(all_nodes[:6]):
            event_ts = (
                n.last_seen_at.strftime("%H:%M:%S")
                if n.last_seen_at
                else (n.registered_at.strftime("%H:%M:%S") if n.registered_at else "—")
            )
            recent_activity.append(
                ActivityEventItem(
                    id=f"evt-{n.id}-{idx}",
                    timestamp=event_ts,
                    node_id=n.node_id,
                    event_type="Heartbeat Received" if n.last_seen_at else "Node Registered",
                    message=f"Node {n.name} ({n.node_id}) status: {n.status.upper()}",
                    severity="success" if n.status in ["online", "healthy"] else "warning",
                    department_id=n.department_id,
                )
            )

        return DashboardOverviewResponse(
            registered_nodes=registered_nodes,
            online_nodes=online_nodes,
            active_investigations=investigations,
            validated_recoveries=validated_recoveries,
            network_health_percent=network_health,
            communication_health_percent=comm_health,
            measurement_quality_percent=quality_score,
            sensor_fault_count=sensor_fault_count,
            active_department_name=dept_name,
            active_department_id=active_dept_id,
            metrics=metrics,
            recent_telemetry=recent_telemetry,
            recent_activity=recent_activity,
            server_time=datetime.now(timezone.utc),
            is_live_backend=True,
            environment=environment,
        )
