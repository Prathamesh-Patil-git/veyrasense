from datetime import datetime, timezone
from fastapi.testclient import TestClient


def test_measurement_ingestion_and_pagination(client: TestClient, auth_headers, test_department):
    """Verify universal measurement persistence, pagination, and deduplication."""
    # Register node
    node_resp = client.post(
        "/api/v1/nodes",
        headers=auth_headers,
        json={
            "node_id": "TEST-MEAS-NODE-01",
            "name": "High-Pressure Hydraulic Pipe",
            "department_id": test_department.id,
            "hardware_type": "ESP32",
            "firmware_version": "v1.0.0",
            "status": "healthy",
        },
    )
    assert node_resp.status_code == 201
    node_id = node_resp.json()["id"]

    now = datetime.now(timezone.utc).isoformat()

    # Ingest measurement with Admin token
    meas_resp = client.post(
        "/api/v1/measurements",
        headers=auth_headers,
        json={
            "message_uid": "msg-test-uid-001",
            "node_id": node_id,
            "measurement_type": "hydraulic_pressure",
            "value": 142.8,
            "unit": "bar",
            "measured_at": now,
            "quality": "good",
            "source_type": "telemetry",
        },
    )
    assert meas_resp.status_code == 201
    data = meas_resp.json()
    assert data["message_uid"] == "msg-test-uid-001"
    assert data["value"] == 142.8

    # Duplicate message_uid rejection returns 409 Conflict
    dup_resp = client.post(
        "/api/v1/measurements",
        headers=auth_headers,
        json={
            "message_uid": "msg-test-uid-001",
            "node_id": node_id,
            "measurement_type": "hydraulic_pressure",
            "value": 142.8,
            "unit": "bar",
            "measured_at": now,
            "quality": "good",
            "source_type": "telemetry",
        },
    )
    assert dup_resp.status_code == 409
    assert "already been processed" in dup_resp.json()["detail"]

    # Query paginated measurements with auth
    list_resp = client.get(
        f"/api/v1/measurements?node_id={node_id}&limit=10&offset=0",
        headers=auth_headers,
    )
    assert list_resp.status_code == 200
    paged = list_resp.json()
    assert paged["total"] >= 1
    assert len(paged["items"]) >= 1
    assert paged["items"][0]["message_uid"] == "msg-test-uid-001"


def test_measurements_unauthorized_access(client: TestClient):
    """Verify unauthorized telemetry queries and ingestion without credentials are rejected."""
    # Unauthorized listing
    list_resp = client.get("/api/v1/measurements")
    assert list_resp.status_code == 401

    # Unauthorized ingestion
    ingest_resp = client.post(
        "/api/v1/measurements",
        json={
            "message_uid": "anon-msg-001",
            "node_id": 1,
            "measurement_type": "voltage",
            "value": 3.3,
            "unit": "V",
            "measured_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert ingest_resp.status_code == 401
