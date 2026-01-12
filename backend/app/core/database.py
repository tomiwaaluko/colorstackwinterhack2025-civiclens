# backend/app/core/database.py

import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv
from app.core.config import settings

# Load environment variables from .env file
load_dotenv()

# Get database URL from config settings (which reads from environment)
# Defaults to SQLite for local dev if DATABASE_URL not set
DATABASE_URL = settings.get_database_url()

# Disable prepared statement caching for all connections
# This helps with connection poolers like pgbouncer and prevents caching issues
connect_args = {"statement_cache_size": 0, "prepared_statement_cache_size": 0}

# Create async engine with additional settings to prevent prepared statement issues
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL query logging during development
    connect_args=connect_args,
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=3600,  # Recycle connections every hour to clear any cached state
    execution_options={
        "compiled_cache": None,  # Disable query compilation cache
    }
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for FastAPI routes to get a database session.
    
    Usage:
        @router.get("/endpoint")
        async def endpoint(db: AsyncSession = Depends(get_db)):
            # Use db here
            pass
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
