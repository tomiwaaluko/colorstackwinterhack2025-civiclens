-- Migration: 0001_init.sql
-- Description: Initial schema for CivicLens MVP
-- Requires: PostgreSQL 14+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SOURCES TABLE (Provenance - must be created first)
-- ============================================================================

CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT NOT NULL,
    publisher TEXT NOT NULL,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('vote', 'bill', 'donation', 'statement', 'member', 'profile', 'press_release', 'social_media')),
    published_at TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    license_notes TEXT,
    raw_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_sources_url ON sources(source_url);

-- ============================================================================
-- POLITICIANS TABLE
-- ============================================================================

CREATE TABLE politicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT,
    external_id_source TEXT,
    -- Primary name fields (full_name is canonical, name is alias)
    full_name TEXT NOT NULL,
    name TEXT,  -- Alias for ingestion compatibility
    party TEXT CHECK (party IN ('Democrat', 'Republican', 'Independent', 'Democratic', 'Libertarian', 'Green', 'Other')),
    -- Location fields (state is canonical, state_code is alias)
    state TEXT,
    state_code TEXT,  -- Alias for ingestion compatibility
    -- Office fields
    current_office TEXT,
    "position" TEXT,  -- Senator, Representative, etc.
    district_number INTEGER,
    -- Additional fields
    image_url TEXT,
    bio_text TEXT,
    -- Provenance
    source_id UUID NOT NULL REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_politicians_state ON politicians(state);
CREATE INDEX idx_politicians_state_code ON politicians(state_code);
CREATE INDEX idx_politicians_full_name ON politicians(full_name);
CREATE INDEX idx_politicians_name ON politicians(name);
CREATE INDEX idx_politicians_party ON politicians(party);

-- Trigger to sync name/full_name and state/state_code columns
CREATE OR REPLACE FUNCTION sync_politician_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync name and full_name
    IF NEW.name IS NOT NULL AND NEW.full_name IS NULL THEN
        NEW.full_name := NEW.name;
    ELSIF NEW.full_name IS NOT NULL AND NEW.name IS NULL THEN
        NEW.name := NEW.full_name;
    END IF;
    
    -- Sync state and state_code
    IF NEW.state_code IS NOT NULL AND NEW.state IS NULL THEN
        NEW.state := NEW.state_code;
    ELSIF NEW.state IS NOT NULL AND NEW.state_code IS NULL THEN
        NEW.state_code := NEW.state;
    END IF;
    
    -- Sync position and current_office
    IF NEW."position" IS NOT NULL AND NEW.current_office IS NULL THEN
        NEW.current_office := NEW."position";
    ELSIF NEW.current_office IS NOT NULL AND NEW."position" IS NULL THEN
        NEW."position" := CASE 
            WHEN NEW.current_office ILIKE '%senator%' THEN 'Senator'
            WHEN NEW.current_office ILIKE '%representative%' THEN 'Representative'
            ELSE NEW.current_office
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_politician_columns_trigger
    BEFORE INSERT OR UPDATE ON politicians
    FOR EACH ROW
    EXECUTE FUNCTION sync_politician_columns();

-- ============================================================================
-- OFFICES TABLE (Historical and current positions)
-- ============================================================================

CREATE TABLE offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    office_type TEXT NOT NULL,
    state TEXT,
    district TEXT,
    start_date DATE,
    end_date DATE,
    party_at_time TEXT,
    source_id UUID NOT NULL REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_offices_politician ON offices(politician_id);

-- ============================================================================
-- BILLS TABLE
-- ============================================================================

CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT,
    bill_number TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    topic TEXT,  -- Primary topic/subject
    sponsor_id UUID REFERENCES politicians(id),
    introduced_date DATE,
    congress_number INT,
    chamber TEXT CHECK (chamber IN ('house', 'senate', 'joint')),
    status TEXT,
    source_id UUID NOT NULL REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bills_number ON bills(bill_number);
CREATE INDEX idx_bills_sponsor ON bills(sponsor_id);
CREATE INDEX idx_bills_topic ON bills(topic);

-- ============================================================================
-- VOTES TABLE
-- ============================================================================

CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    bill_id UUID REFERENCES bills(id),  -- FK to bills table (preferred)
    bill_title TEXT,  -- Legacy field (nullable)
    -- Vote position fields (vote_position is preferred, vote_value for backward compat)
    vote_position TEXT CHECK (vote_position IN ('yes', 'no', 'abstain', 'not_voting', 'yea', 'nay', 'present')),
    vote_value TEXT CHECK (vote_value IN ('Yes', 'No', 'Abstain', 'Not Present')),
    vote_date DATE,
    roll_call_number INT,
    chamber TEXT CHECK (chamber IN ('house', 'senate')),
    source_id UUID NOT NULL REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_votes_politician ON votes(politician_id);
CREATE INDEX idx_votes_bill ON votes(bill_id);
CREATE INDEX idx_votes_roll_call ON votes(roll_call_number);
CREATE INDEX idx_votes_chamber ON votes(chamber);

-- Trigger to sync vote_position and vote_value
CREATE OR REPLACE FUNCTION sync_vote_value()
RETURNS TRIGGER AS $$
BEGIN
    -- Derive vote_value from vote_position
    IF NEW.vote_position IS NOT NULL THEN
        NEW.vote_value := CASE 
            WHEN LOWER(NEW.vote_position) IN ('yes', 'yea', 'y') THEN 'Yes'
            WHEN LOWER(NEW.vote_position) IN ('no', 'nay', 'n') THEN 'No'
            WHEN LOWER(NEW.vote_position) IN ('abstain', 'present') THEN 'Abstain'
            WHEN LOWER(NEW.vote_position) IN ('not_voting', 'not voting', 'not present') THEN 'Not Present'
            ELSE 'Not Present'
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_vote_value_trigger
    BEFORE INSERT OR UPDATE OF vote_position ON votes
    FOR EACH ROW
    EXECUTE FUNCTION sync_vote_value();

-- ============================================================================
-- DONATIONS TABLE
-- ============================================================================

CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    donor_name TEXT NOT NULL,
    donor_type TEXT CHECK (donor_type IN ('individual', 'pac', 'organization', 'party', 'other')),
    donor_category TEXT,  -- Industry/category (OpenSecrets)
    amount_cents BIGINT,  -- Amount in cents (preferred for precision)
    amount NUMERIC(12, 2),  -- Amount as decimal (legacy, synced via trigger)
    donation_date DATE,  -- Preferred date column
    date DATE,  -- Legacy alias (synced via trigger)
    cycle TEXT,  -- Election cycle (e.g., '2024')
    state_code TEXT,
    source_id UUID NOT NULL REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_donations_politician ON donations(politician_id);
CREATE INDEX idx_donations_date ON donations(donation_date);
CREATE INDEX idx_donations_cycle ON donations(cycle);
CREATE INDEX idx_donations_donor ON donations(donor_name);
CREATE INDEX idx_donations_type ON donations(donor_type);

-- Trigger to sync donation date and amount columns
CREATE OR REPLACE FUNCTION sync_donation_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync date and donation_date
    IF NEW.date IS NULL AND NEW.donation_date IS NOT NULL THEN
        NEW.date := NEW.donation_date;
    ELSIF NEW.donation_date IS NULL AND NEW.date IS NOT NULL THEN
        NEW.donation_date := NEW.date;
    END IF;
    
    -- Sync amount and amount_cents
    IF NEW.amount_cents IS NULL AND NEW.amount IS NOT NULL THEN
        NEW.amount_cents := (NEW.amount * 100)::BIGINT;
    ELSIF NEW.amount IS NULL AND NEW.amount_cents IS NOT NULL THEN
        NEW.amount := NEW.amount_cents / 100.0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_donation_columns_trigger
    BEFORE INSERT OR UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION sync_donation_columns();

-- ============================================================================
-- STATEMENTS TABLE
-- ============================================================================

CREATE TABLE statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    statement_text TEXT NOT NULL,
    statement_date DATE,
    statement_type TEXT,  -- tweet, press_release, speech, interview, etc.
    context TEXT,  -- Description or context of the statement
    source_id UUID NOT NULL REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_statements_politician ON statements(politician_id);
CREATE INDEX idx_statements_date ON statements(statement_date);
CREATE INDEX idx_statements_type ON statements(statement_type);

-- ============================================================================
-- SOURCE_CHUNKS TABLE (for RAG)
-- ============================================================================

CREATE TABLE source_chunks (
    id SERIAL PRIMARY KEY,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    start_offset INTEGER,
    end_offset INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_source_chunk UNIQUE(source_id, chunk_index)
);

CREATE INDEX idx_source_chunks_source ON source_chunks(source_id);
CREATE INDEX idx_source_chunks_metadata ON source_chunks USING GIN(metadata);

-- ============================================================================
-- EMBEDDINGS TABLE (for vector search)
-- Note: pgvector extension must be enabled separately for vector operations
-- ============================================================================

-- Create embeddings table without vector type initially
-- The 0004 migration will add vector support if pgvector is available
CREATE TABLE embeddings (
    id SERIAL PRIMARY KEY,
    chunk_id INTEGER NOT NULL REFERENCES source_chunks(id) ON DELETE CASCADE,
    embedding_json JSONB,  -- Fallback storage as JSON array
    model_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_chunk_embedding UNIQUE(chunk_id)
);

CREATE INDEX idx_embeddings_chunk ON embeddings(chunk_id);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View for current offices (no end_date)
CREATE OR REPLACE VIEW current_offices AS
SELECT 
    p.id AS politician_id,
    COALESCE(p.name, p.full_name) AS politician_name,
    p.party,
    o.office_type,
    COALESCE(p.state_code, p.state) AS state,
    o.district,
    o.start_date,
    o.party_at_time
FROM politicians p
JOIN offices o ON p.id = o.politician_id
WHERE o.end_date IS NULL;

-- ============================================================================
-- PROVENANCE VERIFICATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_provenance()
RETURNS TABLE(
    table_name TEXT,
    total_records BIGINT,
    records_with_source BIGINT,
    records_without_source BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'politicians'::TEXT, 
           COUNT(*)::BIGINT,
           COUNT(source_id)::BIGINT,
           (COUNT(*) - COUNT(source_id))::BIGINT
    FROM politicians
    UNION ALL
    SELECT 'offices'::TEXT, 
           COUNT(*)::BIGINT,
           COUNT(source_id)::BIGINT,
           (COUNT(*) - COUNT(source_id))::BIGINT
    FROM offices
    UNION ALL
    SELECT 'bills'::TEXT, 
           COUNT(*)::BIGINT,
           COUNT(source_id)::BIGINT,
           (COUNT(*) - COUNT(source_id))::BIGINT
    FROM bills
    UNION ALL
    SELECT 'votes'::TEXT, 
           COUNT(*)::BIGINT,
           COUNT(source_id)::BIGINT,
           (COUNT(*) - COUNT(source_id))::BIGINT
    FROM votes
    UNION ALL
    SELECT 'statements'::TEXT, 
           COUNT(*)::BIGINT,
           COUNT(source_id)::BIGINT,
           (COUNT(*) - COUNT(source_id))::BIGINT
    FROM statements
    UNION ALL
    SELECT 'donations'::TEXT, 
           COUNT(*)::BIGINT,
           COUNT(source_id)::BIGINT,
           (COUNT(*) - COUNT(source_id))::BIGINT
    FROM donations
    UNION ALL
    SELECT 'source_chunks'::TEXT, 
           COUNT(*)::BIGINT,
           COUNT(source_id)::BIGINT,
           (COUNT(*) - COUNT(source_id))::BIGINT
    FROM source_chunks;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE sources IS 'Provenance records for all factual data';
COMMENT ON TABLE politicians IS 'Elected officials and candidates';
COMMENT ON TABLE offices IS 'Historical and current positions held';
COMMENT ON TABLE bills IS 'Legislative bills';
COMMENT ON TABLE votes IS 'Roll call votes on bills';
COMMENT ON TABLE donations IS 'Campaign finance donations';
COMMENT ON TABLE statements IS 'Official statements, tweets, press releases';
COMMENT ON TABLE source_chunks IS 'Text chunks from sources for RAG retrieval';
COMMENT ON TABLE embeddings IS 'Vector embeddings for semantic search';

COMMENT ON COLUMN politicians.name IS 'Alias for full_name (for ingestion compatibility)';
COMMENT ON COLUMN politicians.state_code IS 'Alias for state (for ingestion compatibility)';
COMMENT ON COLUMN politicians."position" IS 'Current position (Senator, Representative)';

COMMENT ON COLUMN votes.bill_id IS 'Foreign key to bills table (preferred over bill_title)';
COMMENT ON COLUMN votes.vote_position IS 'Standardized vote: yes, no, abstain, not_voting';
COMMENT ON COLUMN votes.vote_value IS 'Legacy format: Yes, No, Abstain, Not Present';

COMMENT ON COLUMN donations.amount_cents IS 'Amount in cents (preferred for precision)';
COMMENT ON COLUMN donations.amount IS 'Amount as decimal (synced with amount_cents)';
