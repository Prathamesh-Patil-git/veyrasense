from fastapi.testclient import TestClient


def test_register_sensor_node(client: TestClient, auth_headers, test_department):
    """Verify sensor node registration with unique node_id."""
    response = client.post(
        "/api/v1/nodes",
        headers=auth_headers,
        json={
            "node_id": "TEST-NODE-01",
            "name": "Hydrostatic Sump Probe",
            "department_id": test_department.id,
            "hardware_type": "ESP32-WROOM-32",
            "firmware_version": "v1.0.4",
            "status": "healthy",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["node_id"] == "TEST-NODE-01"
    assert data["department_id"] == test_department.id
    assert data["is_active"] is True


def test_register_sensor_node_duplicate_rejection(client: TestClient, auth_headers, test_department):
    """Verify duplicate node_id is rejected with 400."""
    # Register first time
    client.post(
        "/api/v1/nodes",
        headers=auth_headers,
        json={
            "node_id": "TEST-DUPLICATE-01",
            "name": "Original Node",
            "department_id": test_department.id,
            "hardware_type": "ESP32",
            "firmware_version": "v1.0.0",
            "status": "healthy",
        },
    )

    # Register duplicate
    response = client.post(
        "/api/v1/nodes",
        headers=auth_headers,
        json={
            "node_id": "TEST-DUPLICATE-01",
            "name": "Duplicate Node",
            "department_id": test_department.id,
            "hardware_type": "ESP32",
            "firmware_version": "v1.0.0",
            "status": "healthy",
        },
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_list_sensor_nodes(client: TestClient, auth_headers):
    """Verify sensor node listing with admin token."""
    response = client.get("/api/v1/nodes", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_list_sensor_nodes_unauthorized(client: TestClient):
    """Verify sensor node listing without token returns 401."""
    response = client.get("/api/v1/nodes")
    assert response.status_code == 401
