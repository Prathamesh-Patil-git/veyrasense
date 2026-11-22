from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.database.models.node import SensorNode


def test_dashboard_overview_endpoint(client: TestClient, auth_headers, test_department):
    """Verify /api/v1/dashboard/overview aggregates metrics dynamically (Authorized)."""
    response = client.get("/api/v1/dashboard/overview", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert "registered_nodes" in data
    assert "online_nodes" in data
    assert "active_investigations" in data
    assert "validated_recoveries" in data
    assert "network_health_percent" in data
    assert "metrics" in data
    assert len(data["metrics"]) == 4
    assert data["is_live_backend"] is True

    # Test filtering by specific department
    dept_resp = client.get(
        f"/api/v1/dashboard/overview?department_id={test_department.id}",
        headers=auth_headers,
    )
    assert dept_resp.status_code == 200
    dept_data = dept_resp.json()
    assert dept_data["active_department_name"] == test_department.name


def test_dashboard_overview_unauthorized(client: TestClient):
    """Verify dashboard overview without token returns 401."""
    response = client.get("/api/v1/dashboard/overview")
    assert response.status_code == 401


def test_dashboard_overview_registered_node_uses_registered_timestamp(
    client: TestClient,
    auth_headers,
    test_department,
    db_session: Session,
):
    """Activity timestamps fall back to registered_at when a node has no heartbeat yet."""
    registered_at = datetime(2025, 4, 6, 7, 8, 9, tzinfo=timezone.utc)
    node = SensorNode(
        node_id="NODE-DASHBOARD-TIME-01",
        name="Newly Registered Node",
        department_id=test_department.id,
        hardware_type="ESP32-WROOM-32",
        firmware_version="v1.4.2",
        status="offline",
        provisioning_status="pending",
        registered_at=registered_at,
        last_seen_at=None,
    )
    db_session.add(node)
    db_session.commit()

    response = client.get("/api/v1/dashboard/overview", headers=auth_headers)
    assert response.status_code == 200
    payload = response.json()
    activity = next(item for item in payload["recent_activity"] if item["node_id"] == node.node_id)
    telemetry = next(item for item in payload["recent_telemetry"] if item["id"] == node.node_id)

    assert activity["timestamp"] == "07:08:09"
    assert telemetry["last_received"] == "—"
