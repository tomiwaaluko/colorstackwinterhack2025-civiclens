-- Migration: 0002_fix_schema.sql
-- Description: Fix schema mismatches between ingestion code and database
-- Fixes votes table and creates donations table
-- Requires: PostgreSQL 14+

-- ============================================================================
-- FIX VOTES TABLE
-- ============================================================================

-- Add missing columns to votes table (only if they don't exist)
-- Note: bill_id and vote_position already exist in the actual schema
ALTER TABLE votes 
  ADD COLUMN IF NOT EXISTS roll_call_number INT,
  ADD COLUMN IF NOT EXISTS chamber TEXT;

-- Add vote_value column for backward compatibility (if it doesn't exist)
-- This allows code that uses vote_value to continue working
ALTER TABLE votes 
  ADD COLUMN IF NOT EXISTS vote_value TEXT CHECK (vote_value IN ('Yes', 'No', 'Abstain', 'Not Present'));

-- Create index on bill_id for joins
CREATE INDEX IF NOT EXISTS idx_votes_bill ON votes(bill_id);

-- Create index on roll_call_number for deduplication
CREATE INDEX IF NOT EXISTS idx_votes_roll_call ON votes(roll_call_number);

-- Create index on chamber for filtering
CREATE INDEX IF NOT EXISTS idx_votes_chamber ON votes(chamber);

-- Sync vote_position to vote_value for all existing rows (not just NULL vote_value)
-- This ensures both columns are in sync before the trigger is enabled
UPDATE votes 
SET vote_value = CASE 
  WHEN LOWER(vote_position) IN ('yes', 'yea', 'y') THEN 'Yes'
  WHEN LOWER(vote_position) IN ('no', 'nay', 'n') THEN 'No'
  WHEN LOWER(vote_position) IN ('abstain', 'present') THEN 'Abstain'
  WHEN LOWER(vote_position) IN ('not_voting', 'not voting', 'not present') THEN 'Not Present'
  ELSE 'Not Present'
END
WHERE vote_position IS NOT NULL;

-- Create trigger function to keep vote_value in sync with vote_position
CREATE OR REPLACE FUNCTION sync_vote_value()
RETURNS TRIGGER AS $$
BEGIN
    NEW.vote_value := CASE 
        WHEN LOWER(NEW.vote_position) IN ('yes', 'yea', 'y') THEN 'Yes'
        WHEN LOWER(NEW.vote_position) IN ('no', 'nay', 'n') THEN 'No'
        WHEN LOWER(NEW.vote_position) IN ('abstain', 'present') THEN 'Abstain'
        WHEN LOWER(NEW.vote_position) IN ('not_voting', 'not voting', 'not present') THEN 'Not Present'
        ELSE 'Not Present'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate
DROP TRIGGER IF EXISTS sync_vote_value_trigger ON votes;

-- Create trigger to sync vote_value on insert or update of vote_position
CREATE TRIGGER sync_vote_value_trigger
    BEFORE INSERT OR UPDATE OF vote_position ON votes
    FOR EACH ROW
    EXECUTE FUNCTION sync_vote_value();

-- ============================================================================
-- UPDATE DONATIONS TABLE (if it exists, add missing columns)
-- ============================================================================

-- Add missing columns to donations table if they don't exist
-- The donations table may or may not exist, so we check first
DO $$
BEGIN
    -- Check if donations table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donations') THEN
        -- Add donor_type if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'donations' AND column_name = 'donor_type') THEN
            ALTER TABLE donations ADD COLUMN donor_type TEXT;
        END IF;
        
        -- Add donor_category if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'donations' AND column_name = 'donor_category') THEN
            ALTER TABLE donations ADD COLUMN donor_category TEXT;
        END IF;
        
        -- Add amount_cents if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'donations' AND column_name = 'amount_cents') THEN
            ALTER TABLE donations ADD COLUMN amount_cents BIGINT;
        END IF;
        
        -- Add amount if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'donations' AND column_name = 'amount') THEN
            ALTER TABLE donations ADD COLUMN amount NUMERIC(12, 2);
        END IF;
        
        -- Add donation_date if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'donations' AND column_name = 'donation_date') THEN
            ALTER TABLE donations ADD COLUMN donation_date DATE;
        END IF;
        
        -- Add date if missing (alias for donation_date)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'donations' AND column_name = 'date') THEN
            ALTER TABLE donations ADD COLUMN date DATE;
        END IF;
        
        -- Add cycle if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'donations' AND column_name = 'cycle') THEN
            ALTER TABLE donations ADD COLUMN cycle TEXT;
        END IF;
        
        -- Add state_code if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'donations' AND column_name = 'state_code') THEN
            ALTER TABLE donations ADD COLUMN state_code TEXT;
        END IF;
    ELSE
        RAISE NOTICE 'Table donations does not exist, skipping column additions';
    END IF;
END $$;

-- Create indexes for donations (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donations') THEN
        -- Create indexes conditionally
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_donations_politician') THEN
            CREATE INDEX idx_donations_politician ON donations(politician_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_donations_date') THEN
            CREATE INDEX idx_donations_date ON donations(donation_date);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_donations_cycle') THEN
            CREATE INDEX idx_donations_cycle ON donations(cycle);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_donations_donor') THEN
            CREATE INDEX idx_donations_donor ON donations(donor_name);
        END IF;
    ELSE
        RAISE NOTICE 'Table donations does not exist, skipping index creation';
    END IF;
END $$;

-- Create a trigger function to sync date and donation_date columns
CREATE OR REPLACE FUNCTION sync_donation_dates()
RETURNS TRIGGER AS $$
BEGIN
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

-- Create trigger for donations (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donations') THEN
        -- Drop existing trigger if exists
        DROP TRIGGER IF EXISTS sync_donation_dates_trigger ON donations;
        
        -- Create the trigger
        CREATE TRIGGER sync_donation_dates_trigger
            BEFORE INSERT OR UPDATE ON donations
            FOR EACH ROW
            EXECUTE FUNCTION sync_donation_dates();
    ELSE
        RAISE NOTICE 'Table donations does not exist, skipping trigger creation';
    END IF;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN votes.bill_id IS 'Foreign key to bills table. Prefer this over bill_title for relationships.';
COMMENT ON COLUMN votes.roll_call_number IS 'Roll call number to distinguish distinct roll calls with NULL vote_date';
COMMENT ON COLUMN votes.chamber IS 'Chamber where vote occurred: house, senate';
COMMENT ON COLUMN votes.vote_position IS 'Standardized vote position: yes, no, abstain, not_voting';
COMMENT ON COLUMN votes.vote_value IS 'Legacy column. Use vote_position for new code. Auto-synced via trigger.';

-- Comments for donations columns (only if table and columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donations') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'donations' AND column_name = 'amount_cents') THEN
            COMMENT ON COLUMN donations.amount_cents IS 'Amount in cents (preferred for precision). Use this for new code.';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'donations' AND column_name = 'amount') THEN
            COMMENT ON COLUMN donations.amount IS 'Amount as decimal (legacy). Synced with amount_cents via trigger.';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'donations' AND column_name = 'donation_date') THEN
            COMMENT ON COLUMN donations.donation_date IS 'Date of donation (preferred). Synced with date column.';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'donations' AND column_name = 'date') THEN
            COMMENT ON COLUMN donations.date IS 'Date of donation (legacy alias). Synced with donation_date column.';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'donations' AND column_name = 'donor_category') THEN
            COMMENT ON COLUMN donations.donor_category IS 'Industry/category (used by OpenSecrets ingestion)';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'donations' AND column_name = 'donor_type') THEN
            COMMENT ON COLUMN donations.donor_type IS 'Type: individual, pac, organization';
        END IF;
    ELSE
        RAISE NOTICE 'Table donations does not exist, skipping comments';
    END IF;
END $$;
