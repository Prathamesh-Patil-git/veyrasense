from fastapi.testclient import TestClient


def test_list_departments(client: TestClient, auth_headers, test_department):
    """Verify department listing returns active departments with node counters (Authorized)."""
    response = client.get("/api/v1/departments", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    names = [d["name"] for d in data]
    assert test_department.name in names


def test_list_departments_unauthorized(client: TestClient):
    """Verify department listing without token returns 401."""
    response = client.get("/api/v1/departments")
    assert response.status_code == 401


def test_create_department_authorized(client: TestClient, auth_headers):
    """Verify creating department with admin token."""
    response = client.post(
        "/api/v1/departments",
        headers=auth_headers,
        json={
            "name": "Robotics Packaging",
            "description": "High-speed packaging and pick-and-place lines",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Robotics Packaging"
    assert data["id"] is not None


def test_create_department_duplicate_name(client: TestClient, auth_headers, test_department):
    """Verify creating department with duplicate name returns 400."""
    response = client.post(
        "/api/v1/departments",
        headers=auth_headers,
        json={
            "name": test_department.name,
            "description": "Duplicate attempt",
        },
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_create_department_unauthorized(client: TestClient):
    """Verify creating department without token returns 401."""
    response = client.post(
        "/api/v1/departments",
        json={"name": "Unauthorized Dept", "description": "No auth"},
    )
    assert response.status_code == 401
