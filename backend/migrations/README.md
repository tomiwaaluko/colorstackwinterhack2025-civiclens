# Database Migrations

This directory contains SQL migration files for database schema changes.

## Running Migrations

### Using Supabase SQL Editor

1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file
4. Run them in order (0001, 0002, etc.)

### Using psql (Command Line)

```bash
# Connect to Supabase
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migrations in order
\i migrations/0001_enable_postgis.sql
```

### Using Python Script (Future)

A migration runner script can be created to automate this process.

## Migration Files

### Execution Order and Descriptions

1. **`0001_enable_postgis.sql`** - Enables PostGIS extension for geospatial queries
2. **`0002_create_schema.sql`** - Creates all database tables (use for NEW databases where tables don't exist)
3. **`0002_create_schema_with_drop.sql`** - Drops and recreates all tables (use for EXISTING databases when you want a fresh start - WARNING: deletes all data)
4. **`0002_check_and_fix_schema.sql`** - Adds missing columns to existing tables (use for EXISTING databases to preserve data while updating schema)
5. **`0003_geographic_standardization.sql`** - Adds geographic standardization with state codes lookup table and spatial functions
6. **`0008_create_materialized_views.sql`** - Creates materialized views for optimized visualization aggregations

### Recommended Setup Path

**For New Deployments:**

1. Run `0001_enable_postgis.sql`
2. Run `0002_create_schema.sql`
3. Run `0003_geographic_standardization.sql`
4. Run `0008_create_materialized_views.sql`

**For Existing Databases (preserve data):**

1. Run `0001_enable_postgis.sql` (if not already enabled)
2. Run `0002_check_and_fix_schema.sql` to add any missing columns
3. Run `0003_geographic_standardization.sql`
4. Run `0008_create_materialized_views.sql`

**For Existing Databases (fresh start - WARNING: deletes data):**

1. Run `0001_enable_postgis.sql`
2. Run `0002_create_schema_with_drop.sql`
3. Run `0003_geographic_standardization.sql`
4. Run `0008_create_materialized_views.sql`

## Troubleshooting

### Error: "column state_code does not exist"

This error occurs if tables already exist without the `state_code` column. You have two options:

**Option 1: Drop and recreate (loses existing data)**

- Use `0002_create_schema_with_drop.sql` instead
- This will delete all existing data and recreate tables

**Option 2: Preserve existing data**

1. Run `0002_check_and_fix_schema.sql` first to add missing columns
2. Then run `0002_create_schema.sql` (will skip existing tables but create missing ones)

## Notes

- Supabase includes PostGIS by default, but this migration ensures it's explicitly enabled
- Always run migrations in order (sequential numbering)
- Test migrations on a development database first
- If you see column errors, check if tables already exist with old schema
