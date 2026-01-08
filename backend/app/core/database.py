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

# Supabase connection pooler (pgbouncer) doesn't support prepared statements
# Disable statement caching for Supabase connections
# Note: For Supabase pooler, use direct connection string or disable cache
connect_args = {}
if "supabase.co" in DATABASE_URL or "pooler" in DATABASE_URL.lower():
    # Disable prepared statement cache for pgbouncer compatibility
    # asyncpg requires this to be set in connect_args
    connect_args = {"statement_cache_size": 0, "prepared_statement_cache_size": 0}

engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL query logging during development
    connect_args=connect_args,
    # Also disable statement cache at engine level for Supabase
    pool_pre_ping=True,  # Verify connections before using
)

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
