# backend/app/core/database.py

import os
from typing import AsyncGenerator
from urllib.parse import urlparse, parse_qs

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv
from app.core.config import settings

# Load environment variables from .env file
load_dotenv()

# Get database URL from config settings (which reads from environment)
# Defaults to SQLite for local dev if DATABASE_URL not set
DATABASE_URL = settings.get_database_url()

def _should_disable_prepared_statements(database_url: str) -> bool:
    """Detect if prepared statements should be disabled (e.g., pgbouncer)."""
    if os.getenv("DISABLE_PREPARED_STATEMENTS", "").lower() in ("1", "true", "yes", "on"):
        return True

    parsed = urlparse(database_url)
    host = (parsed.hostname or "").lower()
    query = parse_qs(parsed.query)

    if query.get("pgbouncer", ["false"])[0].lower() in ("1", "true", "yes", "on"):
        return True

    return any(token in host for token in ("pgbouncer", "pooler", "supabase"))


# Supabase connection pooler (pgbouncer) doesn't support prepared statements
# Disable statement caching for all PostgreSQL connections to avoid DuplicatePreparedStatementError
connect_args = {}
if "postgresql" in DATABASE_URL.lower():
    connect_args = {"statement_cache_size": 0, "prepared_statement_cache_size": 0}


def _use_external_pooler() -> bool:
    """Determine if an external connection pooler (pgbouncer) is being used.
    
    Checks:
    1. Explicit USE_PGBOUNCER env var / settings
    2. DISABLE_PREPARED_STATEMENTS env var (legacy indicator)
    3. Database URL markers (pgbouncer, pooler, supabase in hostname)
    """
    # Check explicit config setting
    if settings.USE_PGBOUNCER:
        return True
    
    # Check legacy env var
    if os.getenv("DISABLE_PREPARED_STATEMENTS", "").lower() in ("1", "true", "yes", "on"):
        return True
    
    # Check URL for pooler markers
    parsed = urlparse(DATABASE_URL)
    host = (parsed.hostname or "").lower()
    query = parse_qs(parsed.query)
    
    if query.get("pgbouncer", ["false"])[0].lower() in ("1", "true", "yes", "on"):
        return True
    
    return any(token in host for token in ("pgbouncer", "pooler", "supabase"))


# Create async engine
# Use NullPool only when using external connection poolers like pgbouncer
# Otherwise, let SQLAlchemy use its default connection pooling for better performance
engine_kwargs = {
    "echo": settings.SQL_ECHO,  # SQL logging controlled by config (default: False for production)
    "connect_args": connect_args,
    "pool_pre_ping": True,  # Verify connections before using
}

# Only use NullPool when external pooler is detected
if _use_external_pooler():
    engine_kwargs["poolclass"] = NullPool

engine = create_async_engine(DATABASE_URL, **engine_kwargs)

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
