import json
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.models.node import SensorNode
from app.database.models.department import Department
from app.database.models.sensor_profile import SensorProfile
from app.database.models.sensor import Sensor
from app.database.models.audit_log import AuditLog
from app.database.base import utc_now
from app.schemas.node import (
    NodeCreate,
    NodeUpdate,
    NodeResponse,
    NodeProvisionRequest,
    NodeProvisionResponse,
    NodeRotateCredentialsResponse,
    NodeRevokeResponse,
    NodeAuditResponse,
    NodeFirmwareConfigResponse,
)
from app.core.security import (
    hash_device_key,
    hash_mqtt_password,
    generate_secure_device_secret,
    generate_node_id,
)
from app.services.audit_service import AuditService
from app.services.mosquitto_service import MosquittoProvisioningService


class NodeService:
    """Sensor Node registry, dynamic provisioning, lifecycle, and security service."""

    @staticmethod
    def list_nodes(
        db: Session,
        department_id: Optional[int] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[NodeResponse]:
        stmt = select(SensorNode, Department.name.label("department_name")).join(
            Department, SensorNode.department_id == Department.id
        )

        if department_id is not None:
            stmt = stmt.where(SensorNode.department_id == department_id)
        if status:
            stmt = stmt.where(SensorNode.status == status)

        stmt = stmt.order_by(SensorNode.id.asc()).limit(limit).offset(offset)
        rows = db.execute(stmt).all()

        responses: List[NodeResponse] = []
        for node, dept_name in rows:
            resp = NodeResponse.model_validate(node)
            resp.department_name = dept_name
            resp.has_api_key = bool(node.api_key_hash)
            responses.append(resp)
        return responses

    @staticmethod
    def get_node_by_id(db: Session, id_: int) -> Optional[SensorNode]:
        return db.get(SensorNode, id_)

    @staticmethod
    def get_node_by_node_id(db: Session, node_id: str) -> Optional[SensorNode]:
        stmt = select(SensorNode).where(SensorNode.node_id == node_id)
        return db.scalar(stmt)

    @staticmethod
    def create_node(db: Session, data: NodeCreate) -> SensorNode:
        # Check duplicate node_id
        existing = NodeService.get_node_by_node_id(db, data.node_id)
        if existing:
            raise ValueError(f"Sensor node with ID '{data.node_id}' already exists.")

        # Check department exists
        dept = db.get(Department, data.department_id)
        if not dept:
            raise ValueError(f"Department ID {data.department_id} does not exist.")

        api_key_hash = hash_device_key(data.api_key) if data.api_key else None

        node = SensorNode(
            node_id=data.node_id,
            name=data.name,
            department_id=data.department_id,
            hardware_type=data.hardware_type,
            firmware_version=data.firmware_version,
            location=data.location,
            status=data.status,
            provisioning_status="pending",
            api_key_hash=api_key_hash,
            last_seen_at=datetime.now(timezone.utc),
            is_active=True,
        )
        db.add(node)
        db.commit()
        db.refresh(node)
        return node

    @staticmethod
    def provision_node(
        db: Session,
        data: NodeProvisionRequest,
        actor: str = "admin",
        ip_address: Optional[str] = None,
    ) -> NodeProvisionResponse:
        """Provision a new ESP32 sensor node with unique credentials and per-node MQTT ACLs."""
        # 1. Validate department
        dept = db.get(Department, data.department_id)
        if not dept:
            raise ValueError(f"Department ID {data.department_id} does not exist.")

        # 2. Assign unique Node ID
        node_id = data.node_id.strip() if data.node_id else generate_node_id(dept.name[:4])
        existing = NodeService.get_node_by_node_id(db, node_id)
        if existing:
            raise ValueError(f"Sensor node with ID '{node_id}' is already registered.")

        # 3. Generate high-entropy unique credentials
        raw_api_key = generate_secure_device_secret(32)
        raw_mqtt_password = generate_secure_device_secret(24)
        mqtt_username = node_id  # Node ID serves as dedicated MQTT username

        # 4. Hash credentials securely
        api_key_hash = hash_device_key(raw_api_key)
        mqtt_password_hash = hash_mqtt_password(raw_mqtt_password)

        # 5. Persist SensorNode
        node = SensorNode(
            node_id=node_id,
            name=data.name,
            department_id=data.department_id,
            hardware_type=data.hardware_type,
            firmware_version="v1.4.2",
            location=data.location,
            status="offline",
            provisioning_status="pending",
            api_key_hash=api_key_hash,
            mqtt_username=mqtt_username,
            mqtt_password_hash=mqtt_password_hash,
            registered_at=utc_now(),
            is_active=True,
        )
        db.add(node)
        db.flush()

        # 6. Attach Transducers based on selected sensor types
        sensors_attached: List[str] = []
        profiles = {p.name: p for p in db.query(SensorProfile).all()}

        for st in data.sensor_types:
            clean_st = st.strip().upper()
            if "DHT11" in clean_st or "DHT" in clean_st:
                # Temperature channel
                temp_prof = profiles.get("Industrial Temperature")
                if temp_prof:
                    s_temp = Sensor(
                        sensor_id=f"{node_id}-TEMP",
                        node_id=node.id,
                        profile_id=temp_prof.id,
                        name=f"{node.name} - Temperature",
                        location_description=data.location,
                        is_active=True,
                    )
                    db.add(s_temp)
                    sensors_attached.append("DHT11 Temperature (°C)")

                # Humidity channel
                hum_prof = profiles.get("Relative Humidity")
                if hum_prof:
                    s_hum = Sensor(
                        sensor_id=f"{node_id}-HUM",
                        node_id=node.id,
                        profile_id=hum_prof.id,
                        name=f"{node.name} - Humidity",
                        location_description=data.location,
                        is_active=True,
                    )
                    db.add(s_hum)
                    sensors_attached.append("DHT11 Humidity (%RH)")

            elif "MQ-135" in clean_st or "MQ135" in clean_st or "GAS" in clean_st:
                gas_prof = profiles.get("Gas Concentration")
                if gas_prof:
                    s_gas = Sensor(
                        sensor_id=f"{node_id}-AIR",
                        node_id=node.id,
                        profile_id=gas_prof.id,
                        name=f"{node.name} - Air Quality ADC",
                        location_description=data.location,
                        is_active=True,
                    )
                    db.add(s_gas)
                    sensors_attached.append("MQ-135 Air Quality (ppm/ADC)")

        if not sensors_attached:
            # Fallback default sensor
            first_prof = db.query(SensorProfile).first()
            if first_prof:
                s_def = Sensor(
                    sensor_id=f"{node_id}-SN1",
                    node_id=node.id,
                    profile_id=first_prof.id,
                    name=f"{node.name} - Sensor",
                    location_description=data.location,
                    is_active=True,
                )
                db.add(s_def)
                sensors_attached.append(f"{first_prof.name} ({first_prof.unit})")

        db.commit()
        db.refresh(node)

        # 7. Record security audit log
        audit_details = {
            "department": dept.name,
            "hardware_type": node.hardware_type,
            "sensors": sensors_attached,
            "protocol": data.protocol,
        }
        AuditService.log_action(
            db=db,
            action="node_registered",
            entity_id=node_id,
            actor=actor,
            details=json.dumps(audit_details),
            ip_address=ip_address,
        )

        # 8. Sync Mosquitto ACL & Passwd
        MosquittoProvisioningService.sync_mosquitto_configuration(db)

        # 9. Format ESP32 C++ config header snippet
        telemetry_topic = f"veyrasense/nodes/{node_id}/telemetry"
        status_topic = f"veyrasense/nodes/{node_id}/status"
        commands_topic = f"veyrasense/nodes/{node_id}/commands"

        config_snippet = NodeService.format_esp32_config_header(
            node_id=node_id,
            mqtt_user=mqtt_username,
            mqtt_pass=raw_mqtt_password,
            device_key=raw_api_key,
            broker_host=settings.MQTT_BROKER_HOST,
            broker_port=settings.MQTT_BROKER_PORT,
        )

        return NodeProvisionResponse(
            node_id=node_id,
            name=node.name,
            department_id=node.department_id,
            department_name=dept.name,
            hardware_type=node.hardware_type,
            location=node.location,
            provisioning_status=node.provisioning_status,
            protocol=data.protocol,
            api_key=raw_api_key,
            mqtt_username=mqtt_username,
            mqtt_password=raw_mqtt_password,
            mqtt_broker_host=settings.MQTT_BROKER_HOST,
            mqtt_broker_port=settings.MQTT_BROKER_PORT,
            mqtt_topic_telemetry=telemetry_topic,
            mqtt_topic_status=status_topic,
            mqtt_topic_commands=commands_topic,
            sensors_attached=sensors_attached,
            firmware_config_snippet=config_snippet,
        )

    @staticmethod
    def rotate_credentials(
        db: Session,
        node_id: str,
        actor: str = "admin",
        ip_address: Optional[str] = None,
    ) -> NodeRotateCredentialsResponse:
        """Rotate security credentials for a registered node."""
        node = NodeService.get_node_by_node_id(db, node_id)
        if not node:
            raise ValueError(f"Sensor node '{node_id}' does not exist.")
        if node.provisioning_status == "revoked":
            raise ValueError(f"Cannot rotate credentials on revoked node '{node_id}'.")

        # Generate new keys
        new_api_key = generate_secure_device_secret(32)
        new_mqtt_pass = generate_secure_device_secret(24)

        node.api_key_hash = hash_device_key(new_api_key)
        node.mqtt_password_hash = hash_mqtt_password(new_mqtt_pass)
        now = utc_now()
        node.credentials_rotated_at = now

        db.commit()
        db.refresh(node)

        # Audit
        AuditService.log_action(
            db=db,
            action="credentials_rotated",
            entity_id=node_id,
            actor=actor,
            details=f"Credentials rotated at {now.isoformat()}",
            ip_address=ip_address,
        )

        # Sync Mosquitto
        MosquittoProvisioningService.sync_mosquitto_configuration(db)

        config_snippet = NodeService.format_esp32_config_header(
            node_id=node_id,
            mqtt_user=node.mqtt_username or node_id,
            mqtt_pass=new_mqtt_pass,
            device_key=new_api_key,
            broker_host=settings.MQTT_BROKER_HOST,
            broker_port=settings.MQTT_BROKER_PORT,
        )

        return NodeRotateCredentialsResponse(
            node_id=node_id,
            api_key=new_api_key,
            mqtt_username=node.mqtt_username or node_id,
            mqtt_password=new_mqtt_pass,
            credentials_rotated_at=now,
            firmware_config_snippet=config_snippet,
            warning="Credentials successfully rotated. Existing keys are now invalid.",
        )

    @staticmethod
    def revoke_node(
        db: Session,
        node_id: str,
        actor: str = "admin",
        ip_address: Optional[str] = None,
    ) -> NodeRevokeResponse:
        """Revoke a node, cutting off all MQTT and API access while preserving historical telemetry."""
        node = NodeService.get_node_by_node_id(db, node_id)
        if not node:
            raise ValueError(f"Sensor node '{node_id}' does not exist.")

        now = utc_now()
        node.is_active = False
        node.provisioning_status = "revoked"
        node.status = "offline"
        node.revoked_at = now

        db.commit()
        db.refresh(node)

        # Record audit
        AuditService.log_action(
            db=db,
            action="node_revoked",
            entity_id=node_id,
            actor=actor,
            details=f"Node revoked at {now.isoformat()}. Access terminated.",
            ip_address=ip_address,
        )

        # Sync Mosquitto (automatically removes node from Mosquitto ACL and password file)
        MosquittoProvisioningService.sync_mosquitto_configuration(db)

        return NodeRevokeResponse(
            node_id=node_id,
            status=node.status,
            provisioning_status=node.provisioning_status,
            is_active=node.is_active,
            revoked_at=now,
            message="Node successfully revoked. Historical measurements preserved in database.",
        )

    @staticmethod
    def activate_node(
        db: Session,
        node_id: str,
        actor: str = "admin",
        ip_address: Optional[str] = None,
    ) -> NodeResponse:
        """Re-activate an inactive or pending node."""
        node = NodeService.get_node_by_node_id(db, node_id)
        if not node:
            raise ValueError(f"Sensor node '{node_id}' does not exist.")

        node.is_active = True
        node.provisioning_status = "connected" if node.last_seen_at else "pending"
        db.commit()
        db.refresh(node)

        AuditService.log_action(
            db=db,
            action="node_activated",
            entity_id=node_id,
            actor=actor,
            details="Node reactivated.",
            ip_address=ip_address,
        )

        MosquittoProvisioningService.sync_mosquitto_configuration(db)

        resp = NodeResponse.model_validate(node)
        if node.department:
            resp.department_name = node.department.name
        resp.has_api_key = bool(node.api_key_hash)
        return resp

    @staticmethod
    def get_node_audit_logs(db: Session, node_id: str) -> List[NodeAuditResponse]:
        """Fetch audit trail for the given node."""
        stmt = (
            select(AuditLog)
            .where(AuditLog.entity_id == node_id)
            .order_by(desc(AuditLog.timestamp))
            .limit(50)
        )
        records = db.scalars(stmt).all()
        return [NodeAuditResponse.model_validate(r) for r in records]

    @staticmethod
    def format_esp32_config_header(
        node_id: str,
        mqtt_user: str,
        mqtt_pass: str,
        device_key: str,
        broker_host: str,
        broker_port: int,
    ) -> str:
        """Generate ready-to-flash C++ config.h header."""
        return f"""// ==============================================================================
// VeyraSense ESP32 Node Configuration Header: config.h
// NODE ID: {node_id}
// Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}
// DO NOT COMMIT THIS FILE WITH REAL PASSWORDS TO VERSION CONTROL
// ==============================================================================
#ifndef VEYRASENSE_CONFIG_H
#define VEYRASENSE_CONFIG_H

// --- Wi-Fi Network ---
#define WIFI_SSID           "INDUSTRIAL_IOT_WIFI"
#define WIFI_PASSWORD       "WIFI_PRESHARED_KEY"

// --- VeyraSense MQTT Gateway (Raspberry Pi 5) ---
#define MQTT_BROKER_HOST    "{broker_host}"
#define MQTT_BROKER_PORT    {broker_port}

// --- Node Credentials & Identity ---
#define VEYRASENSE_NODE_ID  "{node_id}"
#define MQTT_USERNAME       "{mqtt_user}"
#define MQTT_PASSWORD       "{mqtt_pass}"
#define VEYRASENSE_KEY      "{device_key}"

// --- Per-Node MQTT Topics (Restricted by Broker ACL) ---
#define MQTT_TOPIC_TELEMETRY "veyrasense/nodes/{node_id}/telemetry"
#define MQTT_TOPIC_STATUS    "veyrasense/nodes/{node_id}/status"
#define MQTT_TOPIC_COMMANDS  "veyrasense/nodes/{node_id}/commands"

// --- Hardware Pinouts ---
#define DHT_PIN             4    // GPIO 4 for DHT11 data line
#define DHT_TYPE            DHT11
#define MQ135_PIN           34   // ADC1_CH6 (GPIO 34) for MQ-135 analog read
#define TELEMETRY_INTERVAL  5000 // Ingestion period in milliseconds (5s)

#endif // VEYRASENSE_CONFIG_H
"""
