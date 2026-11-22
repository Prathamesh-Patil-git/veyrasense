from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models.administrator import Administrator
from app.api.routes.auth import get_current_admin
from app.services.department_service import DepartmentService
from app.schemas.department import DepartmentCreate, DepartmentWithCountResponse, DepartmentResponse

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=List[DepartmentWithCountResponse])
def get_departments(
    active_only: bool = False,
    db: Session = Depends(get_db),
    _: Administrator = Depends(get_current_admin),
):
    """List all industrial departments with live node counts and health indicators.

    Requires Administrator Authentication.
    """
    return DepartmentService.list_departments(db, active_only=active_only)


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    _: Administrator = Depends(get_current_admin),
):
    """Create a new department (Requires Administrator Authentication)."""
    try:
        dept = DepartmentService.create_department(db, data)
        return dept
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
