"""Simple test to verify setup"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base

# Create an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
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

def test_db_setup(db):
    """Test that database is set up correctly"""
    from app.models import User
    user = User(username="test", email="test@test.com", hashed_password="hash")
    db.add(user)
    db.commit()
    assert user.id is not None