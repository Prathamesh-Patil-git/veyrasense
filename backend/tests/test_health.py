from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test root metadata endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "VeyraSense API"
    assert "version" in data
    assert "health_endpoint" in data
    assert "Raspberry Pi 5" in data["hardware_target"]


def test_health_endpoint_minimal_disclosure(client: TestClient):
    """Test /api/v1/health exposes minimal public information without leaking database internals."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "version" in data
    assert "timestamp" in data
    # Ensure zero sensitive database internals leaked
    assert "database" not in data
    assert "db_path" not in data
    assert "engine" not in data
