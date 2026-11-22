from typing import Literal, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.routes.auth import get_current_admin
from app.database.connection import get_db
from app.database.models.administrator import Administrator
from app.services.research_service import ResearchService

router = APIRouter(prefix="/research", tags=["Research Analysis"])


@router.get("/records")
def list_research_records(
    environment: Literal["real", "demo"] = Query("real"),
    record_type: Optional[str] = Query(None),
    node_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: Administrator = Depends(get_current_admin),
):
    return ResearchService.list_records(db, environment, record_type, node_id, limit)


@router.get("/summary")
def get_research_summary(environment: Literal["real", "demo"] = Query("real"), db: Session = Depends(get_db), _: Administrator = Depends(get_current_admin)):
    return ResearchService.summary(db, environment)
