# Migration Troubleshooting Guide

## Error: "column position does not exist"

### Root Cause
The `position` column doesn't exist in your `politicians` table. This happens because:
1. The table was created without the `position` column
2. `position` is a reserved word in PostgreSQL, so it must be quoted

### Solution

**Step 1: Run the fix script again**
```sql
-- Run this in Supabase SQL Editor
-- This will add the missing position column
\i backend/migrations/0002_check_and_fix_schema.sql
```

Or manually add it:
```sql
-- Check if position column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'politicians' 
  AND column_name = 'position';

-- If it doesn't exist, add it
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS "position" TEXT;
```

**Step 2: Verify the column was added**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'politicians'
ORDER BY ordinal_position;
```

You should see `position` in the list.

**Step 3: Create the index (manually if needed)**
```sql
CREATE INDEX IF NOT EXISTS idx_politicians_position ON politicians("position");
```

**Step 4: Now run the main schema migration**
```sql
-- This should now work since position column exists
-- Run: backend/migrations/0002_create_schema.sql
```

## Error: "column state_code does not exist"

This means the table exists but doesn't have the new columns. Run the fix script first:

```sql
-- Run: backend/migrations/0002_check_and_fix_schema.sql
```

## Quick Fix: Check All Missing Columns

Run this to see what columns are missing:

```sql
-- Check politicians table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'politicians'
ORDER BY ordinal_position;

-- Expected columns: id, name, party, state_code, district_number, position, image_url, bio, created_at, updated_at
```

If any are missing, the fix script will add them.

## Complete Reset (If Needed)

If you want to start fresh and don't care about existing data:

```sql
-- Drop all tables
DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS source_chunks CASCADE;
DROP TABLE IF EXISTS statements CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS offices CASCADE;
DROP TABLE IF EXISTS politicians CASCADE;
DROP TABLE IF EXISTS sources CASCADE;

-- Then run: backend/migrations/0002_create_schema.sql
```

