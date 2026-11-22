from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, utc_now


class SensorNode(Base):
    """Connected Edge Microcontroller or Sensor Station Node."""

    __tablename__ = "sensor_nodes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    node_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    hardware_type: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g., ESP32, ESP8266, RP2040
    firmware_version: Mapped[str] = mapped_column(String(32), default="v1.0.0", nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(32),
        default="online",
        index=True,
        nullable=False,
    )  # online, healthy, warning, alert, offline, calibrating
    provisioning_status: Mapped[str] = mapped_column(
        String(32),
        default="pending",
        index=True,
        nullable=False,
    )  # pending, connected, offline, revoked
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    api_key_hash: Mapped[Optional[str]] = mapped_column(
        String(128),
        index=True,
        nullable=True,
    )
    mqtt_username: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
    )
    mqtt_password_hash: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
    )
    credentials_rotated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    department: Mapped["Department"] = relationship("Department", back_populates="nodes")
    sensors: Mapped[List["Sensor"]] = relationship(
        "Sensor",
        back_populates="node",
        cascade="all, delete-orphan",
    )
    measurements: Mapped[List["Measurement"]] = relationship(
        "Measurement",
        back_populates="node",
        cascade="all, delete-orphan",
    )
