"""Deterministic demo scenarios that adapt canonical MQTT telemetry into the shared processor."""
import json
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from app.database.models.department import Department
from app.database.models.measurement import Measurement
from app.database.models.node import SensorNode
from app.database.models.scenario_run import ScenarioRun
from app.database.models.research_record import ResearchRecord
from app.services.mqtt_service import MQTTIngestionService

SCENARIOS: dict[str, dict[str, Any]] = {
    "normal": {"name": "Normal operation", "fault": None, "hypotheses": {"sensor_fault": 0.02, "physical_event": 0.03, "communication_fault": 0.02, "environmental_disturbance": 0.03}, "expected": "healthy"},
    "temperature_spike": {"name": "Sudden temperature spike", "fault": "temperature spike", "hypotheses": {"sensor_fault": 0.55, "physical_event": 0.25, "communication_fault": 0.05, "environmental_disturbance": 0.15}, "expected": "spike anomaly"},
    "temperature_drop": {"name": "Sudden temperature drop", "fault": "temperature drop", "hypotheses": {"sensor_fault": 0.5, "physical_event": 0.3, "communication_fault": 0.05, "environmental_disturbance": 0.15}, "expected": "drop anomaly"},
    "stuck_sensor": {"name": "Stuck sensor", "fault": "constant temperature", "hypotheses": {"sensor_fault": 0.78, "physical_event": 0.08, "communication_fault": 0.08, "environmental_disturbance": 0.06}, "expected": "stuck reading"},
    "missing_telemetry": {"name": "Missing telemetry", "fault": "missing packet", "hypotheses": {"sensor_fault": 0.12, "physical_event": 0.04, "communication_fault": 0.76, "environmental_disturbance": 0.08}, "expected": "missing measurement"},
    "communication_interruption": {"name": "Communication interruption", "fault": "interrupted link", "hypotheses": {"sensor_fault": 0.05, "physical_event": 0.02, "communication_fault": 0.88, "environmental_disturbance": 0.05}, "expected": "communication interruption"},
    "gradual_drift": {"name": "Gradual sensor drift", "fault": "temperature drift", "hypotheses": {"sensor_fault": 0.72, "physical_event": 0.08, "communication_fault": 0.05, "environmental_disturbance": 0.15}, "expected": "drift anomaly"},
    "environmental_disturbance": {"name": "Environmental disturbance", "fault": "correlated heat and humidity change", "hypotheses": {"sensor_fault": 0.08, "physical_event": 0.22, "communication_fault": 0.04, "environmental_disturbance": 0.66}, "expected": "environmental event"},
    "genuine_physical_event": {"name": "Genuine physical event", "fault": "correlated temperature and gas change", "hypotheses": {"sensor_fault": 0.08, "physical_event": 0.72, "communication_fault": 0.04, "environmental_disturbance": 0.16}, "expected": "physical event"},
    "sensor_failure": {"name": "Sensor failure", "fault": "implausible out-of-range reading", "hypotheses": {"sensor_fault": 0.86, "physical_event": 0.04, "communication_fault": 0.06, "environmental_disturbance": 0.04}, "expected": "sensor failure"},
    "cross_sensor_inconsistency": {"name": "Cross-sensor inconsistency", "fault": "isolated temperature jump", "hypotheses": {"sensor_fault": 0.62, "physical_event": 0.16, "communication_fault": 0.06, "environmental_disturbance": 0.16}, "expected": "cross-sensor inconsistency"},
    "recovery_accepted": {"name": "Recovery accepted", "fault": "single missing reading with stable history", "hypotheses": {"sensor_fault": 0.42, "physical_event": 0.14, "communication_fault": 0.38, "environmental_disturbance": 0.06}, "expected": "recovery accepted"},
    "recovery_rejected": {"name": "Recovery rejected", "fault": "missing reading during rapid change", "hypotheses": {"sensor_fault": 0.36, "physical_event": 0.48, "communication_fault": 0.12, "environmental_disturbance": 0.04}, "expected": "recovery rejected"},
    "ambiguous_investigation": {"name": "Ambiguous fault requiring investigation", "fault": "temperature rise with mixed gas evidence", "hypotheses": {"sensor_fault": 0.34, "physical_event": 0.34, "communication_fault": 0.12, "environmental_disturbance": 0.20}, "expected": "investigation required"},
}


def scenario_list() -> list[dict[str, Any]]:
    return [{"id": key, **value, "duration_steps": 12, "environment": "demo"} for key, value in SCENARIOS.items()]


class ScenarioService:
    @staticmethod
    def start(db: Session, scenario_id: str, speed: int = 1) -> ScenarioRun:
        if scenario_id not in SCENARIOS:
            raise ValueError("Unknown demonstration scenario")
        if speed < 1 or speed > 10:
            raise ValueError("Simulation speed must be between 1 and 10")
        department = db.scalar(select(Department).order_by(Department.id).limit(1))
        if not department:
            raise ValueError("Create a department before starting a scenario")
        ground_truth = dict(SCENARIOS[scenario_id])
        if scenario_id == "recovery_accepted":
            ground_truth["expected_recovery_value"] = 23.9
        run = ScenarioRun(
            scenario_id=scenario_id, node_id="SIM-RUN-PENDING", status="running", speed=speed,
            ground_truth=json.dumps(ground_truth),
        )
        db.add(run)
        db.flush()
        run.node_id = f"SIM-RUN-{run.id:06d}"
        db.add(SensorNode(
            node_id=run.node_id, name=f"Demo: {SCENARIOS[scenario_id]['name']}",
            department_id=department.id, hardware_type="VeyraSense Simulator", firmware_version="scenario-engine",
            status="online", provisioning_status="connected", environment="demo", mqtt_username=None,
        ))
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def control(db: Session, run_id: int, command: str, speed: int | None = None) -> ScenarioRun:
        run = db.get(ScenarioRun, run_id)
        if not run or run.environment != "demo":
            raise ValueError("Scenario run not found")
        if command == "pause" and run.status == "running":
            run.status = "paused"
        elif command == "resume" and run.status == "paused":
            run.status = "running"
        elif command == "stop":
            run.status = "stopped"
        elif command in {"reset", "replay"}:
            db.execute(delete(ResearchRecord).where(ResearchRecord.environment == "demo", ResearchRecord.node_id == run.node_id))
            db.execute(delete(Measurement).where(Measurement.node_id == select(SensorNode.id).where(SensorNode.node_id == run.node_id).scalar_subquery(), Measurement.environment == "demo"))
            run.step_index = 0
            run.cycle += 1
            run.status = "running"
        elif command not in {"pause", "resume"}:
            raise ValueError("Unsupported scenario control")
        if speed is not None:
            if speed < 1 or speed > 10:
                raise ValueError("Simulation speed must be between 1 and 10")
            run.speed = speed
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def step(db: Session, run_id: int) -> dict[str, Any]:
        run = db.get(ScenarioRun, run_id)
        if not run or run.environment != "demo":
            raise ValueError("Scenario run not found")
        if run.status != "running":
            raise ValueError("Scenario run is not running")
        if run.step_index >= 12:
            run.status = "completed"
            db.commit()
            return ScenarioService.describe(run, db)
        spec = SCENARIOS[run.scenario_id]
        step = run.step_index
        temp = 24.0 + ((step % 4) - 1.5) * 0.2
        humidity, gas = 48.0, 110.0
        if 4 <= step <= 7:
            case = run.scenario_id
            if case == "temperature_spike": temp = 72.0
            elif case == "temperature_drop": temp = 2.0
            elif case == "stuck_sensor": temp = 24.4
            elif case == "gradual_drift": temp = 24.0 + (step - 3) * 2.4
            elif case == "environmental_disturbance": temp, humidity = 38.0, 75.0
            elif case == "genuine_physical_event": temp, gas = 36.0, 510.0
            elif case == "sensor_failure": temp = 180.0
            elif case == "cross_sensor_inconsistency": temp = 65.0
            elif case == "ambiguous_investigation": temp, gas = 34.0, 280.0
        if run.scenario_id == "recovery_rejected" and step in (2, 3, 4):
            temp = {2: 40.0, 3: 55.0, 4: 70.0}[step]
        if run.scenario_id == "stuck_sensor" and 4 <= step <= 9:
            temp = 24.4
        skip = run.scenario_id in {"missing_telemetry", "communication_interruption", "recovery_accepted", "recovery_rejected"} and step == 5
        run.step_index += 1
        if run.scenario_id == "communication_interruption" and 4 <= step <= 7:
            sensor_node = db.scalar(select(SensorNode).where(SensorNode.node_id == run.node_id))
            sensor_node.status = "offline"
            if step == 5:
                from app.services.research_service import ResearchService
                ResearchService.record_communication_event(db, run.node_id, "demo", "Simulated demo link interruption; no physical device was actuated.")
        else:
            if not skip:
                payload = json.dumps({"node_id": run.node_id, "sequence_num": run.id * 100000 + run.cycle * 100 + step, "sensors": {"temperature": temp, "humidity": humidity, "gas": gas}})
                topic = f"veyrasense/nodes/{run.node_id}/telemetry"
                result = MQTTIngestionService.process_telemetry_message(db, topic, payload, environment="demo")
                if result["status"] != "accepted":
                    raise ValueError(f"Demo telemetry rejected by shared processor: {result['detail']}")
            elif run.scenario_id in {"missing_telemetry", "recovery_accepted", "recovery_rejected"}:
                from app.services.research_service import ResearchService
                ResearchService.record_scenario_event(db, run.node_id, "missing_telemetry", "Scheduled demonstration sample was omitted; original stored telemetry remains unchanged.")
                if run.scenario_id in {"recovery_accepted", "recovery_rejected"}:
                    ResearchService.handle_missing_measurement(db, run.node_id, run.scenario_id)
        if run.step_index >= 12:
            run.status = "completed"
        db.commit()
        return ScenarioService.describe(run, db)

    @staticmethod
    def describe(run: ScenarioRun, db: Session | None = None) -> dict[str, Any]:
        result = {"id": run.id, "scenario_id": run.scenario_id, "node_id": run.node_id, "environment": "demo", "status": run.status, "step_index": run.step_index, "duration_steps": 12, "speed": run.speed, "expected": json.loads(run.ground_truth), "started_at": run.started_at, "updated_at": run.updated_at}
        if db is not None:
            records = db.scalars(select(ResearchRecord).where(ResearchRecord.environment == "demo", ResearchRecord.node_id == run.node_id).order_by(ResearchRecord.id)).all()
            by_type: dict[str, list[dict[str, Any]]] = {}
            for record in records: by_type.setdefault(record.record_type, []).append(json.loads(record.payload))
            result["actual"] = {
                "detected_anomalies": [kind for row in by_type.get("anomaly", []) for kind in row.get("anomaly_types", [])],
                "hypotheses": [row.get("selected") for row in by_type.get("hypothesis_analysis", [])],
                "recovery_decisions": [row.get("decision") for row in by_type.get("recovery_validation", [])],
                "trusted_measurements": len(by_type.get("trusted_measurement", [])),
                "evidence_records": len(by_type.get("evidence", [])),
            }
        return result

    @staticmethod
    def runs(db: Session, limit: int = 50) -> list[dict[str, Any]]:
        rows = db.scalars(select(ScenarioRun).where(ScenarioRun.environment == "demo").order_by(ScenarioRun.started_at.desc()).limit(min(max(limit, 1), 100))).all()
        return [ScenarioService.describe(run, db) for run in rows]
