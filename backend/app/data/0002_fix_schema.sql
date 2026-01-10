-- Migration: 0002_fix_schema.sql
-- Description: Fix schema mismatches for databases that ran the old 0001_init.sql
-- This migration adds columns and creates tables that may be missing from older schemas
-- Safe to run on databases with the new 0001_init.sql (all operations are idempotent)
-- Requires: PostgreSQL 14+

-- ============================================================================
-- FIX VOTES TABLE
-- ============================================================================

-- Add missing columns to votes table (only if they don't exist)
ALTER TABLE votes 
  ADD COLUMN IF NOT EXISTS roll_call_number INT,
  ADD COLUMN IF NOT EXISTS chamber TEXT,
  ADD COLUMN IF NOT EXISTS bill_id UUID,
  ADD COLUMN IF NOT EXISTS vote_position TEXT;

-- Add vote_value column for backward compatibility (if it doesn't exist)
ALTER TABLE votes 
  ADD COLUMN IF NOT EXISTS vote_value TEXT;

-- Add check constraint on vote_value if not present (wrap in DO block for safety)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'votes_vote_value_check' AND conrelid = 'votes'::regclass
    ) THEN
        ALTER TABLE votes ADD CONSTRAINT votes_vote_value_check 
            CHECK (vote_value IN ('Yes', 'No', 'Abstain', 'Not Present'));
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add vote_value check constraint: %', SQLERRM;
END $$;

-- Add check constraint on vote_position if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'votes_vote_position_check' AND conrelid = 'votes'::regclass
    ) THEN
        ALTER TABLE votes ADD CONSTRAINT votes_vote_position_check 
            CHECK (vote_position IN ('yes', 'no', 'abstain', 'not_voting', 'yea', 'nay', 'present'));
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add vote_position check constraint: %', SQLERRM;
END $$;

-- Add check constraint on chamber if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'votes_chamber_check' AND conrelid = 'votes'::regclass
    ) THEN
        ALTER TABLE votes ADD CONSTRAINT votes_chamber_check 
            CHECK (chamber IN ('house', 'senate'));
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add chamber check constraint: %', SQLERRM;
END $$;

-- Create indexes for votes table
CREATE INDEX IF NOT EXISTS idx_votes_bill ON votes(bill_id);
CREATE INDEX IF NOT EXISTS idx_votes_roll_call ON votes(roll_call_number);
CREATE INDEX IF NOT EXISTS idx_votes_chamber ON votes(chamber);

-- Sync vote_position to vote_value for all existing rows
UPDATE votes 
SET vote_value = CASE 
  WHEN LOWER(vote_position) IN ('yes', 'yea', 'y') THEN 'Yes'
  WHEN LOWER(vote_position) IN ('no', 'nay', 'n') THEN 'No'
  WHEN LOWER(vote_position) IN ('abstain', 'present') THEN 'Abstain'
  WHEN LOWER(vote_position) IN ('not_voting', 'not voting', 'not present') THEN 'Not Present'
  ELSE 'Not Present'
END
WHERE vote_position IS NOT NULL AND vote_value IS NULL;

-- Create trigger function to keep vote_value in sync with vote_position
CREATE OR REPLACE FUNCTION sync_vote_value()
RETURNS TRIGGER AS $$
BEGIN
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

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS sync_vote_value_trigger ON votes;
CREATE TRIGGER sync_vote_value_trigger
    BEFORE INSERT OR UPDATE OF vote_position ON votes
    FOR EACH ROW
    EXECUTE FUNCTION sync_vote_value();

-- ============================================================================
-- FIX POLITICIANS TABLE
-- ============================================================================

-- Add missing columns to politicians table
ALTER TABLE politicians 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS state_code TEXT,
  ADD COLUMN IF NOT EXISTS "position" TEXT,
  ADD COLUMN IF NOT EXISTS district_number INTEGER;

-- Create indexes for new politician columns
CREATE INDEX IF NOT EXISTS idx_politicians_name ON politicians(name);
CREATE INDEX IF NOT EXISTS idx_politicians_state_code ON politicians(state_code);

-- Sync existing data
UPDATE politicians SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;
UPDATE politicians SET state_code = state WHERE state_code IS NULL AND state IS NOT NULL;

-- Create trigger to sync politician columns
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

DROP TRIGGER IF EXISTS sync_politician_columns_trigger ON politicians;
CREATE TRIGGER sync_politician_columns_trigger
    BEFORE INSERT OR UPDATE ON politicians
    FOR EACH ROW
    EXECUTE FUNCTION sync_politician_columns();

-- ============================================================================
-- FIX STATEMENTS TABLE
-- ============================================================================

-- Add missing columns to statements table
ALTER TABLE statements 
  ADD COLUMN IF NOT EXISTS statement_type TEXT,
  ADD COLUMN IF NOT EXISTS context TEXT;

CREATE INDEX IF NOT EXISTS idx_statements_type ON statements(statement_type);

-- ============================================================================
-- FIX BILLS TABLE
-- ============================================================================

-- Add topic column if missing
ALTER TABLE bills ADD COLUMN IF NOT EXISTS topic TEXT;
CREATE INDEX IF NOT EXISTS idx_bills_topic ON bills(topic);

-- ============================================================================
-- CREATE/UPDATE DONATIONS TABLE
-- ============================================================================

-- Create donations table if it doesn't exist
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id UUID NOT NULL,
    donor_name TEXT NOT NULL,
    donor_type TEXT CHECK (donor_type IN ('individual', 'pac', 'organization', 'party', 'other')),
    donor_category TEXT,
    amount_cents BIGINT,
    amount NUMERIC(12, 2),
    donation_date DATE,
    date DATE,
    cycle TEXT,
    state_code TEXT,
    source_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns to donations table if they exist but are incomplete
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donations') THEN
        -- Add columns if missing
        ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_type TEXT;
        ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_category TEXT;
        ALTER TABLE donations ADD COLUMN IF NOT EXISTS amount_cents BIGINT;
        ALTER TABLE donations ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2);
        ALTER TABLE donations ADD COLUMN IF NOT EXISTS donation_date DATE;
        ALTER TABLE donations ADD COLUMN IF NOT EXISTS date DATE;
        ALTER TABLE donations ADD COLUMN IF NOT EXISTS cycle TEXT;
        ALTER TABLE donations ADD COLUMN IF NOT EXISTS state_code TEXT;
    END IF;
END $$;

-- Create indexes for donations
CREATE INDEX IF NOT EXISTS idx_donations_politician ON donations(politician_id);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_cycle ON donations(cycle);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_name);
CREATE INDEX IF NOT EXISTS idx_donations_type ON donations(donor_type);

-- Create trigger function for donation column sync
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

DROP TRIGGER IF EXISTS sync_donation_columns_trigger ON donations;
CREATE TRIGGER sync_donation_columns_trigger
    BEFORE INSERT OR UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION sync_donation_columns();

-- ============================================================================
-- CREATE SOURCE_CHUNKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS source_chunks (
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

CREATE INDEX IF NOT EXISTS idx_source_chunks_source ON source_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_source_chunks_metadata ON source_chunks USING GIN(metadata);

-- ============================================================================
-- CREATE EMBEDDINGS TABLE
-- ============================================================================

-- Create embeddings table (without pgvector initially)
CREATE TABLE IF NOT EXISTS embeddings (
    id SERIAL PRIMARY KEY,
    chunk_id INTEGER NOT NULL REFERENCES source_chunks(id) ON DELETE CASCADE,
    embedding_json JSONB,
    model_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_chunk_embedding UNIQUE(chunk_id)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_chunk ON embeddings(chunk_id);

-- ============================================================================
-- HELPER FUNCTIONS AND VIEWS
-- ============================================================================

-- Verify provenance function
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

-- Current offices view
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
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN votes.bill_id IS 'Foreign key to bills table. Prefer this over bill_title for relationships.';
COMMENT ON COLUMN votes.roll_call_number IS 'Roll call number to distinguish distinct roll calls with NULL vote_date';
COMMENT ON COLUMN votes.chamber IS 'Chamber where vote occurred: house, senate';
COMMENT ON COLUMN votes.vote_position IS 'Standardized vote position: yes, no, abstain, not_voting';
COMMENT ON COLUMN votes.vote_value IS 'Legacy column. Use vote_position for new code. Auto-synced via trigger.';

COMMENT ON COLUMN politicians.name IS 'Alias for full_name (for ingestion compatibility)';
COMMENT ON COLUMN politicians.state_code IS 'Alias for state (for ingestion compatibility)';
COMMENT ON COLUMN politicians."position" IS 'Current position (Senator, Representative)';
COMMENT ON COLUMN politicians.district_number IS 'District number for Representatives';

COMMENT ON TABLE donations IS 'Campaign finance donations from OpenSecrets and other sources';
COMMENT ON COLUMN donations.amount_cents IS 'Amount in cents (preferred for precision)';
COMMENT ON COLUMN donations.amount IS 'Amount as decimal (synced with amount_cents via trigger)';
COMMENT ON COLUMN donations.donation_date IS 'Date of donation (preferred, synced with date column)';
COMMENT ON COLUMN donations.date IS 'Legacy date column (synced with donation_date)';

COMMENT ON TABLE source_chunks IS 'Text chunks from sources for RAG retrieval';
COMMENT ON TABLE embeddings IS 'Vector embeddings for source chunks';
