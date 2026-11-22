from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class NodeBase(BaseModel):
    node_id: str = Field(..., min_length=2, max_length=64, pattern=r"^[A-Za-z0-9\-_]+$")
    name: str = Field(..., min_length=2, max_length=128)
    department_id: int
    hardware_type: str = Field(default="ESP32-WROOM-32", min_length=2, max_length=64)
    firmware_version: str = Field(default="v1.4.2", max_length=32)
    location: Optional[str] = Field(None, max_length=255)
    status: str = Field(default="online", max_length=32)
    provisioning_status: str = Field(default="pending", max_length=32)


class NodeCreate(NodeBase):
    api_key: Optional[str] = Field(None, min_length=8, max_length=128, description="Pre-shared device authentication key")


class NodeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=128)
    department_id: Optional[int] = Field(None, gt=0)
    hardware_type: Optional[str] = Field(None, min_length=2, max_length=64)
    firmware_version: Optional[str] = Field(None, max_length=32)
    location: Optional[str] = None


class NodeResponse(NodeBase):
    environment: str = Field(default="real", pattern=r"^(real|demo)$")
    sensor_types: List[str] = Field(default_factory=list)
    id: int
    is_active: bool
    registered_at: datetime
    last_seen_at: Optional[datetime] = None
    department_name: Optional[str] = None
    has_api_key: bool = False
    mqtt_username: Optional[str] = None
    credentials_rotated_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NodeProvisionRequest(BaseModel):
    node_id: Optional[str] = Field(
        None,
        min_length=2,
        max_length=64,
        pattern=r"^[A-Za-z0-9\-_]+$",
        description="Unique Node ID (auto-generated if omitted)",
    )
    name: str = Field(..., min_length=2, max_length=128, description="Human-readable node label")
    department_id: int = Field(..., description="Target department identifier")
    location: Optional[str] = Field(None, max_length=255, description="Physical deployment location")
    hardware_type: str = Field(default="ESP32-WROOM-32", max_length=64)
    sensor_types: List[str] = Field(
        default=["DHT11", "MQ-135"],
        description="Transducers connected to this node (DHT11, MQ-135, or custom)",
    )
    protocol: str = Field(default="mqtt", description="Primary transport protocol (mqtt or http)")


class NodeProvisionResponse(BaseModel):
    node_id: str
    name: str
    department_id: int
    department_name: Optional[str] = None
    hardware_type: str
    location: Optional[str] = None
    provisioning_status: str
    protocol: str

    # Sensitive credentials - RETURNED EXACTLY ONCE
    api_key: str = Field(..., description="Pre-shared HTTP device key (Never shown again)")
    mqtt_username: str = Field(..., description="Unique MQTT broker username")
    mqtt_password: str = Field(..., description="Unique MQTT broker password (Never shown again)")

    mqtt_broker_host: str
    mqtt_broker_port: int
    mqtt_topic_telemetry: str
    mqtt_topic_status: str
    mqtt_topic_commands: str

    sensors_attached: List[str]
    firmware_config_snippet: str
    warning: str = "SECURITY NOTICE: Store these credentials immediately. The raw secret keys are cryptographically hashed and cannot be retrieved again."


class NodeRotateCredentialsResponse(BaseModel):
    node_id: str
    api_key: str
    mqtt_username: str
    mqtt_password: str
    credentials_rotated_at: datetime
    firmware_config_snippet: str
    warning: str = "Credentials successfully rotated. Existing keys are now invalid. Update the ESP32 firmware config immediately."


class NodeRevokeResponse(BaseModel):
    node_id: str
    status: str
    provisioning_status: str
    is_active: bool
    revoked_at: datetime
    message: str = "Node successfully revoked. MQTT ACL and API authentication tokens are invalidated."


class NodeAuditResponse(BaseModel):
    id: int
    timestamp: datetime
    action: str
    entity_id: str
    actor: str
    details: Optional[str] = None
    ip_address: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NodeFirmwareConfigResponse(BaseModel):
    node_id: str
    hardware_type: str
    config_header: str
    config_json: dict
