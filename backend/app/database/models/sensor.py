from typing import List, Optional
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class Sensor(Base):
    """Specific transducer attached to an edge node."""

    __tablename__ = "sensors"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sensor_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    node_id: Mapped[int] = mapped_column(
        ForeignKey("sensor_nodes.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    profile_id: Mapped[int] = mapped_column(
        ForeignKey("sensor_profiles.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    location_description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    node: Mapped["SensorNode"] = relationship("SensorNode", back_populates="sensors")
    profile: Mapped["SensorProfile"] = relationship("SensorProfile", back_populates="sensors")
    measurements: Mapped[List["Measurement"]] = relationship("Measurement", back_populates="sensor")
