"""
Manual content ingestion utilities for RAG sources.
Provides functions to chunk text, generate embeddings, and store in database.

This module is used by scripts/add_manual_source.py for manual data curation.
No web scraping - you provide the content directly.

Usage:
    from ingest.web_content_ingest import chunk_text, generate_embedding, get_db_connection
"""

import os
import asyncpg
from typing import List
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL = "text-embedding-004"

# Chunk settings
CHUNK_SIZE = 500  # Characters per chunk
CHUNK_OVERLAP = 50  # Overlap between chunks


async def get_db_connection():
    """Create database connection"""
    database_url = DATABASE_URL
    # Convert SQLAlchemy format to asyncpg format
    # postgresql+asyncpg://... -> postgresql://...
    database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    database_url = database_url.replace("postgres+asyncpg://", "postgresql://")
    # Disable statement cache for pgbouncer compatibility
    return await asyncpg.connect(database_url, statement_cache_size=0)


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks"""
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        
        # Only add non-empty chunks
        if chunk.strip():
            chunks.append(chunk)
        
        # Move start position (with overlap)
        start = end - overlap
        
        # Prevent infinite loop
        if start >= len(text):
            break
    
    return chunks


def generate_embedding(text: str) -> List[float]:
    """Generate embedding using Gemini"""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")
    
    client = genai.Client(api_key=GEMINI_API_KEY)
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config={"output_dimensionality": 768}  # Match database vector dimension
    )
    
    # Extract embedding values
    if hasattr(result, "embeddings") and result.embeddings:
        emb = result.embeddings[0]
        return list(getattr(emb, "values", None) or getattr(emb, "embedding", None) or emb)
    elif hasattr(result, "embedding"):
        emb = result.embedding
        return list(getattr(emb, "values", None) or emb)
    
    raise ValueError("No embedding returned")


# Example usage for testing
if __name__ == "__main__":
    import asyncio
    
    async def test_utilities():
        """Test the utility functions"""
        
        print("Testing chunk_text...")
        sample_text = "This is a test. " * 100
        chunks = chunk_text(sample_text, chunk_size=100, overlap=20)
        print(f"  Created {len(chunks)} chunks from {len(sample_text)} characters")
        
        print("\nTesting generate_embedding...")
        embedding = generate_embedding("Hello world")
        print(f"  Generated embedding with {len(embedding)} dimensions")
        
        print("\nTesting database connection...")
        try:
            conn = await get_db_connection()
            print("  ✅ Connected to database")
            
            # Test query
            count = await conn.fetchval("SELECT COUNT(*) FROM rag_sources")
            print(f"  Found {count} existing sources")
            
            await conn.close()
            print("  ✅ Connection closed")
        except Exception as e:
            print(f"  ❌ Database error: {e}")
        
        print("\n✅ All tests complete!")
    
    asyncio.run(test_utilities())
