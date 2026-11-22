"""SQLite Online Backup and Integrity Verification Module.

Provides non-blocking online database backups and integrity diagnostics
designed for edge deployments on Raspberry Pi 5.
"""
import os
import sqlite3
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy import text
from app.database.connection import engine, SessionLocal
from app.core.config import settings

logger = logging.getLogger(__name__)


def verify_database_integrity() -> Dict[str, Any]:
    """Execute SQLite PRAGMA integrity_check and quick_check.

    Returns diagnostic status proving the database is uncorrupted.
    """
    with SessionLocal() as session:
        try:
            integrity_result = session.execute(text("PRAGMA integrity_check;")).fetchall()
            quick_result = session.execute(text("PRAGMA quick_check;")).fetchall()
            foreign_key_check = session.execute(text("PRAGMA foreign_key_check;")).fetchall()

            integrity_status = [row[0] for row in integrity_result]
            quick_status = [row[0] for row in quick_result]
            fk_violations = len(foreign_key_check)

            is_healthy = (
                integrity_status == ["ok"]
                and quick_status == ["ok"]
                and fk_violations == 0
            )

            return {
                "status": "healthy" if is_healthy else "corrupted",
                "integrity_check": integrity_status,
                "quick_check": quick_status,
                "foreign_key_violations": fk_violations,
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Database integrity check failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }


def perform_online_backup(
    destination_path: str,
    source_path: Optional[str] = None,
    pages_per_step: int = 100,
) -> Dict[str, Any]:
    """Perform a live, non-blocking online backup using SQLite Backup API.

    Copies pages safely while concurrent readers and writers operate.
    """
    source_db_path = source_path if source_path else str(settings.database_path)

    # Ensure source exists (create empty DB if fresh initialization)
    if not os.path.exists(source_db_path):
        os.makedirs(os.path.dirname(os.path.abspath(source_db_path)), exist_ok=True)
        conn = sqlite3.connect(source_db_path)
        conn.close()

    # Ensure parent directory for destination exists
    dest_dir = os.path.dirname(os.path.abspath(destination_path))
    os.makedirs(dest_dir, exist_ok=True)

    start_time = datetime.now(timezone.utc)

    # Use raw sqlite3 connections to perform online backup
    source_conn = sqlite3.connect(source_db_path)
    dest_conn = sqlite3.connect(destination_path)

    try:
        with dest_conn:
            source_conn.backup(dest_conn, pages=pages_per_step)

        # Run integrity check on the newly created backup file
        dest_cursor = dest_conn.cursor()
        dest_cursor.execute("PRAGMA integrity_check;")
        backup_integrity = [row[0] for row in dest_cursor.fetchall()]
        dest_cursor.close()

        file_size_bytes = os.path.getsize(destination_path)
        duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000.0

        return {
            "status": "success" if backup_integrity == ["ok"] else "warning",
            "source": source_db_path,
            "destination": destination_path,
            "file_size_bytes": file_size_bytes,
            "duration_ms": round(duration_ms, 2),
            "integrity_check": backup_integrity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    finally:
        dest_conn.close()
        source_conn.close()
