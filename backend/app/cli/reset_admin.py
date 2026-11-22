"""CLI Administrator Password Reset Utility.

Targeted for single-administrator edge deployments on Raspberry Pi 5 console.
Execution:
  python -m app.cli.reset_admin <new_password> [email]
"""
import sys
import logging
from app.core.config import settings
from app.database.connection import SessionLocal
from app.services.auth_service import AuthService

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("reset_admin")


def reset_password(new_password: str, email: str = ""):
    """Reset administrator password directly in local SQLite."""
    target_email = email.lower() if email else settings.DEV_ADMIN_EMAIL.lower()
    db = SessionLocal()
    try:
        admin = AuthService.get_admin_by_email(db, target_email)
        if not admin:
            logger.info(f"Administrator {target_email} not found. Creating new account...")
            AuthService.create_admin(
                db=db,
                email=target_email,
                password=new_password,
                full_name="Gateway Administrator",
            )
            logger.info(f"Administrator {target_email} created with specified password.")
        else:
            AuthService.reset_admin_password(db, target_email, new_password)
            logger.info(f"Password for {target_email} reset successfully.")
    except Exception as e:
        logger.error(f"Failed to reset password: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m app.cli.reset_admin <new_password> [email]")
        sys.exit(1)
    password = sys.argv[1]
    admin_email = sys.argv[2] if len(sys.argv) > 2 else ""
    reset_password(password, admin_email)
