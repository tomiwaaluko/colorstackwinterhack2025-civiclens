-- Migration: Create Database Schema (WITH DROP - Use if tables already exist)
-- Description: Drops existing tables and recreates with proper schema
-- WARNING: This will delete all existing data!
-- Use this if you have existing tables without the correct schema

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS source_chunks CASCADE;
DROP TABLE IF EXISTS statements CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS offices CASCADE;
DROP TABLE IF EXISTS politicians CASCADE;
DROP TABLE IF EXISTS sources CASCADE;

-- Now run the main schema creation
-- (Rest of the file continues with the original CREATE TABLE statements)

-- ============================================================================
-- SOURCES TABLE (must be created first - referenced by all other tables)
-- ============================================================================
CREATE TABLE sources (
    id SERIAL PRIMARY KEY,
    source_url TEXT NOT NULL,
    publisher TEXT NOT NULL,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('vote', 'bill', 'bill_sponsor', 'donation', 'statement')),
    published_at TIMESTAMP WITH TIME ZONE,
    retrieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    license_notes TEXT,
    raw_text TEXT,
    raw_text_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_sources_publisher ON sources(publisher);
CREATE INDEX idx_sources_url ON sources(source_url);

-- ============================================================================
-- POLITICIANS TABLE
-- ============================================================================
CREATE TABLE politicians (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    party TEXT NOT NULL CHECK (party IN ('Democrat', 'Republican', 'Independent', 'Other')),
    state_code CHAR(2),  -- 2-letter USPS state code (CA, NY, etc.)
    district_number INTEGER CHECK (district_number IS NULL OR (district_number >= 1 AND district_number <= 53)),
    "position" TEXT NOT NULL CHECK ("position" IN ('President', 'Vice President', 'Senator', 'Representative', 'Governor', 'Other')),
    image_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_politicians_state_code ON politicians(state_code);
CREATE INDEX idx_politicians_party ON politicians(party);
CREATE INDEX idx_politicians_position ON politicians("position");
CREATE INDEX idx_politicians_name ON politicians(name);

-- ============================================================================
-- OFFICES TABLE
-- ============================================================================
CREATE TABLE offices (
    id SERIAL PRIMARY KEY,
    politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    "position" TEXT NOT NULL,
    state_code CHAR(2),
    district_number INTEGER,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_offices_politician_id ON offices(politician_id);
CREATE INDEX idx_offices_state_code ON offices(state_code);

-- ============================================================================
-- BILLS TABLE
-- ============================================================================
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    bill_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    topic TEXT,
    introduced_date DATE,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bills_bill_number ON bills(bill_number);
CREATE INDEX idx_bills_topic ON bills(topic);
CREATE INDEX idx_bills_introduced_date ON bills(introduced_date);
CREATE INDEX idx_bills_source_id ON bills(source_id);

-- ============================================================================
-- VOTES TABLE
-- ============================================================================
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    vote_position TEXT NOT NULL CHECK (vote_position IN ('yes', 'no', 'abstain', 'not_voting')),
    vote_date DATE NOT NULL,
    topic TEXT,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_votes_politician_id ON votes(politician_id);
CREATE INDEX idx_votes_bill_id ON votes(bill_id);
CREATE INDEX idx_votes_vote_date ON votes(vote_date);
CREATE INDEX idx_votes_vote_position ON votes(vote_position);
CREATE INDEX idx_votes_topic ON votes(topic);
CREATE INDEX idx_votes_source_id ON votes(source_id);
CREATE INDEX idx_votes_politician_date ON votes(politician_id, vote_date);

-- ============================================================================
-- DONATIONS TABLE
-- ============================================================================
CREATE TABLE donations (
    id SERIAL PRIMARY KEY,
    politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    donor_name TEXT NOT NULL,
    donor_category TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL,
    state_code CHAR(2),
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_donations_politician_id ON donations(politician_id);
CREATE INDEX idx_donations_date ON donations(date);
CREATE INDEX idx_donations_state_code ON donations(state_code);
CREATE INDEX idx_donations_donor_category ON donations(donor_category);
CREATE INDEX idx_donations_source_id ON donations(source_id);
CREATE INDEX idx_donations_state_category ON donations(state_code, donor_category);
CREATE INDEX idx_donations_politician_category ON donations(politician_id, donor_category);

-- ============================================================================
-- STATEMENTS TABLE
-- ============================================================================
CREATE TABLE statements (
    id SERIAL PRIMARY KEY,
    politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    date DATE,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_statements_politician_id ON statements(politician_id);
CREATE INDEX idx_statements_date ON statements(date);
CREATE INDEX idx_statements_source_id ON statements(source_id);

-- ============================================================================
-- SOURCE_CHUNKS TABLE
-- ============================================================================
CREATE TABLE source_chunks (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    start_offset INTEGER,
    end_offset INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_id, chunk_index)
);

CREATE INDEX idx_source_chunks_source_id ON source_chunks(source_id);

-- ============================================================================
-- EMBEDDINGS TABLE
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
    id SERIAL PRIMARY KEY,
    chunk_id INTEGER NOT NULL REFERENCES source_chunks(id) ON DELETE CASCADE,
    embedding vector(1536),
    model_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chunk_id)
);

CREATE INDEX idx_embeddings_vector ON embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE sources IS 'Non-negotiable provenance table: every factual record must reference at least one source';
COMMENT ON TABLE politicians IS 'Politicians with standardized state_code (2-letter) and district_number fields';
COMMENT ON TABLE offices IS 'Office history tracking for politicians';
COMMENT ON TABLE bills IS 'Legislative bills with topics for network graph visualization';
COMMENT ON TABLE votes IS 'Voting records with dates for timeline visualization';
COMMENT ON TABLE donations IS 'Donations with geographic data (state_code) for map visualization';
COMMENT ON TABLE statements IS 'Official statements from politicians';
COMMENT ON TABLE source_chunks IS 'Text chunks from sources for RAG/AI processing';
COMMENT ON TABLE embeddings IS 'Vector embeddings for semantic search using pgvector';

COMMENT ON COLUMN politicians.state_code IS '2-letter USPS state code (CA, NY, etc.)';
COMMENT ON COLUMN politicians.district_number IS 'Congressional district number (1-53) or NULL for senators/presidents';
COMMENT ON COLUMN donations.state_code IS 'State where donation originated or politician''s state';
COMMENT ON COLUMN votes.vote_date IS 'Date of vote - critical for timeline visualizations';
COMMENT ON COLUMN donations.date IS 'Date of donation - critical for timeline visualizations';

