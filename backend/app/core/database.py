# backend/app/core/database.py

import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Get database URL from environment variable
# IMPORTANT: For synchronous psycopg2 (used by PoliticianRepo), use:
#   DATABASE_URL=postgresql://user:password@localhost/civic_lens
# For async operations, it will automatically use asyncpg
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./civic_lens.db")

# The PoliticianRepo uses synchronous psycopg2 and expects a standard PostgreSQL URL
# The AsyncSession below is for future RAG/AI operations that may need async
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
