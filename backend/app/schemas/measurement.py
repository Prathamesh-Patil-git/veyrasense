from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class MeasurementBase(BaseModel):
    message_uid: str = Field(..., max_length=64)
    node_id: int
    sensor_id: Optional[int] = None
    measurement_type: str = Field(..., max_length=64)
    value: float
    unit: str = Field(..., max_length=32)
    measured_at: datetime
    quality: str = Field(default="good", max_length=32)
    source_type: str = Field(default="telemetry", max_length=32)


class MeasurementCreate(MeasurementBase):
    pass


class MeasurementResponse(MeasurementBase):
    id: int
    received_at: datetime
    node_identifier: Optional[str] = None
    department_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedMeasurementsResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[MeasurementResponse]
