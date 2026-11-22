from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, utc_now


class Measurement(Base):
    """Universal Telemetry & Ingestion Record for Any Physical Sensor Measurement."""

    __tablename__ = "measurements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    message_uid: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    node_id: Mapped[int] = mapped_column(
        ForeignKey("sensor_nodes.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    sensor_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("sensors.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    measurement_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    measured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
        nullable=False,
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        index=True,
        nullable=False,
    )
    quality: Mapped[str] = mapped_column(
        String(32),
        default="good",
        index=True,
        nullable=False,
    )  # good, suspect, synthetic_recovery, degraded
    source_type: Mapped[str] = mapped_column(
        String(32),
        default="telemetry",
        nullable=False,
    )  # telemetry, challenge_response, recovery_imputation, manual_test

    # Composite indexes for high-frequency queries
    __table_args__ = (
        Index("idx_node_measured_at", "node_id", "measured_at"),
        Index("idx_type_measured_at", "measurement_type", "measured_at"),
    )

    # Relationships
    node: Mapped["SensorNode"] = relationship("SensorNode", back_populates="measurements")
    sensor: Mapped[Optional["Sensor"]] = relationship("Sensor", back_populates="measurements")
