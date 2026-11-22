from fastapi.testclient import TestClient


def test_create_and_list_sensor_profiles(client: TestClient, auth_headers):
    """Verify sensor profile creation and retrieval with admin credentials."""
    response = client.post(
        "/api/v1/sensor-profiles",
        headers=auth_headers,
        json={
            "name": "Optical Turbidity",
            "measurement_type": "turbidity",
            "unit": "NTU",
            "description": "Nephelometric turbidity units for water clarity",
            "default_minimum": 0.0,
            "default_maximum": 1000.0,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Optical Turbidity"
    assert data["measurement_type"] == "turbidity"
    assert data["unit"] == "NTU"

    # List profiles with auth
    list_resp = client.get("/api/v1/sensor-profiles", headers=auth_headers)
    assert list_resp.status_code == 200
    profiles = list_resp.json()
    assert any(p["name"] == "Optical Turbidity" for p in profiles)


def test_list_sensor_profiles_unauthorized(client: TestClient):
    """Verify listing sensor profiles without token returns 401."""
    response = client.get("/api/v1/sensor-profiles")
    assert response.status_code == 401
