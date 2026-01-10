#!/usr/bin/env python3
"""
Refresh Materialized Views Script

This script refreshes all materialized views used for visualization aggregations.
Run this script periodically (daily cron job) or after bulk data ingestion.

IMPORTANT: For Supabase users, use the DIRECT connection string (port 5432), 
NOT the pooler connection string (port 6543) for this script.

Usage:
    python backend/scripts/refresh_materialized_views.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get DATABASE_URL and convert pooler to direct connection for scripts
DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL and ("pooler" in DATABASE_URL.lower() or ":6543" in DATABASE_URL):
    # Convert pooler connection to direct connection
    # Replace port 6543 with 5432 and remove pooler-specific parts
    if ":6543" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace(":6543", ":5432")
    print("[INFO] Converted pooler connection to direct connection for script execution")
    print("[INFO] Using direct connection to avoid prepared statement issues\n")

# Create engine with disabled statement cache for Supabase compatibility
connect_args = {}
if "supabase.co" in DATABASE_URL:
    connect_args = {"statement_cache_size": 0}

if DATABASE_URL:
    # Ensure asyncpg format
    if DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    script_engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        connect_args=connect_args,
    )
    AsyncSessionLocal = async_sessionmaker(
        script_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
else:
    # Fallback to app's database connection
    from app.core.database import AsyncSessionLocal

# List of materialized views to refresh
MATERIALIZED_VIEWS = [
    "donations_by_state_cycle",
    "top_donors_by_region",
    "graph_edges_by_politician",
    "donations_by_politician_category",
    "top_politicians_by_state",
    "timeline_events_summary",
]


async def refresh_materialized_views():
    """Refresh all materialized views."""
    async with AsyncSessionLocal() as session:
        try:
            print("[INFO] Starting materialized view refresh...")
            print(f"[INFO] Found {len(MATERIALIZED_VIEWS)} materialized views to refresh\n")

            failed_views = []
            
            for view_name in MATERIALIZED_VIEWS:
                try:
                    print(f"  -> Refreshing {view_name}...", end=" ", flush=True)
                    await session.execute(text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view_name}"))
                    await session.commit()
                    print("[OK]")
                except Exception as e:
                    await session.rollback()
                    # If CONCURRENTLY fails (e.g., no unique index), try without it
                    try:
                        await session.execute(text(f"REFRESH MATERIALIZED VIEW {view_name}"))
                        await session.commit()
                        print("[OK] (non-concurrent)")
                    except Exception as e2:
                        print(f"[ERROR] {e2}")
                        await session.rollback()
                        failed_views.append({"view": view_name, "error": str(e2)})

            # Report results based on failures
            if failed_views:
                print(f"\n[WARNING] {len(failed_views)} view(s) failed to refresh:")
                for failure in failed_views:
                    print(f"  - {failure['view']}: {failure['error']}")
                return {"success": False, "failed_views": failed_views}
            else:
                print("\n[SUCCESS] All materialized views refreshed successfully!")
                return {"success": True, "failed_views": []}

        except Exception as e:
            print(f"\n[ERROR] Error refreshing materialized views: {e}")
            await session.rollback()
            return {"success": False, "failed_views": [{"view": "unknown", "error": str(e)}]}
        finally:
            await session.close()


async def get_view_stats():
    """Get statistics about materialized views."""
    async with AsyncSessionLocal() as session:
        try:
            # Build query with proper array syntax for asyncpg
            views_list = list(MATERIALIZED_VIEWS)
            stats_query = text("""
                SELECT 
                    schemaname,
                    matviewname,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
                    (SELECT COUNT(*) FROM information_schema.columns 
                     WHERE table_schema = schemaname AND table_name = matviewname) as column_count
                FROM pg_matviews
                WHERE matviewname = ANY(:views)
                ORDER BY matviewname;
            """)

            result = await session.execute(
                stats_query, {"views": views_list}
            )
            rows = result.mappings().all()

            if rows:
                print("\n[STATS] Materialized View Statistics:")
                print("-" * 60)
                for row in rows:
                    print(
                        f"  {row['matviewname']:.<40} {row['size']:>10} ({row['column_count']} columns)"
                    )
                print("-" * 60)
        except Exception as e:
            print(f"[WARNING] Could not get view statistics: {e}")


async def main():
    """Main entry point."""
    print("=" * 60)
    print("  Materialized Views Refresh Script")
    print("=" * 60)
    print()

    # Check database connection
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        print("[OK] Database connection successful\n")
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        print("\n[TIP] Make sure:")
        print("   1. DATABASE_URL is set in your .env file")
        print("   2. The database is accessible")
        print("   3. All materialized views have been created")
        return 1

    # Refresh views
    success = await refresh_materialized_views()

    # Get statistics
    await get_view_stats()

    return 0 if success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

