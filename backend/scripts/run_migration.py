"""
Run a SQL migration file against the database.
Usage: python scripts/run_migration.py migrations/0009_add_rag_sources_and_chunks.sql
"""

import asyncio
import asyncpg
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def run_migration(migration_file: str):
    """Execute a SQL migration file."""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ ERROR: DATABASE_URL not found in environment")
        print("   Make sure you have a .env file with DATABASE_URL set")
        return False
    
    # Convert SQLAlchemy format to asyncpg format
    # postgresql+asyncpg://... -> postgresql://...
    database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    database_url = database_url.replace("postgres+asyncpg://", "postgresql://")
    
    # Read migration file
    migration_path = Path(__file__).parent.parent / migration_file
    if not migration_path.exists():
        print(f"❌ ERROR: Migration file not found: {migration_path}")
        return False
    
    print(f"📖 Reading migration file: {migration_file}")
    sql_content = migration_path.read_text(encoding='utf-8')
    
    # Connect to database
    print(f"🔌 Connecting to database...")
    try:
        # Disable statement cache for pgbouncer compatibility
        conn = await asyncpg.connect(database_url, statement_cache_size=0)
        print("✅ Connected to database")
    except Exception as e:
        print(f"❌ ERROR: Failed to connect to database: {e}")
        return False
    
    try:
        # Execute migration
        print(f"🚀 Running migration...")
        await conn.execute(sql_content)
        print("✅ Migration completed successfully!")
        
        # Verify tables were created
        print("\n📊 Verifying tables...")
        
        # Check rag_sources table
        sources_count = await conn.fetchval("SELECT COUNT(*) FROM rag_sources")
        print(f"   ✓ rag_sources table exists (rows: {sources_count})")
        
        # Check rag_chunks table
        chunks_count = await conn.fetchval("SELECT COUNT(*) FROM rag_chunks")
        print(f"   ✓ rag_chunks table exists (rows: {chunks_count})")
        
        # Check pgvector extension
        vector_ext = await conn.fetchval(
            "SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector'"
        )
        if vector_ext > 0:
            print(f"   ✓ pgvector extension enabled")
        else:
            print(f"   ⚠️  WARNING: pgvector extension not found")
        
        # Check indexes
        indexes = await conn.fetch("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename IN ('rag_sources', 'rag_chunks')
        """)
        print(f"   ✓ {len(indexes)} indexes created")
        for idx in indexes:
            print(f"      - {idx['indexname']}")
        
        print("\n✨ Database is ready for RAG sources!")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await conn.close()
        print("🔌 Database connection closed")

async def main():
    """Main entry point."""
    
    # Get migration file from command line or use default
    if len(sys.argv) > 1:
        migration_file = sys.argv[1]
    else:
        migration_file = "migrations/0009_add_rag_sources_and_chunks.sql"
    
    print("=" * 60)
    print("🗄️  CivicLens Database Migration Runner")
    print("=" * 60)
    print()
    
    success = await run_migration(migration_file)
    
    print()
    print("=" * 60)
    if success:
        print("✅ Migration completed successfully!")
        print()
        print("Next steps:")
        print("  1. Run: python ingest/web_content_ingest.py")
        print("  2. Add web sources to the database")
        print("  3. Test the AI with: http://localhost:3000/ask")
    else:
        print("❌ Migration failed. Please check the errors above.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
