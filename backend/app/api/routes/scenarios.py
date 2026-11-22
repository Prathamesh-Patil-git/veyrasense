from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api.routes.auth import get_current_admin
from app.database.connection import get_db
from app.database.models.administrator import Administrator
from app.services.scenario_service import ScenarioService, scenario_list

router = APIRouter(prefix="/scenarios", tags=["Demonstration Scenarios"])


class StartScenario(BaseModel):
    scenario_id: str
    speed: int = Field(default=1, ge=1, le=10)


class ScenarioControl(BaseModel):
    command: Literal["pause", "resume", "stop", "reset", "replay"]
    speed: Optional[int] = Field(default=None, ge=1, le=10)


@router.get("")
def list_scenarios(_: Administrator = Depends(get_current_admin)):
    return scenario_list()


@router.post("/runs")
def start_scenario(data: StartScenario, db: Session = Depends(get_db), _: Administrator = Depends(get_current_admin)):
    try:
        run = ScenarioService.start(db, data.scenario_id, data.speed)
        return ScenarioService.describe(run, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/runs")
def list_scenario_runs(limit: int = 50, db: Session = Depends(get_db), _: Administrator = Depends(get_current_admin)):
    return ScenarioService.runs(db, limit)


@router.get("/runs/{run_id}")
def get_scenario_run(run_id: int, db: Session = Depends(get_db), _: Administrator = Depends(get_current_admin)):
    from app.database.models.scenario_run import ScenarioRun
    run = db.get(ScenarioRun, run_id)
    if not run or run.environment != "demo":
        raise HTTPException(status_code=404, detail="Scenario run not found")
    return ScenarioService.describe(run, db)


@router.post("/runs/{run_id}/control")
def control_scenario(run_id: int, data: ScenarioControl, db: Session = Depends(get_db), _: Administrator = Depends(get_current_admin)):
    try:
        run = ScenarioService.control(db, run_id, data.command, data.speed)
        return ScenarioService.describe(run, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/runs/{run_id}/step")
def step_scenario(run_id: int, db: Session = Depends(get_db), _: Administrator = Depends(get_current_admin)):
    try:
        return ScenarioService.step(db, run_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
