from typing import List, Optional
from sqlalchemy import String, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class SensorProfile(Base):
    """Sensor Profile defining physical measurement types, units, and nominal limits."""

    __tablename__ = "sensor_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    measurement_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # distance, flow, temp, etc.
    unit: Mapped[str] = mapped_column(String(32), nullable=False)  # cm, L/min, °C, bar, etc.
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    default_minimum: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    default_maximum: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    sensors: Mapped[List["Sensor"]] = relationship("Sensor", back_populates="profile")
