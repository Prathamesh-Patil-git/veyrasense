from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base, utc_now


class AuditLog(Base):
    """Immutable audit trail for security-critical actions and lifecycle transitions."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        index=True,
        nullable=False,
    )
    action: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), default="node", nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    actor: Mapped[str] = mapped_column(String(128), default="system", nullable=False)
    details: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
