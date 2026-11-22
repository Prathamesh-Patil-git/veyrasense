from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class MetricSummary(BaseModel):
    label: str
    value: float | int | str
    unit: str
    change: str
    change_type: str  # positive, neutral, negative
    timeframe: str
    accent: str  # slate, mint, yellow, blue
    is_demo: bool = False
    sparkline: List[float] = []


class RecentTelemetryItem(BaseModel):
    id: str  # node_id
    sensor_type: str
    department_id: int | str
    department_name: str
    latest_measurement: float | str
    unit: str
    health_status: str  # healthy, warning, alert, offline, calibrating
    last_received: str
    variance_score: float = 0.0
    confidence_level: float = 99.4


class ActivityEventItem(BaseModel):
    id: str
    timestamp: str
    node_id: str
    event_type: str
    message: str
    severity: str  # info, success, warning, alert
    department_id: int | str


class DashboardOverviewResponse(BaseModel):
    registered_nodes: int
    online_nodes: int
    active_investigations: int
    validated_recoveries: int
    network_health_percent: float
    communication_health_percent: float
    measurement_quality_percent: float
    sensor_fault_count: int
    active_department_name: str
    active_department_id: int | str
    metrics: List[MetricSummary]
    recent_telemetry: List[RecentTelemetryItem]
    recent_activity: List[ActivityEventItem]
    server_time: datetime
    is_live_backend: bool = True
