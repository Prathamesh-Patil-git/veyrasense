import os
import sys
import tempfile
import pytest

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.security import hash_password, create_access_token
from app.database.base import Base
from app.database.connection import get_db
from app.database.models import Administrator, Department, SensorProfile, SensorNode


@pytest.fixture(scope="session")
def test_db_file():
    """Create a temporary SQLite database file for the test session."""
    fd, path = tempfile.mkstemp(suffix="_test_veyrasense.db")
    os.close(fd)
    yield path
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


@pytest.fixture(scope="session")
def test_engine(test_db_file):
    """Create test engine targeting temporary database."""
    engine = create_engine(
        f"sqlite:///{test_db_file}",
        connect_args={"check_same_thread": False},
        future=True,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")
        cursor.execute("PRAGMA journal_mode = WAL;")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(test_engine) -> Generator[Session, None, None]:
    """Provide a transactional session rolled back or cleaned after each test."""
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
        expire_on_commit=False,
    )
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Test client overriding get_db dependency with test session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_admin(db_session: Session) -> Administrator:
    """Ensure a test administrator exists in the test database."""
    admin = db_session.query(Administrator).filter_by(email="test.admin@veyrasense.local").first()
    if not admin:
        admin = Administrator(
            email="test.admin@veyrasense.local",
            hashed_password=hash_password("TestPassword123!"),
            full_name="Test Administrator",
            is_active=True,
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)
    return admin


@pytest.fixture(scope="function")
def auth_headers(test_admin: Administrator) -> dict[str, str]:
    """Return valid Authorization bearer headers for test administrator."""
    token = create_access_token(
        subject=test_admin.email,
        extra_claims={"name": test_admin.full_name, "role": "admin"},
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def test_department(db_session: Session) -> Department:
    """Ensure a test department exists."""
    dept = db_session.query(Department).filter_by(name="Test Operations").first()
    if not dept:
        dept = Department(
            name="Test Operations",
            description="Department created for automated tests",
            is_active=True,
        )
        db_session.add(dept)
        db_session.commit()
        db_session.refresh(dept)
    return dept
