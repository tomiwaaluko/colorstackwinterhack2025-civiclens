"""Check database sources and chunks"""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from ingest.web_content_ingest import get_db_connection

async def check_db():
    conn = await get_db_connection()
    
    print("=" * 60)
    print("📊 RAG Database Status")
    print("=" * 60)
    
    # Check sources
    sources = await conn.fetch("SELECT id, title, source_url, source_type FROM rag_sources ORDER BY retrieved_at DESC")
    print(f"\n📚 Sources ({len(sources)} total):")
    for s in sources:
        print(f"  - {s['title'][:50]} | {s['source_type']} | {s['source_url'][:40]}...")
    
    # Check chunks with embeddings
    chunks_with_emb = await conn.fetchval("SELECT COUNT(*) FROM rag_chunks WHERE embedding IS NOT NULL")
    chunks_total = await conn.fetchval("SELECT COUNT(*) FROM rag_chunks")
    print(f"\n📄 Chunks: {chunks_total} total, {chunks_with_emb} with embeddings")
    
    # Check GovTrack specifically
    print("\n🔍 GovTrack sources:")
    govtrack = await conn.fetch("SELECT id, title FROM rag_sources WHERE title ILIKE '%govtrack%' OR source_url ILIKE '%govtrack%'")
    for g in govtrack:
        print(f"  Source ID: {g['id']}")
        chunks = await conn.fetchval("SELECT COUNT(*) FROM rag_chunks WHERE source_id = $1 AND embedding IS NOT NULL", g['id'])
        print(f"  Chunks with embeddings: {chunks}")
    
    if not govtrack:
        print("  ❌ No GovTrack sources found!")
    
    await conn.close()
    print("\n" + "=" * 60)

asyncio.run(check_db())
