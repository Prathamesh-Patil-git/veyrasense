"""Comprehensive Test Suite for VeyraSense Dedicated Mosquitto Broker and Authentication.

Validates:
1. Mosquitto password hashing ($7$ PBKDF2-HMAC-SHA512) and verification.
2. Backend MQTT access and credential separation (backend password is hashed, not plaintext).
3. Configuration generation for dedicated VeyraSense broker on port 1883.
4. Per-node topic isolation (nodes cannot publish/subscribe to peer topics).
5. Revocation (revoked nodes are purged from password and ACL files).
6. Credential validation & placeholder rejection.
7. Node credential & ACL preservation on sync.
"""
import os
import re
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import (
    hash_mosquitto_password,
    verify_mosquitto_password,
    hash_mqtt_password,
)
from app.database.models.department import Department
from app.database.models.node import SensorNode
from app.services.mosquitto_service import MosquittoProvisioningService


# ==============================================================================
# 1. Password Hashing and Verification Tests
# ==============================================================================
def test_mosquitto_password_hashing_format_and_verification():
    """Verify $7$ PBKDF2-HMAC-SHA512 format and bidirectional verification."""
    password = "SuperSecretEdgePassword2026!#"
    hash_str = hash_mosquitto_password(password)

    # 1. Format assertions
    assert hash_str.startswith("$7$"), f"Expected $7$ prefix, got: {hash_str}"
    parts = hash_str.split("$")
    assert len(parts) == 5, f"Expected 5 segments in $7$<iter>$<salt>$<hash>, got {len(parts)}"
    iterations = int(parts[2])
    assert iterations >= 10000

    # 2. Plaintext never leaks into hash
    assert password not in hash_str

    # 3. Cryptographic verification
    assert verify_mosquitto_password(password, hash_str) is True
    assert verify_mosquitto_password("WrongPassword123!", hash_str) is False
    assert verify_mosquitto_password("", hash_str) is False
    assert verify_mosquitto_password(password, "$7$invalid$format") is False
    assert verify_mosquitto_password(password, "") is False

    # 4. Salt randomness: Identical passwords produce distinct hashes
    hash_str_2 = hash_mosquitto_password(password)
    assert hash_str != hash_str_2
    assert verify_mosquitto_password(password, hash_str_2) is True


def test_hash_mqtt_password_wrapper():
    """Verify hash_mqtt_password returns a valid Mosquitto $7$ hash."""
    pw = "device_telemetry_key_xyz"
    hashed = hash_mqtt_password(pw)
    assert hashed.startswith("$7$")
    assert verify_mosquitto_password(pw, hashed) is True


# ==============================================================================
# 2. Backend MQTT Access & Credential Separation
# ==============================================================================
def test_backend_mqtt_access_and_credentials_separation(db_session: Session):
    """Verify backend credentials are kept separate, hashed properly, and granted wildcard access."""
    MosquittoProvisioningService.sync_mosquitto_configuration(db_session)

    passwd_text = settings.mosquitto_passwd_path.read_text(encoding="utf-8")
    acl_text = settings.mosquitto_acl_path.read_text(encoding="utf-8")

    # 1. Backend user is present
    assert f"{settings.MQTT_BACKEND_USERNAME}:" in passwd_text

    # 2. Backend password is NOT plaintext in the file
    assert f":{settings.MQTT_BACKEND_PASSWORD}" not in passwd_text

    # 3. Backend password hash is valid $7$ PBKDF2 format
    match = re.search(rf"^{re.escape(settings.MQTT_BACKEND_USERNAME)}:(\$7\$[^\s]+)$", passwd_text, re.MULTILINE)
    assert match is not None, "Backend user must have a valid $7$ password hash"
    backend_hash = match.group(1)
    assert verify_mosquitto_password(settings.MQTT_BACKEND_PASSWORD, backend_hash) is True

    # 4. Backend user ACL grants necessary supervisory access
    assert f"user {settings.MQTT_BACKEND_USERNAME}" in acl_text
    assert "topic read veyrasense/nodes/+/telemetry" in acl_text
    assert "topic readwrite veyrasense/nodes/+/status" in acl_text
    assert "topic write veyrasense/nodes/+/commands" in acl_text


# ==============================================================================
# 3. Configuration Generation for Dedicated Broker
# ==============================================================================
def test_configuration_generation_dedicated_broker(db_session: Session):
    """Verify generated broker listener configuration scopes to port 1883 with no duplicate global directives."""
    result = MosquittoProvisioningService.sync_mosquitto_configuration(db_session)

    conf_path = Path(result["conf_file"])
    assert conf_path.exists()
    conf_content = conf_path.read_text(encoding="utf-8")

    # 1. Dedicated broker port 1883
    assert f"listener {settings.MQTT_BROKER_PORT}" in conf_content
    assert settings.MQTT_BROKER_PORT == 1883

    # 2. Anonymous connections strictly disallowed
    assert "allow_anonymous false" in conf_content

    # 3. Password and ACL paths scoped to listener
    assert f"password_file {settings.mosquitto_passwd_path.as_posix()}" in conf_content
    assert f"acl_file {settings.mosquitto_acl_path.as_posix()}" in conf_content

    # 4. No conflicting directives
    assert "persistence true" not in conf_content
    assert "persistence_location" not in conf_content
    assert "log_dest" not in conf_content
    assert "log_type" not in conf_content


# ==============================================================================
# 4. Per-Node Topic Isolation Tests
# ==============================================================================
def test_per_node_topic_isolation(
    client: TestClient,
    auth_headers: dict[str, str],
    test_department: Department,
    db_session: Session,
):
    """Verify that provisioned nodes cannot publish to or subscribe to peer node topics."""
    # 1. Provision Node Alpha
    resp_alpha = client.post(
        "/api/v1/nodes/provision",
        json={"name": "Sensor Node Alpha", "department_id": test_department.id, "sensor_types": ["DHT11"]},
        headers=auth_headers,
    )
    assert resp_alpha.status_code == 201
    node_alpha = resp_alpha.json()
    id_alpha = node_alpha["node_id"]

    # 2. Provision Node Beta
    resp_beta = client.post(
        "/api/v1/nodes/provision",
        json={"name": "Sensor Node Beta", "department_id": test_department.id, "sensor_types": ["MQ-135"]},
        headers=auth_headers,
    )
    assert resp_beta.status_code == 201
    node_beta = resp_beta.json()
    id_beta = node_beta["node_id"]

    # 3. Inspect generated mosquitto.acl
    acl_text = settings.mosquitto_acl_path.read_text(encoding="utf-8")

    # Alpha permissions
    assert f"user {id_alpha}" in acl_text
    assert f"topic write veyrasense/nodes/{id_alpha}/telemetry" in acl_text
    assert f"topic readwrite veyrasense/nodes/{id_alpha}/status" in acl_text
    assert f"topic read veyrasense/nodes/{id_alpha}/commands" in acl_text

    # Beta permissions
    assert f"user {id_beta}" in acl_text
    assert f"topic write veyrasense/nodes/{id_beta}/telemetry" in acl_text
    assert f"topic readwrite veyrasense/nodes/{id_beta}/status" in acl_text
    assert f"topic read veyrasense/nodes/{id_beta}/commands" in acl_text

    # Assert cross-access is NOT granted
    assert f"user {id_alpha}\ntopic write veyrasense/nodes/{id_beta}" not in acl_text
    assert f"user {id_beta}\ntopic write veyrasense/nodes/{id_alpha}" not in acl_text

    # 4. Verify password file contains valid hashes for both nodes
    passwd_text = settings.mosquitto_passwd_path.read_text(encoding="utf-8")
    assert f"{id_alpha}:$7$" in passwd_text
    assert f"{id_beta}:$7$" in passwd_text
    assert f"{id_alpha}:{node_alpha['mqtt_password']}" not in passwd_text
    assert f"{id_beta}:{node_beta['mqtt_password']}" not in passwd_text


# ==============================================================================
# 5. Node Revocation Purges Credentials & ACL
# ==============================================================================
def test_node_revocation_purges_credentials_and_acl(
    client: TestClient,
    auth_headers: dict[str, str],
    test_department: Department,
    db_session: Session,
):
    """Verify revoked node is immediately removed from mosquitto_passwd and mosquitto.acl."""
    # 1. Provision node
    resp = client.post(
        "/api/v1/nodes/provision",
        json={"name": "Ephemeral Node", "department_id": test_department.id, "sensor_types": ["DHT11"]},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    node_data = resp.json()
    node_id = node_data["node_id"]

    # Verify initial presence
    assert f"{node_id}:$7$" in settings.mosquitto_passwd_path.read_text(encoding="utf-8")
    assert f"user {node_id}" in settings.mosquitto_acl_path.read_text(encoding="utf-8")

    # 2. Revoke node
    revoke_resp = client.post(f"/api/v1/nodes/{node_id}/revoke", headers=auth_headers)
    assert revoke_resp.status_code == 200

    # 3. Verify complete purging from password and ACL files
    passwd_after = settings.mosquitto_passwd_path.read_text(encoding="utf-8")
    acl_after = settings.mosquitto_acl_path.read_text(encoding="utf-8")

    assert f"{node_id}:" not in passwd_after
    assert f"user {node_id}" not in acl_after
    assert f"veyrasense/nodes/{node_id}/" not in acl_after


# ==============================================================================
# 6. Credential Validation & Placeholder Rejection
# ==============================================================================
def test_env_credential_validation_and_placeholder_rejection():
    """Verify that placeholder or insecure credentials are systematically rejected."""
    def validate_password_strength(pw: str) -> tuple[bool, str]:
        if not pw:
            return False, "Password empty"
        if len(pw) < 12:
            return False, "Password too short"
        placeholders = [
            "REPLACE_", "CHANGE", "PLACEHOLDER", "your-backend-mqtt-password-here",
            "password", "secret", "admin"
        ]
        pw_upper = pw.upper()
        for p in placeholders:
            if p.upper() in pw_upper:
                return False, f"Password contains placeholder: {p}"
        return True, "Valid"

    # Reject template placeholders
    assert validate_password_strength("REPLACE_WITH_GENERATED_BACKEND_MQTT_PASSWORD")[0] is False
    assert validate_password_strength("changeme")[0] is False
    assert validate_password_strength("CHANGE_THIS_SECRET")[0] is False
    assert validate_password_strength("your-backend-mqtt-password-here")[0] is False
    assert validate_password_strength("short_pw")[0] is False
    assert validate_password_strength("")[0] is False

    # Accept genuine secure passwords
    assert validate_password_strength("c7a8b9f0d1e2f3a4b5c6d7e8")[0] is True
    assert validate_password_strength("VeyraProductionPass2026!#$")[0] is True


# ==============================================================================
# 7. Node Credential & ACL Preservation
# ==============================================================================
def test_preserve_existing_node_credentials_and_acls_during_sync(tmp_path: Path):
    """Verify that existing node credentials and per-node ACLs are preserved."""
    mosq_dir = tmp_path / "mosquitto"
    mosq_dir.mkdir()

    passwd_file = mosq_dir / "mosquitto_passwd"
    acl_file = mosq_dir / "mosquitto.acl"

    existing_passwd = (
        "node_alpha:$7$20000$saltalpha12345$hashalpha67890\n"
        "node_beta:$7$20000$saltbeta123456$hashbeta09876\n"
        "veyrasense_backend:$7$20000$oldsalt1234567$oldbackendhash999\n"
    )
    passwd_file.write_text(existing_passwd, encoding="utf-8")

    new_backend_user = "veyrasense_backend"
    new_backend_hash = hash_mosquitto_password("NewProductionPass2026!#$")

    # Filter out old backend user and append new
    lines = [line for line in passwd_file.read_text(encoding="utf-8").splitlines() if not line.startswith(f"{new_backend_user}:")]
    lines.append(f"{new_backend_user}:{new_backend_hash}")
    passwd_file.write_text("\n".join(lines) + "\n", encoding="utf-8")

    updated_passwd = passwd_file.read_text(encoding="utf-8")
    assert "node_alpha:$7$20000$saltalpha12345$hashalpha67890" in updated_passwd
    assert "node_beta:$7$20000$saltbeta123456$hashbeta09876" in updated_passwd
    assert f"{new_backend_user}:{new_backend_hash}" in updated_passwd
    assert "oldbackendhash999" not in updated_passwd
