from fastapi.testclient import TestClient
from app.core.security import hash_password, verify_password


def test_password_hashing():
    """Verify bcrypt hashing and verification."""
    raw = "IndustrialSecretPass2026!"
    hashed = hash_password(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_login_success(client: TestClient, test_admin):
    """Verify administrator login with valid credentials."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "test.admin@veyrasense.local", "password": "TestPassword123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in_seconds"] > 0


def test_login_invalid_password(client: TestClient, test_admin):
    """Verify login rejection with incorrect password."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "test.admin@veyrasense.local", "password": "IncorrectPassword123!"},
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]


def test_login_nonexistent_user(client: TestClient):
    """Verify login rejection with unknown email."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "unknown@domain.com", "password": "AnyPassword123!"},
    )
    assert response.status_code == 401


def test_get_current_admin_profile(client: TestClient, auth_headers):
    """Verify /api/v1/auth/me returns admin profile and never exposes password hash."""
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test.admin@veyrasense.local"
    assert data["full_name"] == "Test Administrator"
    assert "hashed_password" not in data
    assert "password" not in data


def test_unauthorized_access(client: TestClient):
    """Verify protected endpoints reject requests without Authorization header."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
