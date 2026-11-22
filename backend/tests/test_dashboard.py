from fastapi.testclient import TestClient


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
