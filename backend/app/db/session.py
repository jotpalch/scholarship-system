"""
Database session management
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Async engine for async operations
async_engine = create_async_engine(
    settings.database_url,
    echo=False,  # 關閉詳細 SQL 日誌
    pool_pre_ping=True,
    pool_recycle=300,
)

# Sync engine for migrations and admin operations
sync_engine = create_engine(
    settings.database_url_sync,
    echo=False,  # 關閉詳細 SQL 日誌
    pool_pre_ping=True,
    pool_recycle=300,
)

# Async session maker (SQLAlchemy 2.0 style)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=True,
    autocommit=False,
)

# Sync session maker for migrations
SessionLocal = sessionmaker(
    bind=sync_engine,
    autoflush=True,
    autocommit=False,
)

# Lazy proxy to get_db to avoid circular import during module init
async def get_db():
    """Proxy to app.db.deps.get_db to maintain backward compatibility."""
    from app.db.deps import get_db as _get_db  # local import to avoid circular dependency
    async for session in _get_db():
        yield session

__all__ = [
    'async_engine',
    'sync_engine',
    'AsyncSessionLocal',
    'SessionLocal',
    'get_db',
] 