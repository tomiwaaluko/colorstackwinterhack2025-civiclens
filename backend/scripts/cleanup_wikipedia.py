"""Delete Wikipedia sources from database, keep only manual sources"""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from ingest.web_content_ingest import get_db_connection

async def cleanup_db():
    conn = await get_db_connection()
    
    print("=" * 60)
    print("🧹 Cleaning up Wikipedia sources")
    print("=" * 60)
    
    # Show what we're deleting
    wikipedia = await conn.fetch("SELECT id, title FROM rag_sources WHERE source_type = 'wikipedia'")
    print(f"\n📚 Found {len(wikipedia)} Wikipedia sources to delete:")
    for w in wikipedia:
        print(f"  - {w['title']}")
    
    if wikipedia:
        # Delete Wikipedia sources (cascades to chunks)
        result = await conn.execute("DELETE FROM rag_sources WHERE source_type = 'wikipedia'")
        print(f"\n✅ Deleted Wikipedia sources")
    
    # Show what remains
    remaining = await conn.fetch("SELECT id, title, source_url, source_type FROM rag_sources")
    print(f"\n📚 Remaining sources ({len(remaining)}):")
    for s in remaining:
        chunks = await conn.fetchval("SELECT COUNT(*) FROM rag_chunks WHERE source_id = $1", s['id'])
        print(f"  - {s['title']} ({chunks} chunks)")
    
    await conn.close()
    print("\n" + "=" * 60)
    print("✨ Cleanup complete!")
    print("=" * 60)

asyncio.run(cleanup_db())
