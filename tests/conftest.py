"""Pytest configuration and fixtures"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.models import Base, UserRole, User
from app.services.user_service import UserService
from main import app

# Create an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test"""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    yield db
    
    # Cleanup
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db, monkeypatch):
    """Create a test client with overridden dependencies"""
    # Override the get_session dependency at the app.api.dependencies module level
    async def override_get_session():
        """Override get_session to return test session"""
        yield db
    
    # Monkeypatch get_session in the dependencies module
    from app.api.dependencies import get_db
    from app.core.database import get_session
    
    # Also need to patch get_db since it calls get_session
    async def override_get_db():
        """Override get_db to return test session"""
        yield db
    
    monkeypatch.setattr("app.api.dependencies.get_db", override_get_db)
    monkeypatch.setattr("app.core.database.get_session", override_get_session)
    
    # Alternatively, use app.dependency_overrides
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_session] = override_get_session
    
    test_client = TestClient(app)
    yield test_client
    
    # Clear overrides after test
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(client, db):
    """Register and login a test admin user"""
    # Register user via API endpoint
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "testadmin",
            "email": "admin@test.com",
            "password": "Testpass123",
        },
    )
    # If user already exists, that's fine (400), just login
    if response.status_code not in [201, 400]:
        raise AssertionError(f"Unexpected status code: {response.status_code}. Response: {response.text}")
    
    # Update user to ADMIN role directly in DB
    admin_user = db.query(User).filter(User.username == "testadmin").first()
    if admin_user and admin_user.role != UserRole.ADMIN:
        admin_user.role = UserRole.ADMIN
        db.commit()
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "testadmin",
            "password": "Testpass123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    return data["access_token"]


@pytest.fixture
def staff_token(client, db):
    """Register and login a test staff user"""
    # Register user via API endpoint
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "teststaff",
            "email": "staff@test.com",
            "password": "Testpass123",
        },
    )
    if response.status_code not in [201, 400]:
        raise AssertionError(f"Unexpected status code: {response.status_code}. Response: {response.text}")
    
    # Ensure user is STAFF role (default)
    staff_user = db.query(User).filter(User.username == "teststaff").first()
    if staff_user and staff_user.role != UserRole.STAFF:
        staff_user.role = UserRole.STAFF
        db.commit()
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "teststaff",
            "password": "Testpass123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    return data["access_token"]


@pytest.fixture
def donor_token(client, db):
    """Register and login a test donor user"""
    # Register user via API endpoint
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "testdonor",
            "email": "donor@test.com",
            "password": "Testpass123",
        },
    )
    if response.status_code not in [201, 400]:
        raise AssertionError(f"Unexpected status code: {response.status_code}. Response: {response.text}")
    
    # Update user to DONOR role directly in DB
    donor_user = db.query(User).filter(User.username == "testdonor").first()
    if donor_user and donor_user.role != UserRole.DONOR:
        donor_user.role = UserRole.DONOR
        db.commit()
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "testdonor",
            "password": "Testpass123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    return data["access_token"]


@pytest.fixture
def staff_token(client, db):
    """Register and login a test staff user"""
    # Register user via API endpoint (defaults to STAFF role)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "teststaff",
            "email": "staff@test.com",
            "password": "Testpass123",
        },
    )
    # If user already exists, that's fine (400), just login
    if response.status_code not in [201, 400]:
        raise AssertionError(f"Unexpected status code: {response.status_code}. Response: {response.text}")
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "teststaff",
            "password": "Testpass123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    return data["access_token"]


@pytest.fixture
def donor_token(client, db):
    """Register and login a test donor user"""
    # Register user via API endpoint
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "testdonor",
            "email": "donor@test.com",
            "password": "Testpass123",
        },
    )
    # If user already exists, that's fine (400), just update role and login
    if response.status_code not in [201, 400]:
        raise AssertionError(f"Unexpected status code: {response.status_code}. Response: {response.text}")
    
    # Update user to DONOR role directly in DB
    donor_user = db.query(User).filter(User.username == "testdonor").first()
    if donor_user and donor_user.role != UserRole.DONOR:
        donor_user.role = UserRole.DONOR
        db.commit()
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "testdonor",
            "password": "Testpass123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    return data["access_token"]
