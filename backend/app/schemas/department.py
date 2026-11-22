from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DepartmentWithCountResponse(DepartmentResponse):
    node_count: int = 0
    online_count: int = 0
    health_percentage: float = 100.0
