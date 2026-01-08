#!/usr/bin/env python3
"""
Source Chunking and Embeddings Script

Chunks source text into manageable pieces and generates embeddings for RAG.
Maintains 1:1 mapping between sources and chunks, preserves offsets for citation tracking.

Requirements:
    pip install psycopg2-binary python-dotenv google-genai tiktoken

Environment variables (.env):
    DATABASE_URL=postgresql://user:pass@localhost/dbname
    GEMINI_API_KEY=your_key_here
    GEMINI_EMBEDDING_MODEL=gemini-embedding-001 (optional)
"""

import os
import sys
import logging
import re
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('chunk_sources.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

try:
    from google import genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    logger.warning("google-genai not installed. Embeddings will not be generated.")

try:
    import tiktoken
    HAS_TIKTOKEN = True
except ImportError:
    HAS_TIKTOKEN = False
    logger.warning("tiktoken not installed. Will use character-based chunking.")

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
EMBEDDING_MODEL = os.getenv('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment")

# Chunking configuration
CHUNK_SIZE_TOKENS = 600  # Target chunk size in tokens
CHUNK_OVERLAP_TOKENS = 100  # Overlap between chunks
MIN_CHUNK_SIZE_TOKENS = 300  # Minimum chunk size
MAX_CHUNK_SIZE_TOKENS = 800  # Maximum chunk size

if HAS_TIKTOKEN:
    # Use cl100k_base (GPT-3.5/4 tokenizer) as approximation
    encoding = tiktoken.get_encoding("cl100k_base")


@dataclass
class Chunk:
    """Represents a text chunk"""
    text: str
    start_offset: int
    end_offset: int
    chunk_index: int
    token_count: int


def count_tokens(text: str) -> int:
    """Count tokens in text"""
    if HAS_TIKTOKEN:
        return len(encoding.encode(text))
    else:
        # Rough approximation: 1 token ≈ 4 characters
        return len(text) // 4


def split_text_into_chunks(text: str, chunk_size: int = CHUNK_SIZE_TOKENS, 
                           overlap: int = CHUNK_OVERLAP_TOKENS) -> List[Chunk]:
    """
    Split text into chunks with overlap, respecting sentence boundaries.
    
    Args:
        text: Text to chunk
        chunk_size: Target chunk size in tokens
        overlap: Overlap size in tokens between chunks
    
    Returns:
        List of Chunk objects
    """
    chunks = []
    
    # If text is small enough, return single chunk
    total_tokens = count_tokens(text)
    if total_tokens <= chunk_size:
        return [Chunk(text, 0, len(text), 0, total_tokens)]
    
    # Split by sentences first (basic approach)
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    current_chunk_text = ""
    current_chunk_start = 0
    chunk_index = 0
    
    for sentence in sentences:
        sentence_tokens = count_tokens(sentence)
        current_tokens = count_tokens(current_chunk_text)
        
        # If adding this sentence would exceed max size, finalize current chunk
        if current_tokens + sentence_tokens > MAX_CHUNK_SIZE_TOKENS and current_chunk_text:
            # Finalize chunk
            end_offset = current_chunk_start + len(current_chunk_text)
            chunks.append(Chunk(
                text=current_chunk_text.strip(),
                start_offset=current_chunk_start,
                end_offset=end_offset,
                chunk_index=chunk_index,
                token_count=current_tokens
            ))
            
            # Start new chunk with overlap
            overlap_text = get_overlap_text(text, current_chunk_start, overlap)
            current_chunk_text = overlap_text + " " + sentence
            current_chunk_start = end_offset - len(overlap_text)
            chunk_index += 1
        
        # If current chunk is large enough, consider finalizing
        elif current_tokens >= chunk_size:
            # Try to finish at sentence boundary
            end_offset = current_chunk_start + len(current_chunk_text)
            
            # Only finalize if we have minimum size
            if current_tokens >= MIN_CHUNK_SIZE_TOKENS:
                chunks.append(Chunk(
                    text=current_chunk_text.strip(),
                    start_offset=current_chunk_start,
                    end_offset=end_offset,
                    chunk_index=chunk_index,
                    token_count=current_tokens
                ))
                
                # Start new chunk with overlap
                overlap_text = get_overlap_text(text, current_chunk_start, overlap)
                current_chunk_text = overlap_text + " " + sentence
                current_chunk_start = end_offset - len(overlap_text)
                chunk_index += 1
            else:
                # Keep building
                current_chunk_text += " " + sentence
        else:
            # Add sentence to current chunk
            current_chunk_text += " " + sentence if current_chunk_text else sentence
    
    # Add final chunk
    if current_chunk_text.strip():
        end_offset = current_chunk_start + len(current_chunk_text)
        chunks.append(Chunk(
            text=current_chunk_text.strip(),
            start_offset=current_chunk_start,
            end_offset=end_offset,
            chunk_index=chunk_index,
            token_count=count_tokens(current_chunk_text)
        ))
    
    return chunks


def get_overlap_text(text: str, start_pos: int, overlap_tokens: int) -> str:
    """Get overlap text from end of previous chunk"""
    if start_pos <= 0:
        return ""
    
    # Get text from start_pos backwards
    overlap_start = max(0, start_pos - (overlap_tokens * 4))  # Approximate
    overlap_text = text[overlap_start:start_pos]
    
    # Trim to exactly overlap_tokens
    tokens = count_tokens(overlap_text)
    if tokens > overlap_tokens:
        # Trim from start
        words = overlap_text.split()
        while count_tokens(' '.join(words)) > overlap_tokens:
            words.pop(0)
        overlap_text = ' '.join(words)
    
    return overlap_text


def generate_embedding(text: str) -> List[float]:
    """Generate embedding using Gemini API"""
    if not HAS_GEMINI:
        raise ValueError("google-genai not installed. Cannot generate embeddings.")
    
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not found in environment")
    
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
        )
        
        # Extract embedding vector
        emb = None
        if hasattr(result, "embeddings") and result.embeddings:
            first = result.embeddings[0]
            emb = getattr(first, "values", None) or getattr(first, "embedding", None) or first
        elif hasattr(result, "embedding"):
            emb = getattr(result.embedding, "values", None) or result.embedding
        
        if emb is None:
            raise ValueError("Embedding call returned no embedding vector")
        
        return list(emb)
    
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        raise


class DatabaseManager:
    """Database connection and operations manager"""
    
    def __init__(self, connection_string: str):
        try:
            # Convert asyncpg URL to psycopg2 format if needed
            if "+asyncpg" in connection_string:
                connection_string = connection_string.replace("+asyncpg", "")
            
            self.conn = psycopg2.connect(connection_string, connect_timeout=10)
            self.conn.autocommit = False
        except psycopg2.OperationalError as e:
            error_msg = str(e)
            if "could not translate host name" in error_msg.lower():
                logger.error(f"DNS resolution failed for database host. Error: {e}")
            raise
        
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.conn.rollback()
            logger.error("Transaction rolled back due to error")
        else:
            self.conn.commit()
            logger.info("Transaction committed")
        self.conn.close()
    
    def get_sources_with_raw_text(self, source_type: str = None, limit: int = None) -> List[Dict]:
        """Get sources that have raw_text but no chunks yet"""
        with self.conn.cursor(cursor_factory=DictCursor) as cur:
            query = """
                SELECT s.id, s.source_url, s.title, s.raw_text, s.source_type
                FROM sources s
                WHERE s.raw_text IS NOT NULL 
                  AND s.raw_text != ''
                  AND NOT EXISTS (
                      SELECT 1 FROM source_chunks sc WHERE sc.source_id = s.id
                  )
            """
            
            params = []
            if source_type:
                query += " AND s.source_type = %s"
                params.append(source_type)
            
            query += " ORDER BY s.id"
            
            if limit:
                query += " LIMIT %s"
                params.append(limit)
            
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
    
    def get_source_by_id(self, source_id: int) -> Optional[Dict]:
        """Get a single source by ID if it has raw_text"""
        with self.conn.cursor(cursor_factory=DictCursor) as cur:
            cur.execute("""
                SELECT s.id, s.source_url, s.title, s.raw_text, s.source_type
                FROM sources s
                WHERE s.id = %s
                  AND s.raw_text IS NOT NULL 
                  AND s.raw_text != ''
            """, (source_id,))
            result = cur.fetchone()
            return dict(result) if result else None
    
    def delete_chunks_for_source(self, source_id: int):
        """Delete existing chunks and embeddings for a source"""
        with self.conn.cursor() as cur:
            # Delete embeddings first (foreign key constraint)
            cur.execute("""
                DELETE FROM embeddings 
                WHERE chunk_id IN (
                    SELECT id FROM source_chunks WHERE source_id = %s
                )
            """, (source_id,))
            
            # Delete chunks
            cur.execute("DELETE FROM source_chunks WHERE source_id = %s", (source_id,))
            logger.info(f"Deleted existing chunks for source {source_id}")
    
    def insert_chunk(self, source_id: int, chunk: Chunk) -> int:
        """Insert a chunk and return its ID"""
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO source_chunks (source_id, chunk_text, chunk_index, start_offset, end_offset)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (
                source_id,
                chunk.text,
                chunk.chunk_index,
                chunk.start_offset,
                chunk.end_offset
            ))
            chunk_id = cur.fetchone()[0]
            return chunk_id
    
    def insert_embedding(self, chunk_id: int, embedding: List[float], model_name: str):
        """Insert embedding for a chunk"""
        with self.conn.cursor() as cur:
            # Check if embedding already exists
            cur.execute("SELECT id FROM embeddings WHERE chunk_id = %s", (chunk_id,))
            if cur.fetchone():
                # Update existing (don't modify created_at)
                cur.execute("""
                    UPDATE embeddings 
                    SET embedding = %s::vector, model_name = %s
                    WHERE chunk_id = %s
                """, (str(embedding), model_name, chunk_id))
            else:
                # Insert new
                cur.execute("""
                    INSERT INTO embeddings (chunk_id, embedding, model_name)
                    VALUES (%s, %s::vector, %s)
                """, (chunk_id, str(embedding), model_name))


class ChunkingPipeline:
    """Main chunking orchestrator"""
    
    def __init__(self, db_manager: DatabaseManager, generate_embeddings: bool = True):
        self.db = db_manager
        self.generate_embeddings = generate_embeddings and HAS_GEMINI and GEMINI_API_KEY
        
        if self.generate_embeddings:
            logger.info("Embedding generation enabled")
        else:
            logger.warning("Embedding generation disabled (will only create chunks)")
    
    def process_source(self, source: Dict, regenerate: bool = False):
        """Process a single source: chunk and generate embeddings"""
        source_id = source['id']
        source_url = source['source_url']
        raw_text = source['raw_text']
        
        logger.info(f"Processing source {source_id}: {source_url}")
        
        if not raw_text or len(raw_text.strip()) < 100:
            logger.warning(f"Source {source_id} has insufficient text, skipping")
            return
        
        try:
            # Delete existing chunks if regenerating
            if regenerate:
                self.db.delete_chunks_for_source(source_id)
            
            # Chunk the text
            chunks = split_text_into_chunks(raw_text)
            logger.info(f"Created {len(chunks)} chunks for source {source_id}")
            
            # Insert chunks and generate embeddings
            for chunk in chunks:
                chunk_id = self.db.insert_chunk(source_id, chunk)
                
                if self.generate_embeddings:
                    try:
                        embedding = generate_embedding(chunk.text)
                        self.db.insert_embedding(chunk_id, embedding, EMBEDDING_MODEL)
                    except Exception as e:
                        logger.error(f"Failed to generate embedding for chunk {chunk_id}: {e}")
                        # Continue with other chunks
            
            logger.info(f"Completed processing source {source_id}")
            
        except Exception as e:
            logger.error(f"Failed to process source {source_id}: {e}")
            raise
    
    def process_all_sources(self, source_type: str = None, limit: int = None, regenerate: bool = False):
        """Process all sources that need chunking"""
        sources = self.db.get_sources_with_raw_text(source_type, limit)
        
        logger.info(f"Found {len(sources)} sources to process")
        
        for source in sources:
            try:
                self.process_source(source, regenerate)
            except Exception as e:
                logger.error(f"Failed to process source {source['id']}: {e}")
                continue
        
        logger.info(f"Completed processing {len(sources)} sources")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Chunk Sources and Generate Embeddings')
    parser.add_argument('--source-id', type=int, help='Process specific source ID')
    parser.add_argument('--source-type', type=str, help='Process only sources of this type')
    parser.add_argument('--limit', type=int, help='Limit number of sources to process')
    parser.add_argument('--regenerate', action='store_true', 
                       help='Regenerate chunks and embeddings (deletes existing)')
    parser.add_argument('--no-embeddings', action='store_true',
                       help='Skip embedding generation (chunks only)')
    
    args = parser.parse_args()
    
    logger.info("=== Chunking and Embeddings Pipeline Started ===")
    
    with DatabaseManager(DATABASE_URL) as db:
        pipeline = ChunkingPipeline(db, generate_embeddings=not args.no_embeddings)
        
        try:
            if args.source_id:
                # Process specific source
                source = db.get_source_by_id(args.source_id)
                if source:
                    pipeline.process_source(source, args.regenerate)
                else:
                    logger.error(f"Source {args.source_id} not found or already processed")
            else:
                # Process all sources
                pipeline.process_all_sources(
                    source_type=args.source_type,
                    limit=args.limit,
                    regenerate=args.regenerate
                )
                    
        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            raise
    
    logger.info("=== Chunking and Embeddings Pipeline Complete ===")


if __name__ == "__main__":
    main()

