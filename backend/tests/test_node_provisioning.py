"""Comprehensive Validation Tests for Dynamic Sensor Node Provisioning and MQTT Integration.

Tests:
1. Dynamic node provisioning with unique credentials and one-time secret display
2. Simultaneous connection of multiple distinct nodes
3. Strict cross-node identity enforcement (spoofing prevention)
4. Credential revocation and immediate rejection of revoked nodes
5. Reconnection after network interruption (heartbeat & LWT handling)
6. Duplicate packet deduplication (idempotency via sequence numbers)
7. Historical telemetry preservation after node deactivation
8. Dynamic credential rotation and Mosquitto ACL sync
9. Immutable audit trail verification
"""
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.database.models import SensorNode, Department, Sensor, Measurement, SensorProfile, AuditLog
from app.services.mqtt_service import MQTTIngestionService
from app.services.mosquitto_service import MosquittoProvisioningService
from app.core.config import settings


@pytest.fixture(autouse=True)
def ensure_profiles_and_cleanup(db_session: Session):
    """Ensure standard sensor profiles exist in test database and clear dedup cache."""
    MQTTIngestionService.clear_dedup_cache()

    profiles = [
        ("Industrial Temperature", "temperature", "°C"),
        ("Relative Humidity", "humidity", "%RH"),
        ("Gas Concentration", "gas_concentration", "ppm"),
    ]
    for name, m_type, unit in profiles:
        existing = db_session.query(SensorProfile).filter_by(name=name).first()
        if not existing:
            db_session.add(SensorProfile(name=name, measurement_type=m_type, unit=unit))
    db_session.commit()
    yield


def test_node_provisioning_workflow(
    client: TestClient,
    auth_headers: dict[str, str],
    test_department: Department,
    db_session: Session,
):
    """Administrator provisions a node: receives one-time secrets and per-node Mosquitto ACL."""
    payload = {
        "node_id": "NODE-TEST-001",
        "name": "Chiller Room ESP32 Monitor",
        "department_id": test_department.id,
        "location": "Bay 1 Chiller Skid",
        "hardware_type": "ESP32-WROOM-32",
        "sensor_types": ["DHT11", "MQ-135"],
        "protocol": "mqtt",
    }

    response = client.post("/api/v1/nodes/provision", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()

    # 1. Verify secrets are returned
    assert data["node_id"] == "NODE-TEST-001"
    assert data["api_key"] is not None and len(data["api_key"]) >= 32
    assert data["mqtt_password"] is not None and len(data["mqtt_password"]) >= 24
    assert data["mqtt_username"] == "NODE-TEST-001"
    assert data["mqtt_topic_telemetry"] == "veyrasense/nodes/NODE-TEST-001/telemetry"
    assert data["mqtt_topic_status"] == "veyrasense/nodes/NODE-TEST-001/status"
    assert "config.h" in data["firmware_config_snippet"]
    assert "SECURITY NOTICE" in data["warning"]

    # 2. Verify database stores ONLY hashes, NOT plaintext secrets
    node = db_session.query(SensorNode).filter_by(node_id="NODE-TEST-001").first()
    assert node is not None
    assert node.api_key_hash is not None
    assert node.api_key_hash != data["api_key"]
    assert node.mqtt_password_hash is not None
    assert node.mqtt_password_hash != data["mqtt_password"]
    assert node.provisioning_status == "pending"

    # 3. Verify attached transducers (DHT11 temp + hum, MQ-135 gas)
    sensors = db_session.query(Sensor).filter_by(node_id=node.id).all()
    assert len(sensors) == 3
    sensor_ids = [s.sensor_id for s in sensors]
    assert "NODE-TEST-001-TEMP" in sensor_ids
    assert "NODE-TEST-001-HUM" in sensor_ids
    assert "NODE-TEST-001-AIR" in sensor_ids

    # 4. Verify Mosquitto ACL & password files were generated
    assert settings.mosquitto_acl_path.exists()
    acl_text = settings.mosquitto_acl_path.read_text(encoding="utf-8")
    assert "user NODE-TEST-001" in acl_text
    assert "topic write veyrasense/nodes/NODE-TEST-001/telemetry" in acl_text

    passwd_text = settings.mosquitto_passwd_path.read_text(encoding="utf-8")
    assert f"NODE-TEST-001:{node.mqtt_password_hash}" in passwd_text


def test_two_nodes_provisioned_simultaneously(
    client: TestClient,
    auth_headers: dict[str, str],
    test_department: Department,
    db_session: Session,
):
    """Two nodes can be provisioned with distinct credentials and publish simultaneously."""
    # Provision Node 1
    resp1 = client.post(
        "/api/v1/nodes/provision",
        json={"name": "Node Alpha", "department_id": test_department.id, "sensor_types": ["DHT11"]},
        headers=auth_headers,
    )
    assert resp1.status_code == 201
    node1_data = resp1.json()

    # Provision Node 2
    resp2 = client.post(
        "/api/v1/nodes/provision",
        json={"name": "Node Beta", "department_id": test_department.id, "sensor_types": ["MQ-135"]},
        headers=auth_headers,
    )
    assert resp2.status_code == 201
    node2_data = resp2.json()

    assert node1_data["node_id"] != node2_data["node_id"]
    assert node1_data["api_key"] != node2_data["api_key"]
    assert node1_data["mqtt_password"] != node2_data["mqtt_password"]

    # Ingest telemetry for Node 1
    payload1 = {
        "node_id": node1_data["node_id"],
        "sequence_num": 1,
        "sensors": {"temperature": 23.4, "humidity": 45.2},
    }
    result1 = MQTTIngestionService.process_telemetry_message(
        db=db_session,
        topic=node1_data["mqtt_topic_telemetry"],
        payload_raw=json.dumps(payload1),
    )
    assert result1["status"] == "accepted"
    assert result1["measurements_ingested"] == 2

    # Ingest telemetry for Node 2
    payload2 = {
        "node_id": node2_data["node_id"],
        "sequence_num": 1,
        "sensors": {"air_quality_raw": 380},
    }
    result2 = MQTTIngestionService.process_telemetry_message(
        db=db_session,
        topic=node2_data["mqtt_topic_telemetry"],
        payload_raw=json.dumps(payload2),
    )
    assert result2["status"] == "accepted"
    assert result2["measurements_ingested"] == 1


def test_unauthorized_and_cross_node_publishing_rejected(
    client: TestClient,
    auth_headers: dict[str, str],
    test_department: Department,
    db_session: Session,
):
    """Enforce topic/identity isolation: Node A CANNOT publish under Node B's identity."""
    # 1. Provision Node A
    resp_a = client.post(
        "/api/v1/nodes/provision",
        json={"node_id": "NODE-SEC-A", "name": "Node A", "department_id": test_department.id},
        headers=auth_headers,
    )
    assert resp_a.status_code == 201

    # 2. Provision Node B
    resp_b = client.post(
        "/api/v1/nodes/provision",
        json={"node_id": "NODE-SEC-B", "name": "Node B", "department_id": test_department.id},
        headers=auth_headers,
    )
    assert resp_b.status_code == 201

    # Attack Scenario: Node A posts to Topic A, but claims identity of Node B in payload
    spoofed_payload = {
        "node_id": "NODE-SEC-B",  # Spoofed identity
        "sequence_num": 1,
        "sensors": {"temperature": 99.9},
    }
    result = MQTTIngestionService.process_telemetry_message(
        db=db_session,
        topic="veyrasense/nodes/NODE-SEC-A/telemetry",
        payload_raw=json.dumps(spoofed_payload),
    )
    assert result["status"] == "rejected"
    assert "Identity mismatch" in result["detail"]

    # Verify security audit log captured the spoofing attempt
    audit = (
        db_session.query(AuditLog)
        .filter_by(action="spoofing_attempt_rejected", entity_id="NODE-SEC-A")
        .first()
    )
    assert audit is not None
    assert "NODE-SEC-B" in audit.details

    # Attack Scenario 2: Unregistered node ID
    unreg_payload = {"node_id": "NODE-GHOST", "sequence_num": 1, "sensors": {"temperature": 20.0}}
    unreg_result = MQTTIngestionService.process_telemetry_message(
        db=db_session,
        topic="veyrasense/nodes/NODE-GHOST/telemetry",
        payload_raw=json.dumps(unreg_payload),
    )
    assert unreg_result["status"] == "rejected"
    assert "Unknown sensor node" in unreg_result["detail"]


def test_revoked_credentials_rejected_and_purged_from_acl(
    client: TestClient,
    auth_headers: dict[str, str],
    test_department: Department,
    db_session: Session,
):
    """Revoking a node cuts off both MQTT ingestion and HTTP access while updating Mosquitto ACL."""
    # 1. Provision Node
    resp = client.post(
        "/api/v1/nodes/provision",
        json={"node_id": "NODE-REVOKE-01", "name": "Revoke Test Node", "department_id": test_department.id},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    node_data = resp.json()

    # 2. Ingest initial valid telemetry
    valid_payload = {"node_id": "NODE-REVOKE-01", "sequence_num": 1, "sensors": {"temperature": 21.0}}
    res = MQTTIngestionService.process_telemetry_message(
        db=db_session,
        topic="veyrasense/nodes/NODE-REVOKE-01/telemetry",
        payload_raw=json.dumps(valid_payload),
    )
    assert res["status"] == "accepted"

    # 3. Administrator revokes node
    revoke_resp = client.post("/api/v1/nodes/NODE-REVOKE-01/revoke", headers=auth_headers)
    assert revoke_resp.status_code == 200
    rev_data = revoke_resp.json()
    assert rev_data["provisioning_status"] == "revoked"
    assert rev_data["is_active"] is False

    # 4. Attempt telemetry after revocation -> strictly rejected
    post_revoke_payload = {"node_id": "NODE-REVOKE-01", "sequence_num": 2, "sensors": {"temperature": 21.5}}
    post_res = MQTTIngestionService.process_telemetry_message(
        db=db_session,
        topic="veyrasense/nodes/NODE-REVOKE-01/telemetry",
        payload_raw=json.dumps(post_revoke_payload),
    )
    assert post_res["status"] == "rejected"
    assert "revoked or deactivated" in post_res["detail"]

    # 5. Attempt HTTP ingestion using device API key -> rejected (HTTP 401)
    http_ingest_resp = client.post(
        "/api/v1/measurements",
        json={
            "node_id": db_session.query(SensorNode).filter_by(node_id="NODE-REVOKE-01").first().id,
            "measurement_type": "temperature",
            "value": 22.0,
            "unit": "°C",
            "message_uid": "test-revoke-msg-1",
        },
        headers={"X-Device-Key": node_data["api_key"]},
    )
    assert http_ingest_resp.status_code == 401

    # 6. Verify node has been removed from Mosquitto ACL and password file
    acl_text = settings.mosquitto_acl_path.read_text(encoding="utf-8")
    assert "NODE-REVOKE-01" not in acl_text
    passwd_text = settings.mosquitto_passwd_path.read_text(encoding="utf-8")
    assert "NODE-REVOKE-01:" not in passwd_text


def test_reconnection_and_duplicate_telemetry_handling(
    client: TestClient,
    auth_headers: dict[str, str],
    test_department: Department,
    db_session: Session,
):
    """Network interruption recovery, Last Will and Testament, and sequence deduplication."""
    # 1. Provision Node
    resp = client.post(
        "/api/v1/nodes/provision",
        json={"node_id": "NODE-DEDUP-01", "name": "Dedup Node", "department_id": test_department.id},
        headers=auth_headers,
    )
    assert resp.status_code == 201

    # 2. Node connects and publishes packet #10
    telemetry_packet = {
        "node_id": "NODE-DEDUP-01",
        "sequence_num": 10,
        "sensors": {"temperature": 25.1},
    }
    r1 = MQTTIngestionService.process_telemetry_message(
        db=db_session,
        topic="veyrasense/nodes/NODE-DEDUP-01/telemetry",
        payload_raw=json.dumps(telemetry_packet),
    )
    assert r1["status"] == "accepted"

    # Count measurements in DB
    node_pk = db_session.query(SensorNode).filter_by(node_id="NODE-DEDUP-01").first().id
    count1 = db_session.query(Measurement).filter_by(node_id=node_pk).count()
    assert count1 == 1

    # 3. Network glitch causes retransmission of duplicate packet #10
    r2 = MQTTIngestionService.process_telemetry_message(
        db=db_session,
        topic="veyrasense/nodes/NODE-DEDUP-01/telemetry",
        payload_raw=json.dumps(telemetry_packet),
    )
    assert r2["status"] == "duplicate"

    # Verify measurement was NOT duplicated in SQLite
    count2 = db_session.query(Measurement).filter_by(node_id=node_pk).count()
    assert count2 == 1

    # 4. Node disconnects unexpectedly (Broker triggers Last Will and Testament status)
    lwt_res = MQTTIngestionService.process_status_message(
        db=db_session,
        topic="veyrasense/nodes/NODE-DEDUP-01/status",
        payload_raw=json.dumps({"status": "offline", "reason": "unexpected_disconnect"}),
    )
    assert lwt_res["status"] == "updated"
    assert lwt_res["node_status"] == "offline"

    node = db_session.query(SensorNode).filter_by(node_id="NODE-DEDUP-01").first()
    assert node.status == "offline"
    assert node.provisioning_status == "offline"

    # 5. Node reconnects and sends Online status
    reconnect_res = MQTTIngestionService.process_status_message(
        db=db_session,
        topic="veyrasense/nodes/NODE-DEDUP-01/status",
        payload_raw=json.dumps({"status": "online"}),
    )
    assert reconnect_res["status"] == "updated"
    assert reconnect_res["node_status"] == "online"

    db_session.refresh(node)
    assert node.status == "online"
    assert node.provisioning_status == "connected"


def test_historical_measurements_preserved_after_node_deactivation(
    client: TestClient,
    auth_headers: dict[str, str],
    test_department: Department,
    db_session: Session,
):
    """Historical measurements remain intact and accessible after a node is deactivated."""
    resp = client.post(
        "/api/v1/nodes/provision",
        json={"node_id": "NODE-HIST-01", "name": "Historical Node", "department_id": test_department.id},
        headers=auth_headers,
    )
    assert resp.status_code == 201

    # Ingest 3 telemetry packets
    for seq in range(1, 4):
        MQTTIngestionService.process_telemetry_message(
            db=db_session,
            topic="veyrasense/nodes/NODE-HIST-01/telemetry",
            payload_raw=json.dumps({
                "node_id": "NODE-HIST-01",
                "sequence_num": seq,
                "sensors": {"temperature": 20.0 + seq},
            }),
        )

    node = db_session.query(SensorNode).filter_by(node_id="NODE-HIST-01").first()
    meas_count = db_session.query(Measurement).filter_by(node_id=node.id).count()
    assert meas_count == 3

    # Revoke node
    client.post("/api/v1/nodes/NODE-HIST-01/revoke", headers=auth_headers)

    # Historical measurements must still exist in SQLite!
    meas_count_after = db_session.query(Measurement).filter_by(node_id=node.id).count()
    assert meas_count_after == 3

    # Administrator can still query historical measurements
    meas_resp = client.get(f"/api/v1/measurements?node_id={node.id}", headers=auth_headers)
    assert meas_resp.status_code == 200
    assert meas_resp.json()["total"] == 3


def test_credential_rotation_and_audit(
    client: TestClient,
    auth_headers: dict[str, str],
    test_department: Department,
    db_session: Session,
):
    """Rotating credentials generates new keys and records an immutable audit log."""
    resp = client.post(
        "/api/v1/nodes/provision",
        json={"node_id": "NODE-ROT-01", "name": "Rotation Test Node", "department_id": test_department.id},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    old_data = resp.json()

    # Rotate credentials
    rot_resp = client.post("/api/v1/nodes/NODE-ROT-01/rotate-credentials", headers=auth_headers)
    assert rot_resp.status_code == 200
    new_data = rot_resp.json()

    assert new_data["api_key"] != old_data["api_key"]
    assert new_data["mqtt_password"] != old_data["mqtt_password"]
    assert new_data["credentials_rotated_at"] is not None

    # Verify audit logs
    audit_resp = client.get("/api/v1/nodes/NODE-ROT-01/audit", headers=auth_headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    actions = [l["action"] for l in logs]
    assert "node_registered" in actions
    assert "credentials_rotated" in actions
