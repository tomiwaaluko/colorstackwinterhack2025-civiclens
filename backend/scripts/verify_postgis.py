#!/usr/bin/env python3
"""
Script to verify PostGIS installation in Supabase/PostgreSQL database.
Run this after enabling PostGIS to ensure it's working correctly.
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Add parent directory to path to import database module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()


async def verify_postgis():
    """Verify PostGIS is installed and working."""
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        print("Please set DATABASE_URL in your .env file")
        return False
    
    # Convert connection string if needed
    if database_url.startswith("postgresql://") and "+asyncpg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    try:
        print(f"🔌 Connecting to database...")
        engine = create_async_engine(database_url, echo=False)
        
        async with engine.begin() as conn:
            # Check PostGIS version
            print("📊 Checking PostGIS version...")
            result = await conn.execute(text("SELECT PostGIS_version();"))
            version = result.scalar()
            print(f"✅ PostGIS version: {version}")
            
            # Check if PostGIS extension exists
            result = await conn.execute(
                text("""
                    SELECT extname, extversion 
                    FROM pg_extension 
                    WHERE extname = 'postgis';
                """)
            )
            extension = result.fetchone()
            
            if extension:
                print(f"✅ PostGIS extension installed: {extension[1]}")
            else:
                print("⚠️  WARNING: PostGIS extension not found in pg_extension table")
                print("   Run the migration: migrations/0001_enable_postgis.sql")
                return False
            
            # Test a simple PostGIS function
            print("🧪 Testing PostGIS functions...")
            result = await conn.execute(
                text("""
                    SELECT ST_AsText(ST_MakePoint(0, 0)) as test_point;
                """)
            )
            test_result = result.scalar()
            print(f"✅ PostGIS function test passed: {test_result}")
            
        await engine.dispose()
        print("\n✅ All PostGIS checks passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Verify DATABASE_URL is correct in your .env file")
        print("2. Ensure Supabase database is accessible")
        print("3. Run migration: migrations/0001_enable_postgis.sql")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("PostGIS Verification Script")
    print("=" * 60)
    print()
    
    success = asyncio.run(verify_postgis())
    
    sys.exit(0 if success else 1)

