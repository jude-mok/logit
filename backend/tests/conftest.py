"""
Shared fixtures for integration tests.

Uses an in-memory SQLite database so tests are fully isolated from production.
The DATABASE_URL, SECRET_KEY, and GOOGLE_CLIENT_ID env vars must be set before
any app modules are imported — we do that here at the top of conftest.py.
"""

import os

# Must be set before any app imports so pydantic-settings picks them up.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["GOOGLE_CLIENT_ID"] = "test-google-client-id"

import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.moment import Moment
from app.models.quote import Quote
from app.services.auth import hash_password, create_access_token

# ---------------------------------------------------------------------------
# Engine / session factory shared across the entire test session
# ---------------------------------------------------------------------------

SQLITE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # ensures all sessions share the same in-memory DB
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---------------------------------------------------------------------------
# Per-test table setup / teardown
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_db():
    """Create all tables before each test and drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ---------------------------------------------------------------------------
# Core fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def db():
    """Raw SQLAlchemy session pointing at the in-memory test DB."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    """
    FastAPI TestClient with get_db overridden to use the test DB session.
    The same session object is shared so that data inserted in fixtures
    is visible inside request handlers.
    """
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# User / auth helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def test_user(db):
    """A persisted user with a known password."""
    user = User(
        email="test@example.com",
        password_hash=hash_password("password123"),
        provider="email",
        user_name="testuser",
        created_at=int(time.time()),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """Bearer token headers for the test user."""
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def second_user(db):
    """A second user for ownership-isolation tests."""
    user = User(
        email="other@example.com",
        password_hash=hash_password("otherpass"),
        provider="email",
        user_name="otheruser",
        created_at=int(time.time()),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def second_auth_headers(second_user):
    token = create_access_token(second_user.id)
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Moment helper
# ---------------------------------------------------------------------------

def make_moment(db, user_id, *, comment=None, is_starred=False,
                is_backdated=False, created_at=None) -> Moment:
    """Insert a Moment row directly into the test DB."""
    m = Moment(
        image_path="uploads/fake-test-image.jpg",
        comment=comment,
        is_starred=is_starred,
        is_backdated=is_backdated,
        created_at=created_at or int(time.time()),
        user_id=user_id,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m
