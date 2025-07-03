"""
Database base configuration and utilities.
Sets up SQLAlchemy async engine and base classes.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Helper to build engine kwargs depending on backend
def _build_engine_kwargs(url: str):
    base_kwargs = dict(
        echo=False,
        future=True,
        pool_pre_ping=True,
    )
    # Use pooling options only for PostgreSQL connections
    if url.startswith("postgresql"):
        base_kwargs.update(pool_recycle=3600, pool_size=10, max_overflow=20)
    return base_kwargs

# Create async engine for async operations
async_engine = create_async_engine(
    settings.database_url,
    **_build_engine_kwargs(settings.database_url)
)

# Create sync engine for Alembic migrations
sync_engine = create_engine(
    settings.database_url_sync,
    **_build_engine_kwargs(settings.database_url_sync)
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Create sync session factory for migrations
SessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False
)

# Create declarative base class
Base = declarative_base()

# Metadata for Alembic
metadata = Base.metadata 