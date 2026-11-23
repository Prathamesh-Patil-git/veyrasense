from app.database.models.node import SensorNode
from app.core.config import settings
from app.api.routes.auth import get_current_admin
from app.api.routes.nodes import router
from app.services.node_service import NodeService


def test_revoked_node_gets_one_time_mqtt_credentials_and_is_reactivated(
    db_session, test_department, monkeypatch
):
    node = SensorNode(
        node_id="NODE-01",
        name="VeyraSense Sensor Node 01",
        department_id=test_department.id,
        hardware_type="ESP32-WROOM-32",
        firmware_version="v1.4.2",
        status="offline",
        provisioning_status="revoked",
        environment="real",
        is_active=False,
        api_key_hash="existing-api-key-hash",
        mqtt_username="NODE-01",
        mqtt_password_hash="$7$previous-one-way-hash",
    )
    db_session.add(node)
    db_session.commit()
    monkeypatch.setattr(settings, "MQTT_DEVICE_BROKER_HOST", "192.168.1.14")
    monkeypatch.setattr(
        "app.services.node_service.MosquittoProvisioningService.sync_mosquitto_configuration",
        lambda _db: {"active_nodes_provisioned": 1},
    )

    credentials = NodeService.rotate_mqtt_credentials(
        db_session, "NODE-01", actor="admin@example.test"
    )

    db_session.refresh(node)
    assert credentials.node_id == "NODE-01"
    assert credentials.mqtt_username == "NODE-01"
    assert credentials.mqtt_password
    assert credentials.mqtt_broker_host == "192.168.1.14"
    assert credentials.mqtt_broker_port == 1883
    assert credentials.mqtt_topic_telemetry == "veyrasense/nodes/NODE-01/telemetry"
    assert credentials.mqtt_topic_status == "veyrasense/nodes/NODE-01/status"
    assert credentials.mqtt_topic_commands == "veyrasense/nodes/NODE-01/commands"
    assert credentials.provisioning_status == "pending"
    assert not hasattr(credentials, "api_key")
    assert node.is_active is True
    assert node.status == "offline"
    assert node.provisioning_status == "pending"
    assert node.api_key_hash == "existing-api-key-hash"
    assert node.mqtt_password_hash != credentials.mqtt_password
    assert node.mqtt_password_hash.startswith("$7$")


def test_mqtt_credentials_cannot_be_issued_for_demo_nodes(db_session, test_department):
    node = SensorNode(
        node_id="SIM-01",
        name="Demo Node",
        department_id=test_department.id,
        hardware_type="Simulator",
        firmware_version="test",
        status="offline",
        provisioning_status="connected",
        environment="demo",
        is_active=True,
    )
    db_session.add(node)
    db_session.commit()

    try:
        NodeService.rotate_mqtt_credentials(db_session, "SIM-01")
        assert False, "Demo nodes must not get broker credentials"
    except ValueError as exc:
        assert "only available for real" in str(exc)


def test_mqtt_credential_route_requires_admin_dependency():
    route = next(route for route in router.routes if route.path == "/nodes/{node_id}/mqtt-credentials")
    assert any(dependency.call is get_current_admin for dependency in route.dependant.dependencies)
