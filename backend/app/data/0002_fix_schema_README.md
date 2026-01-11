# Schema Fix Migration (0002_fix_schema.sql)

## Overview
This migration fixes critical schema mismatches between the database schema and the ingestion/backend code.

## Changes Made

### 1. Votes Table Fixes

**Added Columns:**
- `bill_id` (UUID, FK to bills) - Enables proper relational queries
- `roll_call_number` (INT) - Distinguishes distinct roll calls with NULL vote_date
- `chamber` (TEXT) - Stores chamber (house/senate) where vote occurred
- `vote_position` (TEXT) - Standardized vote values: 'yes', 'no', 'abstain', 'not_voting'

**Modified Columns:**
- `bill_title` - Made nullable (migrating to bill_id FK)
- `vote_value` - Kept for backward compatibility

**Indexes Added:**
- `idx_votes_bill` - For bill_id joins
- `idx_votes_roll_call` - For roll_call_number deduplication
- `idx_votes_chamber` - For chamber filtering

**Data Migration:**
- Automatically migrates existing `vote_value` data to `vote_position` format

### 2. Donations Table Creation

**New Table:** `donations`

**Columns:**
- `id` (UUID, PK)
- `politician_id` (SERIAL, FK to politicians)
- `donor_name` (TEXT, NOT NULL)
- `donor_type` (TEXT) - 'individual', 'pac', 'organization'
- `donor_category` (TEXT) - Industry/category
- `amount_cents` (BIGINT) - Amount in cents (preferred for precision)
- `amount` (NUMERIC) - Amount as decimal (legacy, synced via trigger)
- `donation_date` (DATE) - Preferred date column
- `date` (DATE) - Legacy alias (synced via trigger)
- `cycle` (TEXT) - Election cycle (e.g., '2024')
- `state_code` (TEXT)
- `source_id` (UUID, FK to sources)
- `created_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_donations_politician` - For politician lookups
- `idx_donations_date` - For date filtering
- `idx_donations_cycle` - For cycle filtering
- `idx_donations_donor` - For donor name searches

**Triggers:**
- `sync_donation_dates_trigger` - Automatically syncs `date` and `donation_date`
- `sync_donation_dates_trigger` - Automatically syncs `amount` and `amount_cents`

## Code Updates

### Backend Repository (`repo.py`)
- Updated `_get_votes()` to use `bill_id` with JOIN to bills table
- Falls back to `bill_title` for backward compatibility
- Uses `vote_position` with fallback to `vote_value`

### ProPublica Ingestion (`propublica_ingest.py`)
- Updated to write both `vote_position` and `vote_value` for compatibility
- Already uses `bill_id`, `roll_call_number` (from previous fix)

### OpenSecrets Ingestion (`opensecrets_ingest.py`)
- Updated to populate both `amount`/`amount_cents` and `date`/`donation_date`
- Supports both legacy and new column names

## Migration Instructions

1. **Run the migration:**
   ```bash
   psql $DATABASE_URL -f backend/app/data/0002_fix_schema.sql
   ```

2. **Verify the migration:**
   ```sql
   -- Check votes table has new columns
   \d votes
   
   -- Check donations table exists
   \d donations
   
   -- Verify indexes
   \di votes*
   \di donations*
   ```

3. **Test ingestion:**
   - Run ProPublica ingestion to verify votes insert correctly
   - Run OpenSecrets ingestion to verify donations insert correctly

## Backward Compatibility

- **Votes:** Both `bill_title` and `bill_id` are supported. Backend uses `bill_id` with JOIN but falls back to `bill_title`.
- **Votes:** Both `vote_value` and `vote_position` are supported. New code should use `vote_position`.
- **Donations:** Both `amount`/`amount_cents` and `date`/`donation_date` are synced automatically via triggers.

## Breaking Changes

None - all changes are backward compatible. Existing code continues to work while new code can use the improved schema.

