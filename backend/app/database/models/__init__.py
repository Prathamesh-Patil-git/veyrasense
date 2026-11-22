"""Database Models Registry."""
from app.database.models.department import Department
from app.database.models.node import SensorNode
from app.database.models.sensor_profile import SensorProfile
from app.database.models.sensor import Sensor
from app.database.models.measurement import Measurement
from app.database.models.administrator import Administrator
from app.database.models.revoked_token import RevokedToken
from app.database.models.audit_log import AuditLog
from app.database.models.scenario_run import ScenarioRun
from app.database.models.research_record import ResearchRecord

__all__ = [
    "Department",
    "SensorNode",
    "SensorProfile",
    "Sensor",
    "Measurement",
    "Administrator",
    "RevokedToken",
    "AuditLog",
    "ScenarioRun",
    "ResearchRecord",
]
