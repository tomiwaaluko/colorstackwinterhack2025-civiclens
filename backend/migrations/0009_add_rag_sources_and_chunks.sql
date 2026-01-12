-- Migration: 0009_add_rag_sources_and_chunks.sql
-- Description: Add tables for RAG sources and text chunks with embeddings
-- Purpose: Store web content and documents for AI Q&A with proper citations
-- Requires: PostgreSQL 14+, pgvector extension

-- ============================================================================
-- Drop existing tables if they exist (for clean re-run)
-- ============================================================================
DROP TABLE IF EXISTS rag_chunks CASCADE;
DROP TABLE IF EXISTS rag_sources CASCADE;
DROP VIEW IF EXISTS rag_source_stats CASCADE;

-- ============================================================================
-- Enable pgvector extension for embeddings
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- RAG_SOURCES TABLE
-- Stores metadata about documents/webpages used for RAG
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source identification
    source_url TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'wikipedia',           -- Wikipedia articles
        'gov_website',        -- Official government websites (.gov)
        'news_article',       -- News articles
        'academic_paper',     -- Academic papers/journals
        'official_document',  -- Official documents (bills, reports, etc.)
        'social_media',       -- Twitter, Facebook posts
        'press_release',      -- Official press releases
        'database',           -- From CivicLens database
        'api_data',           -- From APIs (ProPublica, OpenSecrets, etc.)
        'other'
    )),
    
    -- Content metadata
    title TEXT NOT NULL,
    publisher TEXT NOT NULL,
    author TEXT,
    published_at TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Full content (optional - store if you want to re-process)
    full_text TEXT,
    html_content TEXT,
    
    -- Optional: Link to politician(s) this source is about
    politician_ids UUID[] DEFAULT '{}',
    
    -- Optional: Topics/tags for filtering
    topics TEXT[] DEFAULT '{}',
    
    -- Quality/trust scoring
    credibility_score DECIMAL(3,2) CHECK (credibility_score BETWEEN 0 AND 1),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT rag_sources_url_unique UNIQUE (source_url)
);

-- Indexes for efficient querying
CREATE INDEX idx_rag_sources_type ON rag_sources(source_type);
CREATE INDEX idx_rag_sources_politician_ids ON rag_sources USING GIN(politician_ids);
CREATE INDEX idx_rag_sources_topics ON rag_sources USING GIN(topics);
CREATE INDEX idx_rag_sources_published_at ON rag_sources(published_at DESC);
CREATE INDEX idx_rag_sources_credibility ON rag_sources(credibility_score DESC);

-- ============================================================================
-- RAG_CHUNKS TABLE
-- Stores text chunks with embeddings for semantic search
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to source
    source_id UUID NOT NULL REFERENCES rag_sources(id) ON DELETE CASCADE,
    
    -- Chunk content
    text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,  -- Position in original document (0-based)
    
    -- Vector embedding for semantic search (1536 dimensions for text-embedding-ada-002, or adjust for your model)
    -- For Gemini embeddings, typically 768 dimensions
    embedding vector(768),
    
    -- Optional: politician mentions in this chunk
    politician_ids UUID[] DEFAULT '{}',
    
    -- Optional: for better context
    section_title TEXT,
    page_number INTEGER,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT rag_chunks_unique_chunk UNIQUE (source_id, chunk_index)
);

-- Indexes for efficient querying
CREATE INDEX idx_rag_chunks_source_id ON rag_chunks(source_id);
CREATE INDEX idx_rag_chunks_politician_ids ON rag_chunks USING GIN(politician_ids);

-- HNSW index for fast vector similarity search (requires pgvector)
-- Using cosine distance (good for normalized embeddings)
CREATE INDEX idx_rag_chunks_embedding_cosine ON rag_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index (faster to build, slightly slower search)
-- Uncomment if HNSW is too slow to build or you prefer this approach
-- CREATE INDEX idx_rag_chunks_embedding_ivfflat ON rag_chunks 
--     USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rag_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rag_sources_updated_at_trigger
    BEFORE UPDATE ON rag_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_rag_sources_updated_at();

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View to get chunk count per source
CREATE OR REPLACE VIEW rag_source_stats AS
SELECT 
    rs.id,
    rs.source_url,
    rs.title,
    rs.source_type,
    rs.publisher,
    rs.credibility_score,
    COUNT(rc.id) as chunk_count,
    rs.created_at,
    rs.updated_at
FROM rag_sources rs
LEFT JOIN rag_chunks rc ON rs.id = rc.source_id
GROUP BY rs.id;

-- ============================================================================
-- EXAMPLE QUERIES FOR REFERENCE
-- ============================================================================

-- Example 1: Semantic search for chunks similar to a question
-- COMMENT: Find top 10 most similar chunks using cosine similarity
/*
WITH query_embedding AS (
    SELECT '[0.1, 0.2, ...]'::vector AS embedding
)
SELECT 
    rc.id,
    rc.text,
    rs.title,
    rs.source_url,
    rs.publisher,
    rs.source_type,
    1 - (rc.embedding <=> qe.embedding) AS similarity_score
FROM rag_chunks rc
JOIN rag_sources rs ON rc.source_id = rs.id
CROSS JOIN query_embedding qe
ORDER BY rc.embedding <=> qe.embedding
LIMIT 10;
*/

-- Example 2: Get all chunks for a specific source with full metadata
/*
SELECT 
    rc.id as chunk_id,
    rc.text,
    rc.chunk_index,
    rc.section_title,
    rs.title as source_title,
    rs.source_url,
    rs.publisher,
    rs.source_type,
    rs.published_at,
    rs.retrieved_at
FROM rag_chunks rc
JOIN rag_sources rs ON rc.source_id = rs.id
WHERE rs.id = 'source-uuid-here'
ORDER BY rc.chunk_index;
*/

-- Example 3: Find high-credibility sources about specific politicians
/*
SELECT 
    rs.*,
    COUNT(rc.id) as chunk_count
FROM rag_sources rs
LEFT JOIN rag_chunks rc ON rs.id = rc.source_id
WHERE 
    'politician-uuid-here' = ANY(rs.politician_ids)
    AND rs.credibility_score >= 0.8
    AND rs.source_type IN ('gov_website', 'official_document')
GROUP BY rs.id
ORDER BY rs.credibility_score DESC, rs.published_at DESC;
*/

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE rag_sources IS 'Metadata for documents and web pages used in RAG Q&A';
COMMENT ON TABLE rag_chunks IS 'Text chunks with embeddings for semantic search';

COMMENT ON COLUMN rag_sources.source_type IS 'Type of source: wikipedia, gov_website, news_article, etc.';
COMMENT ON COLUMN rag_sources.credibility_score IS 'Score from 0 to 1 indicating source trustworthiness';
COMMENT ON COLUMN rag_chunks.embedding IS 'Vector embedding (768 dimensions for Gemini) for semantic search';
COMMENT ON COLUMN rag_chunks.chunk_index IS '0-based position of chunk in original document';
