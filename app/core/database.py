"""Database configuration and session management"""
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.core.config import settings

# For SQLite in development
if settings.database_url.startswith("sqlite"):
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    # For PostgreSQL or other databases
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_session() -> Generator[Session, None, None]:
    """Get database session for dependency injection"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Compatibility alias for older route dependencies
get_db = get_session


def init_db():
    """Initialize database - create all tables"""
    from app.models import Base
    Base.metadata.create_all(bind=engine)
