from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models.administrator import Administrator
from app.api.routes.auth import get_current_admin
from app.services.sensor_profile_service import SensorProfileService
from app.schemas.sensor_profile import SensorProfileCreate, SensorProfileResponse

router = APIRouter(prefix="/sensor-profiles", tags=["Sensor Profiles"])


@router.get("", response_model=List[SensorProfileResponse])
def get_sensor_profiles(
    db: Session = Depends(get_db),
    _: Administrator = Depends(get_current_admin),
):
    """List supported sensor profiles and physical measurement definitions.

    Requires Administrator Authentication.
    """
    return SensorProfileService.list_profiles(db)


@router.post("", response_model=SensorProfileResponse, status_code=status.HTTP_201_CREATED)
def create_sensor_profile(
    data: SensorProfileCreate,
    db: Session = Depends(get_db),
    _: Administrator = Depends(get_current_admin),
):
    """Create a new sensor profile (Requires Administrator Authentication)."""
    try:
        return SensorProfileService.create_profile(db, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
