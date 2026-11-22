import json
from datetime import datetime, timezone

from app.database.models.node import SensorNode
from app.database.models.measurement import Measurement
from app.services.mqtt_service import MQTTIngestionService


def _node(db_session, department_id, node_id, environment):
    node = SensorNode(
        node_id=node_id, name=node_id, department_id=department_id,
        hardware_type="ESP32-WROOM-32", firmware_version="test", status="online",
        provisioning_status="connected", environment=environment,
    )
    db_session.add(node)
    db_session.commit()
    db_session.refresh(node)
    return node


def test_node_and_dashboard_queries_are_environment_scoped(client, auth_headers, test_department, db_session):
    from app.services.dashboard_service import DashboardService
    before_real = DashboardService.get_overview(db_session, environment="real").registered_nodes
    before_demo = DashboardService.get_overview(db_session, environment="demo").registered_nodes
    real_node = _node(db_session, test_department.id, "REAL-ENV-01", "real")
    demo_node = _node(db_session, test_department.id, "DEMO-ENV-01", "demo")

    real_nodes = client.get("/api/v1/nodes?environment=real", headers=auth_headers)
    demo_nodes = client.get("/api/v1/nodes?environment=demo", headers=auth_headers)
    assert "REAL-ENV-01" in {node["node_id"] for node in real_nodes.json()}
    assert "DEMO-ENV-01" not in {node["node_id"] for node in real_nodes.json()}
    assert "DEMO-ENV-01" in {node["node_id"] for node in demo_nodes.json()}
    assert "REAL-ENV-01" not in {node["node_id"] for node in demo_nodes.json()}

    real_overview = client.get("/api/v1/dashboard/overview?environment=real", headers=auth_headers).json()
    demo_overview = client.get("/api/v1/dashboard/overview?environment=demo", headers=auth_headers).json()
    assert real_overview["environment"] == "real" and real_overview["registered_nodes"] == before_real + 1
    assert demo_overview["environment"] == "demo" and demo_overview["registered_nodes"] == before_demo + 1


def test_mqtt_environment_is_explicit_and_measurements_stay_separate(db_session, test_department):
    node = _node(db_session, test_department.id, "DEMO-MQTT-01", "demo")
    topic = "veyrasense/nodes/DEMO-MQTT-01/telemetry"
    payload = json.dumps({"node_id": node.node_id, "sequence_num": 991, "sensors": {"temperature": 25.5}})

    MQTTIngestionService.clear_dedup_cache()
    assert MQTTIngestionService.process_telemetry_message(db_session, topic, payload)["status"] == "rejected"
    accepted = MQTTIngestionService.process_telemetry_message(db_session, topic, payload, environment="demo")
    assert accepted["status"] == "accepted"
    records = db_session.query(Measurement).filter_by(node_id=node.id).all()
    assert len(records) == 1 and records[0].environment == "demo"


def test_measurement_list_defaults_to_real_and_can_query_demo(client, auth_headers, test_department, db_session):
    node = _node(db_session, test_department.id, "DEMO-MEAS-01", "demo")
    db_session.add(Measurement(
        message_uid="demo-measurement-001", node_id=node.id, measurement_type="temperature",
        value=22.0, unit="C", measured_at=datetime.now(timezone.utc), environment="demo",
    ))
    db_session.commit()
    assert client.get(f"/api/v1/measurements?node_id={node.id}", headers=auth_headers).json()["total"] == 0
    demo = client.get(f"/api/v1/measurements?node_id={node.id}&environment=demo", headers=auth_headers).json()
    assert demo["total"] == 1 and demo["items"][0]["environment"] == "demo"


def test_http_ingestion_rejects_demo_node(client, auth_headers, test_department, db_session):
    node = _node(db_session, test_department.id, "DEMO-HTTP-01", "demo")
    payload = {
        "message_uid": "demo-http-ingest-001", "node_id": node.id,
        "measurement_type": "temperature", "value": 24.5, "unit": "C",
        "measured_at": datetime.now(timezone.utc).isoformat(),
    }
    response = client.post("/api/v1/measurements", headers=auth_headers, json=payload)
    assert response.status_code == 400
    assert "reserved for real" in response.json()["detail"]
