"""Pydantic schemas registry."""
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    AdminResponse,
    PasswordResetRequest,
)
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    DepartmentWithCountResponse,
)
from app.schemas.node import (
    NodeCreate,
    NodeUpdate,
    NodeResponse,
)
from app.schemas.sensor_profile import (
    SensorProfileCreate,
    SensorProfileResponse,
)
from app.schemas.measurement import (
    MeasurementCreate,
    MeasurementResponse,
    PaginatedMeasurementsResponse,
)
from app.schemas.dashboard import (
    DashboardOverviewResponse,
    RecentTelemetryItem,
    ActivityEventItem,
    MetricSummary,
)

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "AdminResponse",
    "PasswordResetRequest",
    "DepartmentCreate",
    "DepartmentUpdate",
    "DepartmentResponse",
    "DepartmentWithCountResponse",
    "NodeCreate",
    "NodeUpdate",
    "NodeResponse",
    "SensorProfileCreate",
    "SensorProfileResponse",
    "MeasurementCreate",
    "MeasurementResponse",
    "PaginatedMeasurementsResponse",
    "DashboardOverviewResponse",
    "RecentTelemetryItem",
    "ActivityEventItem",
    "MetricSummary",
]
