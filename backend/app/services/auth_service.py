from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database.models.administrator import Administrator
from app.core.security import verify_password, hash_password


class AuthService:
    """Authentication and administrator credentials management."""

    @staticmethod
    def get_admin_by_email(db: Session, email: str) -> Optional[Administrator]:
        stmt = select(Administrator).where(Administrator.email == email.lower())
        return db.scalar(stmt)

    @staticmethod
    def authenticate_admin(
        db: Session, email: str, password: str
    ) -> Optional[Administrator]:
        admin = AuthService.get_admin_by_email(db, email)
        if not admin or not admin.is_active:
            return None
        if not verify_password(password, admin.hashed_password):
            return None
        admin.last_login_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(admin)
        return admin

    @staticmethod
    def create_admin(
        db: Session, email: str, password: str, full_name: str
    ) -> Administrator:
        existing = AuthService.get_admin_by_email(db, email)
        if existing:
            raise ValueError(f"Administrator with email {email} already exists.")
        hashed = hash_password(password)
        admin = Administrator(
            email=email.lower(),
            hashed_password=hashed,
            full_name=full_name,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        return admin

    @staticmethod
    def reset_admin_password(
        db: Session, email: str, new_password: str
    ) -> Administrator:
        admin = AuthService.get_admin_by_email(db, email)
        if not admin:
            raise ValueError(f"Administrator {email} not found.")
        admin.hashed_password = hash_password(new_password)
        db.commit()
        db.refresh(admin)
        return admin
