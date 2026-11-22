"""Services Registry."""
from app.services.auth_service import AuthService
from app.services.department_service import DepartmentService
from app.services.node_service import NodeService
from app.services.sensor_profile_service import SensorProfileService
from app.services.measurement_service import MeasurementService
from app.services.dashboard_service import DashboardService

__all__ = [
    "AuthService",
    "DepartmentService",
    "NodeService",
    "SensorProfileService",
    "MeasurementService",
    "DashboardService",
]
