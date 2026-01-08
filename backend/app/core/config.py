"""
Backend configuration management.

Loads environment variables and provides centralized configuration.
"""

import os
from typing import Optional

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # Database Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./civic_lens.db"  # Fallback to SQLite for local dev
    )

    # Demo/Offline Mode
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes", "on")

    # Redis Configuration (Optional)
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", None)
    # Note: REDIS_ENABLED is evaluated at runtime via should_use_redis()

    # Gemini AI Configuration (Optional)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    GEMINI_EMBEDDING_MODEL: str = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
    RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", "8"))
    RAG_MIN_SIMILARITY: float = float(os.getenv("RAG_MIN_SIMILARITY", "0.20"))

    # API Configuration
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    @classmethod
    def validate(cls) -> None:
        """Validate required configuration."""
        errors = []

        # Database URL is required (but has a fallback)
        if not cls.DATABASE_URL:
            errors.append("DATABASE_URL is required")

        # If AI features are used, API key is required
        # (This is checked at runtime in the AI modules)

        if errors:
            raise ValueError(f"Configuration errors: {', '.join(errors)}")

    @classmethod
    def is_demo_mode(cls) -> bool:
        """Check if demo mode is enabled."""
        return cls.DEMO_MODE

    @classmethod
    def get_database_url(cls) -> str:
        """Get database URL with asyncpg conversion if needed."""
        url = cls.DATABASE_URL
        
        # Convert Supabase connection string format if needed
        # Supabase provides: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
        # SQLAlchemy async requires: postgresql+asyncpg://...
        if url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        return url

    @classmethod
    def should_use_redis(cls) -> bool:
        """Check if Redis caching is enabled and configured."""
        # Evaluate at runtime to handle env vars loaded after module import
        return bool(os.getenv("REDIS_URL") or cls.REDIS_URL)


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings."""
    return settings

