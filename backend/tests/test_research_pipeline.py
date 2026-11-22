import json
from datetime import datetime, timezone
from app.database.models.node import SensorNode
from app.database.models.measurement import Measurement
from app.database.models.research_record import ResearchRecord
from app.database.models.sensor import Sensor
from app.database.models.sensor_profile import SensorProfile
from app.services.mqtt_service import MQTTIngestionService
from app.services.scenario_service import ScenarioService


def test_anomaly_hypothesis_evidence_recovery_and_trust_are_persisted(db_session, test_department):
    node = SensorNode(node_id="REAL-RESEARCH-01", name="Research node", department_id=test_department.id,
        hardware_type="ESP32", firmware_version="test", environment="real", status="online", provisioning_status="connected")
    db_session.add(node)
    db_session.commit()
    MQTTIngestionService.clear_dedup_cache()
    topic = f"veyrasense/nodes/{node.node_id}/telemetry"
    for seq in range(1, 7):
        value = 180 if seq == 6 else 24.0 + (seq % 2) * 0.1
        packet = json.dumps({"node_id": node.node_id, "sequence_num": seq, "sensors": {"temperature": value, "humidity": 45, "gas": 100}})
        assert MQTTIngestionService.process_telemetry_message(db_session, topic, packet)["status"] == "accepted"
    rows = db_session.query(ResearchRecord).filter_by(node_id=node.node_id, environment="real").all()
    types = {row.record_type for row in rows}
    assert {"anomaly", "hypothesis_analysis", "evidence", "response_fingerprint", "recovery_candidate", "recovery_validation", "trusted_measurement"} <= types
    anomaly = next(row for row in rows if row.record_type == "anomaly")
    analysis = next(row for row in rows if row.record_type == "hypothesis_analysis" and row.related_record_id == anomaly.id)
    assert len(json.loads(analysis.payload)["hypotheses"]) == 4
    assert db_session.query(Measurement).filter_by(node_id=node.id, value=180).count() == 1


def test_scenario_missing_reading_runs_independent_recovery_validation(db_session, test_department):
    run = ScenarioService.start(db_session, "recovery_accepted")
    for _ in range(6):
        ScenarioService.step(db_session, run.id)
    results = db_session.query(ResearchRecord).filter_by(node_id=run.node_id, environment="demo", record_type="recovery_validation").all()
    assert results
    assert json.loads(results[-1].payload)["decision"] == "accepted"
    trusted = db_session.query(ResearchRecord).filter_by(node_id=run.node_id, record_type="trusted_measurement").all()
    assert any(json.loads(item.payload).get("recovered_value") is not None for item in trusted)


def test_rapid_pre_gap_change_rejects_recovery_candidate(db_session, test_department):
    run = ScenarioService.start(db_session, "recovery_rejected")
    for _ in range(6):
        ScenarioService.step(db_session, run.id)
    results = db_session.query(ResearchRecord).filter_by(node_id=run.node_id, environment="demo", record_type="recovery_validation").all()
    assert results and json.loads(results[-1].payload)["decision"] == "rejected"
    rejected_validation = results[-1]
    assert not db_session.query(ResearchRecord).filter_by(node_id=run.node_id, record_type="trusted_measurement", related_record_id=rejected_validation.id).count()


def test_related_sensor_recovery_requires_matching_configured_location_type_and_unit(db_session, test_department):
    profile = SensorProfile(name="Research Temperature", measurement_type="temperature", unit="C", default_minimum=-40, default_maximum=125)
    db_session.add(profile)
    db_session.flush()
    source = SensorNode(node_id="REAL-RELATED-SOURCE", name="Source", department_id=test_department.id, hardware_type="ESP32", firmware_version="test", environment="real", status="online", provisioning_status="connected")
    related_a = SensorNode(node_id="REAL-RELATED-A", name="Related A", department_id=test_department.id, hardware_type="ESP32", firmware_version="test", environment="real", status="online", provisioning_status="connected")
    related_b = SensorNode(node_id="REAL-RELATED-B", name="Related B", department_id=test_department.id, hardware_type="ESP32", firmware_version="test", environment="real", status="online", provisioning_status="connected")
    db_session.add_all([source, related_a, related_b])
    db_session.flush()
    sensors = [Sensor(sensor_id=f"{node.node_id}-TEMP", node_id=node.id, profile_id=profile.id, name="Temperature", location_description="Research chamber bay A", is_active=True) for node in (source, related_a, related_b)]
    db_session.add_all(sensors)
    db_session.flush()
    for ix, sensor in enumerate(sensors[1:], 1):
        db_session.add(Measurement(message_uid=f"related-temp-{ix}", node_id=sensor.node_id, sensor_id=sensor.id,
            measurement_type="temperature", value=24.0 + ix * 0.2, unit="C",
            measured_at=datetime.now(timezone.utc), environment="real"))
    db_session.commit()
    MQTTIngestionService.clear_dedup_cache()
    payload = json.dumps({"node_id": source.node_id, "sequence_num": 9101, "sensors": {"temperature": 180}})
    assert MQTTIngestionService.process_telemetry_message(db_session, f"veyrasense/nodes/{source.node_id}/telemetry", payload)["status"] == "accepted"
    candidate = db_session.query(ResearchRecord).filter_by(node_id=source.node_id, record_type="recovery_candidate").one()
    assert json.loads(candidate.payload)["strategy"] == "related_sensor_median"
    validation = db_session.query(ResearchRecord).filter_by(node_id=source.node_id, record_type="recovery_validation").one()
    assert json.loads(validation.payload)["decision"] == "accepted"
