import pytest
from app.database.models.measurement import Measurement
from app.database.models.node import SensorNode
from app.services.scenario_service import ScenarioService, scenario_list
from app.services.research_service import ResearchService


def test_catalog_has_fourteen_reproducible_scenarios():
    items = scenario_list()
    assert len(items) >= 14
    assert all(item["environment"] == "demo" and item["duration_steps"] == 12 for item in items)
    assert all(len(item["hypotheses"]) == 4 for item in items)


def test_run_controls_and_shared_ingestion_are_demo_scoped(db_session, test_department):
    run = ScenarioService.start(db_session, "temperature_spike", speed=2)
    assert run.environment == "demo" and run.status == "running"
    for _ in range(5):
        state = ScenarioService.step(db_session, run.id)
    assert state["step_index"] == 5
    node = db_session.query(SensorNode).filter_by(node_id=run.node_id).one()
    records = db_session.query(Measurement).filter_by(environment="demo", node_id=node.id).all()
    assert len(records) == 15
    assert all(item.environment == "demo" and item.node_id == node.id for item in records)

    paused = ScenarioService.control(db_session, run.id, "pause")
    assert paused.status == "paused"
    with pytest.raises(ValueError):
        ScenarioService.step(db_session, run.id)
    resumed = ScenarioService.control(db_session, run.id, "resume")
    assert resumed.status == "running"
    reset = ScenarioService.control(db_session, run.id, "reset")
    assert reset.step_index == 0 and reset.cycle == 1
    assert db_session.query(Measurement).filter_by(environment="demo", node_id=node.id).count() == 0


def test_completed_scenario_exposes_only_computed_evaluation_metrics(db_session, test_department):
    run = ScenarioService.start(db_session, "normal")
    for _ in range(12):
        ScenarioService.step(db_session, run.id)
    evaluation = ResearchService.summary(db_session, "demo")["evaluation"]
    assert evaluation["labelled_completed_scenarios"] >= 1
    assert evaluation["data_availability"] == 1.0
    assert evaluation["anomaly_precision"] == 0.0
    assert evaluation["recovery_prediction_error"] is None
    assert evaluation["label_source"] == "completed demonstration scenario ground truth"
