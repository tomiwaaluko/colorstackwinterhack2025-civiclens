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

-- Sync vote_position to vote_value for backward compatibility
-- This ensures both columns stay in sync
UPDATE votes 
SET vote_value = CASE 
  WHEN LOWER(vote_position) IN ('yes', 'yea', 'y') THEN 'Yes'
  WHEN LOWER(vote_position) IN ('no', 'nay', 'n') THEN 'No'
  WHEN LOWER(vote_position) IN ('abstain', 'present') THEN 'Abstain'
  WHEN LOWER(vote_position) IN ('not_voting', 'not voting', 'not present') THEN 'Not Present'
  ELSE 'Not Present'
END
WHERE vote_value IS NULL AND vote_position IS NOT NULL;

-- ============================================================================
-- UPDATE DONATIONS TABLE (if it exists, add missing columns)
-- ============================================================================

-- Add missing columns to donations table if they don't exist
-- The donations table already exists, so we just add what's missing
DO $$
BEGIN
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
END $$;

-- Create indexes for donations
CREATE INDEX IF NOT EXISTS idx_donations_politician ON donations(politician_id);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_cycle ON donations(cycle);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_name);

-- Create a trigger to sync date and donation_date columns
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

CREATE TRIGGER sync_donation_dates_trigger
    BEFORE INSERT OR UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION sync_donation_dates();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN votes.bill_id IS 'Foreign key to bills table. Prefer this over bill_title for relationships.';
COMMENT ON COLUMN votes.roll_call_number IS 'Roll call number to distinguish distinct roll calls with NULL vote_date';
COMMENT ON COLUMN votes.chamber IS 'Chamber where vote occurred: house, senate';
COMMENT ON COLUMN votes.vote_position IS 'Standardized vote position: yes, no, abstain, not_voting';
COMMENT ON COLUMN votes.vote_value IS 'Legacy column. Use vote_position for new code.';

COMMENT ON COLUMN donations.amount_cents IS 'Amount in cents (preferred for precision). Use this for new code.';
COMMENT ON COLUMN donations.amount IS 'Amount as decimal (legacy). Synced with amount_cents via trigger.';
COMMENT ON COLUMN donations.donation_date IS 'Date of donation (preferred). Synced with date column.';
COMMENT ON COLUMN donations.date IS 'Date of donation (legacy alias). Synced with donation_date column.';
COMMENT ON COLUMN donations.donor_category IS 'Industry/category (used by OpenSecrets ingestion)';
COMMENT ON COLUMN donations.donor_type IS 'Type: individual, pac, organization';

