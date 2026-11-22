from typing import Optional, Literal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models.administrator import Administrator
from app.api.routes.auth import get_current_admin
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import DashboardOverviewResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    department_id: Optional[int] = Query(None, description="Filter metrics and nodes by department ID"),
    environment: Literal["real", "demo"] = Query("real"),
    db: Session = Depends(get_db),
    _: Administrator = Depends(get_current_admin),
):
    """Calculate and return operational dashboard metrics, telemetry, and activity logs.

    Requires Administrator Authentication.
    """
    return DashboardService.get_overview(db, department_id=department_id, environment=environment)
