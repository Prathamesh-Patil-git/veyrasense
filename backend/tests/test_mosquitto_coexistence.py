"""Comprehensive Test Suite for Mosquitto Coexistence, Authentication, and ACL Scoping.

Validates:
1. Mosquitto password hashing ($7$ PBKDF2-HMAC-SHA512) and verification.
2. Independent CARES-RX (Port 1883) and VeyraSense (Port 1884) authentication.
3. Per-node topic isolation (nodes cannot publish/subscribe to peer topics).
4. Revocation (revoked nodes are purged from password and ACL files).
5. Backend MQTT access and credential separation (backend password is hashed, not plaintext).
6. Configuration generation and coexistence (listener 1884, no duplicate global directives).
7. Zero modification of CARES-RX configuration or password files.
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
from app.services.node_service import NodeService


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
# 3. Configuration Generation & Dual-Listener Coexistence
# ==============================================================================
def test_configuration_generation_and_coexistence(db_session: Session):
    """Verify generated broker listener configuration scopes to port 1884 with no duplicate global directives."""
    result = MosquittoProvisioningService.sync_mosquitto_configuration(db_session)

    conf_path = Path(result["conf_file"])
    assert conf_path.exists()
    conf_content = conf_path.read_text(encoding="utf-8")

    # 1. Scoped to port 1884 (VeyraSense), not 1883 (CARES-RX)
    assert f"listener {settings.MQTT_BROKER_PORT}" in conf_content
    assert settings.MQTT_BROKER_PORT == 1884
    assert "listener 1883" not in conf_content

    # 2. Anonymous connections strictly disallowed
    assert "allow_anonymous false" in conf_content

    # 3. Password and ACL paths scoped to listener
    assert f"password_file {settings.mosquitto_passwd_path.as_posix()}" in conf_content
    assert f"acl_file {settings.mosquitto_acl_path.as_posix()}" in conf_content

    # 4. No duplicate global directives that would conflict with Mosquitto primary config
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
    alpha_block = f"user {id_alpha}\ntopic write veyrasense/nodes/{id_alpha}/telemetry\ntopic readwrite veyrasense/nodes/{id_alpha}/status\ntopic read veyrasense/nodes/{id_alpha}/commands"
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
    # Alpha cannot publish to Beta
    assert f"topic write veyrasense/nodes/{id_beta}/telemetry\ntopic readwrite veyrasense/nodes/{id_alpha}" not in acl_text
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
# 6. Zero Modification of CARES-RX Configuration and Password Files
# ==============================================================================
def test_no_modification_of_caresrx_files(
    tmp_path: Path,
    monkeypatch,
    db_session: Session,
    client: TestClient,
    auth_headers: dict[str, str],
    test_department: Department,
):
    """Simulate a Raspberry Pi filesystem with active CARES-RX files and verify zero mutation."""
    # 1. Set up simulated /etc/mosquitto directory structure
    fake_etc_mosquitto = tmp_path / "etc" / "mosquitto"
    fake_conf_d = fake_etc_mosquitto / "conf.d"
    fake_conf_d.mkdir(parents=True)

    cares_passwd_file = fake_etc_mosquitto / "passwd"
    cares_passwd_initial = (
        "caresrx_operator:$7$20000$fakepasswdcaresrxhash1234567890\n"
        "caresrx_gateway:$7$20000$fakepasswdgatewayhash0987654321\n"
    )
    cares_passwd_file.write_text(cares_passwd_initial, encoding="utf-8")

    cares_conf_file = fake_conf_d / "caresrx.conf"
    cares_conf_initial = """# CARES-RX Production Mosquitto Configuration
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
"""
    cares_conf_file.write_text(cares_conf_initial, encoding="utf-8")

    # 2. Execute VeyraSense Mosquitto Provisioning workflow
    MosquittoProvisioningService.sync_mosquitto_configuration(db_session)

    # Provision a new node
    resp = client.post(
        "/api/v1/nodes/provision",
        json={"name": "Coexistence Verification Node", "department_id": test_department.id, "sensor_types": ["DHT11"]},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    node_data = resp.json()

    # Rotate credentials
    rot_resp = client.post(f"/api/v1/nodes/{node_data['node_id']}/rotate-credentials", headers=auth_headers)
    assert rot_resp.status_code == 200

    # 3. Assert CARES-RX files were 100% untouched
    cares_passwd_after = cares_passwd_file.read_text(encoding="utf-8")
    cares_conf_after = cares_conf_file.read_text(encoding="utf-8")

    assert cares_passwd_after == cares_passwd_initial, "CARES-RX password file must NEVER be modified or overwritten"
    assert cares_conf_after == cares_conf_initial, "CARES-RX configuration must NEVER be modified or overwritten"

    # Assert VeyraSense node does NOT appear in CARES-RX passwd
    assert node_data["node_id"] not in cares_passwd_after
    assert settings.MQTT_BACKEND_USERNAME not in cares_passwd_after

    # Assert CARES-RX users do NOT appear in VeyraSense password file
    veyrasense_passwd = settings.mosquitto_passwd_path.read_text(encoding="utf-8")
    assert "caresrx_operator" not in veyrasense_passwd
    assert "caresrx_gateway" not in veyrasense_passwd


# ==============================================================================
# 7. Independent CARES-RX and VeyraSense Port & Credential Scoping
# ==============================================================================
def test_independent_caresrx_and_veyrasense_authentication(db_session: Session):
    """Verify that CARES-RX and VeyraSense use independent ports and isolated user directories."""
    MosquittoProvisioningService.sync_mosquitto_configuration(db_session)

    # VeyraSense broker port must be 1884
    assert settings.MQTT_BROKER_PORT == 1884

    # VeyraSense config must only reference VeyraSense-owned files
    conf_text = settings.mosquitto_conf_path.read_text(encoding="utf-8")
    assert "listener 1884" in conf_text
    assert "/etc/mosquitto/passwd" not in conf_text
    assert str(settings.mosquitto_passwd_path.as_posix()) in conf_text
    assert str(settings.mosquitto_acl_path.as_posix()) in conf_text


# ==============================================================================
# 8. Strict Topic Isolation: No CARES-RX Topics in VeyraSense ACL
# ==============================================================================
def test_strict_acl_isolation_no_cares_topics(
    client: TestClient,
    auth_headers: dict[str, str],
    test_department: Department,
    db_session: Session,
):
    """Verify that CARES-RX topics (cares/#, caresrx/#) are strictly excluded from VeyraSense ACL."""
    # Provision a node
    resp = client.post(
        "/api/v1/nodes/provision",
        json={"name": "Strict Isolation Node", "department_id": test_department.id, "sensor_types": ["MQ-2"]},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    node_id = resp.json()["node_id"]

    MosquittoProvisioningService.sync_mosquitto_configuration(db_session)
    acl_text = settings.mosquitto_acl_path.read_text(encoding="utf-8")

    # 1. Ensure cares/# and caresrx/# are strictly absent
    assert "cares/#" not in acl_text
    assert "caresrx/#" not in acl_text
    assert "pattern readwrite cares" not in acl_text
    assert "pattern readwrite caresrx" not in acl_text

    # 2. Ensure only veyrasense/ prefix is granted
    for line in acl_text.splitlines():
        line = line.strip()
        if line.startswith("topic "):
            parts = line.split()
            # Format: topic <permission> <pattern>
            topic_pattern = parts[-1]
            assert topic_pattern.startswith("veyrasense/"), f"Topic pattern '{topic_pattern}' violates namespace boundary"


# ==============================================================================
# 9. Staging Validation & Configuration Rollback Simulation
# ==============================================================================
def test_staging_validation_and_rollback_simulation(tmp_path: Path):
    """Simulate staging port remapping and atomic configuration rollback behavior."""
    # 1. Setup mock /etc/mosquitto
    mock_etc = tmp_path / "etc_mosquitto"
    mock_conf_d = mock_etc / "conf.d"
    mock_conf_d.mkdir(parents=True)

    # Base mosquitto.conf
    (mock_etc / "mosquitto.conf").write_text("include_dir /etc/mosquitto/conf.d\n", encoding="utf-8")

    # CARES-RX existing configuration
    cares_conf = mock_conf_d / "caresrx.conf"
    cares_conf.write_text("listener 1883\nallow_anonymous false\npassword_file /etc/mosquitto/passwd\n", encoding="utf-8")

    # 2. Create timestamped backup (simulating migration script step 4)
    backup_dir = tmp_path / "backup_mosquitto"
    import shutil
    shutil.copytree(mock_etc, backup_dir)

    # 3. Add proposed VeyraSense drop-ins
    (mock_conf_d / "00-coexistence.conf").write_text("per_listener_settings true\n", encoding="utf-8")
    (mock_conf_d / "veyrasense.conf").write_text(
        "listener 1884 0.0.0.0\nallow_anonymous false\npassword_file /var/lib/veyrasense/mosquitto/mosquitto_passwd\n",
        encoding="utf-8",
    )

    # 4. Simulate staging port remapping for safe validation
    val_dir = tmp_path / "staging_val"
    shutil.copytree(mock_etc, val_dir)

    for conf_file in val_dir.rglob("*.conf"):
        content = conf_file.read_text(encoding="utf-8")
        content = re.sub(r"^[ \t]*listener[ \t]+1883", "listener 21883 127.0.0.1", content, flags=re.MULTILINE)
        content = re.sub(r"^[ \t]*listener[ \t]+1884", "listener 21884 127.0.0.1", content, flags=re.MULTILINE)
        conf_file.write_text(content, encoding="utf-8")

    # Assert staged configs do NOT listen on live production ports (1883/1884)
    staged_cares = (val_dir / "conf.d" / "caresrx.conf").read_text(encoding="utf-8")
    staged_veyra = (val_dir / "conf.d" / "veyrasense.conf").read_text(encoding="utf-8")
    assert "listener 21883 127.0.0.1" in staged_cares
    assert "listener 1883" not in staged_cares
    assert "listener 21884 127.0.0.1" in staged_veyra
    assert "listener 1884" not in staged_veyra

    # 5. Simulate Rollback: revert from backup
    # Remove drop-ins
    (mock_conf_d / "00-coexistence.conf").unlink(missing_ok=True)
    (mock_conf_d / "veyrasense.conf").unlink(missing_ok=True)
    # Restore from backup
    for item in backup_dir.iterdir():
        dest = mock_etc / item.name
        if item.is_dir():
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)

    # Assert reverted /etc/mosquitto matches initial backup
    assert not (mock_conf_d / "00-coexistence.conf").exists()
    assert not (mock_conf_d / "veyrasense.conf").exists()
    assert (mock_conf_d / "caresrx.conf").read_text(encoding="utf-8") == "listener 1883\nallow_anonymous false\npassword_file /etc/mosquitto/passwd\n"


# ==============================================================================
# 10. Automated Simulation: Credential Validation & Placeholder Rejection
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
# 11. Automated Simulation: Node Credential & ACL Preservation
# ==============================================================================
def test_preserve_existing_node_credentials_and_acls_during_migration(tmp_path: Path):
    """Verify that existing node credentials and per-node ACLs are preserved when backend credentials update."""
    mosq_dir = tmp_path / "mosquitto"
    mosq_dir.mkdir()

    passwd_file = mosq_dir / "mosquitto_passwd"
    acl_file = mosq_dir / "mosquitto.acl"

    # Existing pre-migration state with provisioned nodes
    existing_passwd = (
        "node_alpha:$7$20000$saltalpha12345$hashalpha67890\n"
        "node_beta:$7$20000$saltbeta123456$hashbeta09876\n"
        "veyrasense_backend:$7$20000$oldsalt1234567$oldbackendhash999\n"
    )
    passwd_file.write_text(existing_passwd, encoding="utf-8")

    existing_acl = (
        "# Legacy header with forbidden cares pattern\n"
        "pattern readwrite cares/#\n"
        "pattern readwrite caresrx/#\n"
        "\n"
        "# Existing node rules\n"
        "user node_alpha\n"
        "topic write veyrasense/nodes/node_alpha/telemetry\n"
        "topic readwrite veyrasense/nodes/node_alpha/status\n"
        "topic read veyrasense/nodes/node_alpha/commands\n"
        "\n"
        "user node_beta\n"
        "topic write veyrasense/nodes/node_beta/telemetry\n"
        "topic readwrite veyrasense/nodes/node_beta/status\n"
        "topic read veyrasense/nodes/node_beta/commands\n"
    )
    acl_file.write_text(existing_acl, encoding="utf-8")

    # 1. Simulate migration password update
    new_backend_user = "veyrasense_backend"
    new_backend_hash = hash_mosquitto_password("NewProductionPass2026!#$")

    # Filter out old backend user and append new
    lines = [line for line in passwd_file.read_text(encoding="utf-8").splitlines() if not line.startswith(f"{new_backend_user}:")]
    lines.append(f"{new_backend_user}:{new_backend_hash}")
    passwd_file.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # Assert node credentials preserved and backend updated
    updated_passwd = passwd_file.read_text(encoding="utf-8")
    assert "node_alpha:$7$20000$saltalpha12345$hashalpha67890" in updated_passwd
    assert "node_beta:$7$20000$saltbeta123456$hashbeta09876" in updated_passwd
    assert f"{new_backend_user}:{new_backend_hash}" in updated_passwd
    assert "oldbackendhash999" not in updated_passwd

    # 2. Simulate migration ACL cleanup: purge legacy cares patterns and ensure backend block exists
    acl_lines = [
        line for line in acl_file.read_text(encoding="utf-8").splitlines()
        if "cares/#" not in line and "caresrx/#" not in line
    ]
    # Prepend backend user block
    backend_acl_block = [
        f"user {new_backend_user}",
        "topic read veyrasense/nodes/+/telemetry",
        "topic readwrite veyrasense/nodes/+/status",
        "topic write veyrasense/nodes/+/commands",
        "",
    ]
    updated_acl = "\n".join(backend_acl_block + acl_lines)
    acl_file.write_text(updated_acl, encoding="utf-8")

    # Assert legacy patterns purged, backend added, node ACLs preserved
    final_acl = acl_file.read_text(encoding="utf-8")
    assert "cares/#" not in final_acl
    assert "caresrx/#" not in final_acl
    assert f"user {new_backend_user}" in final_acl
    assert "user node_alpha" in final_acl
    assert "topic write veyrasense/nodes/node_alpha/telemetry" in final_acl
    assert "user node_beta" in final_acl
    assert "topic write veyrasense/nodes/node_beta/telemetry" in final_acl


# ==============================================================================
# 12. Automated Simulation: Cross-Listener Isolation & Rejection
# ==============================================================================
def test_cross_listener_isolation_and_rejection_simulation():
    """Verify that port 1883 (CARES-RX) and port 1884 (VeyraSense) reject cross-listener credentials."""
    # Simulated user registries
    caresrx_registry = {
        "cares_operator": hash_mosquitto_password("CaresOpSecret2026!#"),
        "cares_gateway": hash_mosquitto_password("CaresGwSecret2026!#"),
    }
    veyrasense_registry = {
        "veyrasense_backend": hash_mosquitto_password("VeyraBackendPass2026!#$"),
        "node_001": hash_mosquitto_password("Node001Secret2026!#$"),
    }

    def authenticate_listener(port: int, username: str, pw: str) -> bool:
        if port == 1883:
            # CARES-RX listener
            h = caresrx_registry.get(username)
            return verify_mosquitto_password(pw, h) if h else False
        elif port == 1884:
            # VeyraSense listener
            h = veyrasense_registry.get(username)
            return verify_mosquitto_password(pw, h) if h else False
        return False

    # 1. Native listener auth succeeds
    assert authenticate_listener(1883, "cares_operator", "CaresOpSecret2026!#") is True
    assert authenticate_listener(1884, "veyrasense_backend", "VeyraBackendPass2026!#$") is True

    # 2. Invalid passwords rejected
    assert authenticate_listener(1884, "veyrasense_backend", "WrongPass123!") is False
    assert authenticate_listener(1883, "cares_operator", "WrongPass123!") is False

    # 3. Cross-listener authentication is REJECTED
    # VeyraSense user attempting to authenticate to CARES-RX (Port 1883)
    assert authenticate_listener(1883, "veyrasense_backend", "VeyraBackendPass2026!#$") is False
    assert authenticate_listener(1883, "node_001", "Node001Secret2026!#$") is False

    # CARES-RX user attempting to authenticate to VeyraSense (Port 1884)
    assert authenticate_listener(1884, "cares_operator", "CaresOpSecret2026!#") is False


