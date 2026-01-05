# backend/app/core/database.py

import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Get database URL from environment variable
# For now, using SQLite for simplicity. For production, use PostgreSQL with pgvector
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./civic_lens.db")

# For PostgreSQL with pgvector, use:
# DATABASE_URL = "postgresql+asyncpg://user:password@localhost/civic_lens"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL query logging during development
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
