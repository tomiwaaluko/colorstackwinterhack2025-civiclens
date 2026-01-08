-- Migration: Geographic Data Standardization
-- Description: Creates state code reference table and adds validation constraints
-- This implements Step 3 from pre-interactive-visual-analytics.md

-- ============================================================================
-- STATE CODES REFERENCE TABLE
-- ============================================================================
-- Reference table for valid US state codes (50 states + DC)
CREATE TABLE IF NOT EXISTS state_codes (
    code CHAR(2) PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert all 50 states + DC
INSERT INTO state_codes (code, name) VALUES
    ('AL', 'Alabama'),
    ('AK', 'Alaska'),
    ('AZ', 'Arizona'),
    ('AR', 'Arkansas'),
    ('CA', 'California'),
    ('CO', 'Colorado'),
    ('CT', 'Connecticut'),
    ('DE', 'Delaware'),
    ('FL', 'Florida'),
    ('GA', 'Georgia'),
    ('HI', 'Hawaii'),
    ('ID', 'Idaho'),
    ('IL', 'Illinois'),
    ('IN', 'Indiana'),
    ('IA', 'Iowa'),
    ('KS', 'Kansas'),
    ('KY', 'Kentucky'),
    ('LA', 'Louisiana'),
    ('ME', 'Maine'),
    ('MD', 'Maryland'),
    ('MA', 'Massachusetts'),
    ('MI', 'Michigan'),
    ('MN', 'Minnesota'),
    ('MS', 'Mississippi'),
    ('MO', 'Missouri'),
    ('MT', 'Montana'),
    ('NE', 'Nebraska'),
    ('NV', 'Nevada'),
    ('NH', 'New Hampshire'),
    ('NJ', 'New Jersey'),
    ('NM', 'New Mexico'),
    ('NY', 'New York'),
    ('NC', 'North Carolina'),
    ('ND', 'North Dakota'),
    ('OH', 'Ohio'),
    ('OK', 'Oklahoma'),
    ('OR', 'Oregon'),
    ('PA', 'Pennsylvania'),
    ('RI', 'Rhode Island'),
    ('SC', 'South Carolina'),
    ('SD', 'South Dakota'),
    ('TN', 'Tennessee'),
    ('TX', 'Texas'),
    ('UT', 'Utah'),
    ('VT', 'Vermont'),
    ('VA', 'Virginia'),
    ('WA', 'Washington'),
    ('WV', 'West Virginia'),
    ('WI', 'Wisconsin'),
    ('WY', 'Wyoming'),
    ('DC', 'District of Columbia')
ON CONFLICT (code) DO NOTHING;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_state_codes_name ON state_codes(name);

COMMENT ON TABLE state_codes IS 'Reference table for valid USPS 2-letter state codes (50 states + DC)';

-- ============================================================================
-- ADD VALIDATION CONSTRAINTS
-- ============================================================================

-- Add CHECK constraint to politicians.state_code to ensure it references valid state codes
-- Note: PostgreSQL doesn't support CHECK constraints with subqueries directly,
-- so we'll use a trigger function instead

-- Function to validate state codes
CREATE OR REPLACE FUNCTION validate_state_code(state_code_val CHAR(2))
RETURNS BOOLEAN AS $$
BEGIN
    IF state_code_val IS NULL THEN
        RETURN TRUE;  -- NULL is allowed
    END IF;
    
    RETURN EXISTS (SELECT 1 FROM state_codes WHERE code = state_code_val);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add CHECK constraint using the function
-- Note: This will fail if there are existing invalid state codes
-- Run the normalization script first if needed

-- For politicians table
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_politicians_state_code_valid'
    ) THEN
        ALTER TABLE politicians 
        ADD CONSTRAINT chk_politicians_state_code_valid 
        CHECK (validate_state_code(state_code));
    END IF;
END $$;

-- For donations table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_donations_state_code_valid'
    ) THEN
        ALTER TABLE donations 
        ADD CONSTRAINT chk_donations_state_code_valid 
        CHECK (validate_state_code(state_code));
    END IF;
END $$;

-- For offices table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_offices_state_code_valid'
    ) THEN
        ALTER TABLE offices 
        ADD CONSTRAINT chk_offices_state_code_valid 
        CHECK (validate_state_code(state_code));
    END IF;
END $$;

COMMENT ON FUNCTION validate_state_code IS 'Validates that a state code exists in the state_codes reference table';

