from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class SensorProfileBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    measurement_type: str = Field(..., min_length=2, max_length=64)
    unit: str = Field(..., min_length=1, max_length=32)
    description: Optional[str] = Field(None, max_length=255)
    default_minimum: Optional[float] = None
    default_maximum: Optional[float] = None


class SensorProfileCreate(SensorProfileBase):
    pass


class SensorProfileResponse(SensorProfileBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
