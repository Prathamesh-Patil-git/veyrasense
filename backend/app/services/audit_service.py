from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.database.models.audit_log import AuditLog
from app.database.base import utc_now


class AuditService:
    """Service to record immutable security and lifecycle audit entries."""

    @staticmethod
    def log_action(
        db: Session,
        action: str,
        entity_id: str,
        actor: str = "admin",
        details: Optional[str] = None,
        entity_type: str = "node",
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """Create and commit an audit log entry."""
        audit_entry = AuditLog(
            timestamp=utc_now(),
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            actor=actor,
            details=details,
            ip_address=ip_address,
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry
