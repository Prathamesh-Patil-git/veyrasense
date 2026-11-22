"""MQTT Telemetry Ingestion, Protocol Validation, and Deduplication Service.

Subscribes to per-node MQTT topics on local Mosquitto broker:
- veyrasense/nodes/+/telemetry
- veyrasense/nodes/+/status

Security Rules Enforced:
1. Topic/Node Identity Verification: Payload `node_id` MUST match `topic_node_id`.
   Attempts to publish telemetry under another node's identity are rejected and audited.
2. Revoked Node Rejection: Revoked or inactive nodes cannot ingest measurements.
3. Idempotent Deduplication: Retransmitted duplicate sequence numbers are dropped.
4. LWT & Reconnection: Handles Last Will and Testament and re-establishes connected status.
5. Historical Telemetry Preservation: Deactivated nodes keep all historical records intact.
"""
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Tuple, Optional, Set
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.connection import SessionLocal
from app.database.models.node import SensorNode
from app.database.models.sensor import Sensor
from app.database.models.measurement import Measurement
from app.database.base import utc_now
from app.services.audit_service import AuditService

logger = logging.getLogger("mqtt_service")


class MQTTIngestionService:
    """Core MQTT packet processor and deduplication engine."""

    # Sliding window of processed (node_id, sequence_num) for deduplication
    _recent_packets: Set[Tuple[str, int]] = set()
    _recent_order: list[Tuple[str, int]] = []
    _max_dedup_cache = 1000

    @classmethod
    def _is_duplicate(cls, node_id: str, sequence_num: int) -> bool:
        """Check if packet with this sequence number was already processed."""
        key = (node_id, sequence_num)
        if key in cls._recent_packets:
            return True
        cls._recent_packets.add(key)
        cls._recent_order.append(key)
        if len(cls._recent_order) > cls._max_dedup_cache:
            evicted = cls._recent_order.pop(0)
            cls._recent_packets.discard(evicted)
        return False

    @classmethod
    def clear_dedup_cache(cls) -> None:
        """Reset deduplication cache (useful for test suites)."""
        cls._recent_packets.clear()
        cls._recent_order.clear()

    @classmethod
    def process_telemetry_message(
        cls,
        db: Session,
        topic: str,
        payload_raw: str | bytes,
    ) -> Dict[str, Any]:
        """Process incoming telemetry message with identity check and deduplication.

        Returns status dictionary:
        {"status": "accepted" | "rejected" | "duplicate", "detail": ...}
        """
        # 1. Parse Topic
        # Expected format: veyrasense/nodes/{node_id}/telemetry
        topic_parts = topic.strip("/").split("/")
        if len(topic_parts) != 4 or topic_parts[0] != "veyrasense" or topic_parts[1] != "nodes" or topic_parts[3] != "telemetry":
            return {"status": "rejected", "detail": f"Malformed telemetry topic structure: {topic}"}

        topic_node_id = topic_parts[2]

        # 2. Parse JSON payload
        try:
            if isinstance(payload_raw, bytes):
                payload_str = payload_raw.decode("utf-8")
            else:
                payload_str = payload_raw
            payload = json.loads(payload_str)
        except Exception as e:
            return {"status": "rejected", "detail": f"Invalid JSON payload: {str(e)}"}

        payload_node_id = payload.get("node_id")

        # 3. IDENTITY INTEGRITY CHECK (Cross-node spoofing prevention)
        if payload_node_id != topic_node_id:
            logger.warning(
                f"SECURITY ALERT: Cross-node spoofing attempt! "
                f"Topic node '{topic_node_id}' posted payload claiming identity '{payload_node_id}'"
            )
            AuditService.log_action(
                db=db,
                action="spoofing_attempt_rejected",
                entity_id=topic_node_id,
                actor="mqtt_broker",
                details=f"Node attempted to publish as '{payload_node_id}' on topic '{topic}'",
            )
            return {
                "status": "rejected",
                "detail": f"Identity mismatch: payload node '{payload_node_id}' differs from topic node '{topic_node_id}'",
            }

        # 4. NODE EXISTENCE & PROVISIONING STATUS CHECK
        node = db.query(SensorNode).filter(SensorNode.node_id == topic_node_id).first()
        if not node:
            return {"status": "rejected", "detail": f"Unknown sensor node ID '{topic_node_id}'"}

        if not node.is_active or node.provisioning_status == "revoked":
            logger.warning(f"Rejected telemetry from revoked/inactive node: '{topic_node_id}'")
            return {"status": "rejected", "detail": f"Node '{topic_node_id}' is revoked or deactivated."}

        # 5. DEDUPLICATION CHECK
        sequence_num = payload.get("sequence_num")
        if sequence_num is not None and isinstance(sequence_num, int):
            if cls._is_duplicate(topic_node_id, sequence_num):
                logger.info(f"Dropped duplicate sequence #{sequence_num} from node '{topic_node_id}'")
                return {"status": "duplicate", "detail": f"Duplicate sequence #{sequence_num} dropped."}

        # 6. UPDATE NODE HEARTBEAT & STATUS
        now = utc_now()
        node.last_seen_at = now
        node.status = "online"
        node.provisioning_status = "connected"

        # 7. INGEST MEASUREMENTS INTO DATABASE
        sensors_dict = payload.get("sensors", {})
        ingested_count = 0

        # Retrieve attached sensors for this node
        attached_sensors = {s.sensor_id: s for s in node.sensors}

        for channel_name, val in sensors_dict.items():
            if val is None or not isinstance(val, (int, float)):
                continue

            # Determine sensor match
            target_sensor = None
            measurement_type = "sensor_reading"
            unit = "raw"

            channel_lower = channel_name.lower()
            if "temp" in channel_lower:
                measurement_type = "temperature"
                unit = "°C"
                target_sensor = next((s for s in node.sensors if "temp" in s.sensor_id.lower()), None)
            elif "hum" in channel_lower:
                measurement_type = "humidity"
                unit = "%RH"
                target_sensor = next((s for s in node.sensors if "hum" in s.sensor_id.lower()), None)
            elif "air" in channel_lower or "gas" in channel_lower or "mq135" in channel_lower:
                measurement_type = "gas_concentration"
                unit = "ppm"
                target_sensor = next((s for s in node.sensors if "air" in s.sensor_id.lower() or "gas" in s.sensor_id.lower()), None)

            sensor_id_pk = target_sensor.id if target_sensor else None

            # Add measurement record
            m = Measurement(
                node_id=node.id,
                sensor_id=sensor_id_pk,
                measurement_type=measurement_type,
                value=float(val),
                unit=unit,
                quality="good",
                message_uid=f"{topic_node_id}-{sequence_num or 0}-{channel_name}-{int(now.timestamp())}",
                measured_at=now,
                received_at=now,
            )
            db.add(m)
            ingested_count += 1

        db.commit()
        return {
            "status": "accepted",
            "node_id": topic_node_id,
            "sequence_num": sequence_num,
            "measurements_ingested": ingested_count,
        }

    @classmethod
    def process_status_message(
        cls,
        db: Session,
        topic: str,
        payload_raw: str | bytes,
    ) -> Dict[str, Any]:
        """Process node lifecycle status messages (including MQTT Last Will and Testament)."""
        topic_parts = topic.strip("/").split("/")
        if len(topic_parts) != 4 or topic_parts[0] != "veyrasense" or topic_parts[1] != "nodes" or topic_parts[3] != "status":
            return {"status": "rejected", "detail": f"Malformed status topic: {topic}"}

        topic_node_id = topic_parts[2]

        try:
            if isinstance(payload_raw, bytes):
                payload_str = payload_raw.decode("utf-8")
            else:
                payload_str = payload_raw
            payload = json.loads(payload_str)
        except Exception as e:
            return {"status": "rejected", "detail": f"Invalid JSON status payload: {str(e)}"}

        node = db.query(SensorNode).filter(SensorNode.node_id == topic_node_id).first()
        if not node:
            return {"status": "rejected", "detail": f"Unknown sensor node ID '{topic_node_id}'"}

        status_val = payload.get("status", "").lower()
        if status_val == "offline":
            node.status = "offline"
            if node.provisioning_status != "revoked":
                node.provisioning_status = "offline"
            db.commit()
            return {"status": "updated", "node_id": topic_node_id, "node_status": "offline"}
        elif status_val == "online":
            node.status = "online"
            if node.provisioning_status != "revoked":
                node.provisioning_status = "connected"
            node.last_seen_at = utc_now()
            db.commit()
            return {"status": "updated", "node_id": topic_node_id, "node_status": "online"}

        return {"status": "ignored", "detail": f"Unknown status value: {status_val}"}
