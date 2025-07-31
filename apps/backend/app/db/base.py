"""
Database base configuration and utilities.
Sets up SQLAlchemy async engine and base classes.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create async engine for async operations
async_engine = create_async_engine(
    settings.database_url,
    echo=False,  # 關閉詳細 SQL 日誌
    future=True,
    pool_pre_ping=True,
    pool_recycle=3600,  # Recycle connections after 1 hour
    pool_size=10,
    max_overflow=20
)

# Create sync engine for Alembic migrations
sync_engine = create_engine(
    settings.database_url_sync,
    echo=False,  # 關閉詳細 SQL 日誌
    future=True,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20
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