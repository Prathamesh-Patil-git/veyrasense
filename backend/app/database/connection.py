import logging
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure SQLite engine with WAL mode, foreign keys, and busy timeout
connect_args = {}
if settings.resolved_database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = settings.SQLITE_BUSY_TIMEOUT_MS / 1000.0

engine = create_engine(
    settings.resolved_database_url,
    connect_args=connect_args,
    echo=False,
    future=True,
)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Configure SQLite PRAGMAs on every connection."""
    # Only execute SQLite pragmas if the DBAPI connection is sqlite3
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys = ON;")
        cursor.execute("PRAGMA journal_mode = WAL;")
        cursor.execute("PRAGMA synchronous = NORMAL;")
        cursor.execute(f"PRAGMA busy_timeout = {settings.SQLITE_BUSY_TIMEOUT_MS};")
    except Exception as e:
        logger.warning(f"Could not apply SQLite pragmas: {e}")
    finally:
        cursor.close()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """Dependency providing a transactional SQLAlchemy session with clean teardown."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
