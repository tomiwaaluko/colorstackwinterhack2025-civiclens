# Environment Setup for Supabase PostgreSQL

This document explains how to configure your environment for Supabase PostgreSQL with PostGIS.

## Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```bash
# Database Configuration
# Get your Supabase connection string from:
# Supabase Dashboard > Project Settings > Database > Connection String > Connection Pooling
# Or use Direct Connection: Project Settings > Database > Connection String > URI
DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Demo/Offline Mode
DEMO_MODE=false

# Mapbox Configuration (for frontend maps - optional)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here

# Redis Configuration (optional, for caching)
REDIS_URL=redis://localhost:6379
```

## Getting Your Supabase Connection String

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** > **Database**
3. Find the **Connection String** section
4. You have two options:

   **Option A: Direct Connection (Recommended for development)**
   - Select "Connection string" > "URI"
   - Copy the connection string
   - Replace `postgresql://` with `postgresql+asyncpg://`
   - Example: `postgresql+asyncpg://postgres:password@xxx.supabase.co:5432/postgres`

   **Option B: Connection Pooling (Better for production)**
   - Use the "Session" mode connection pooler
   - Format: `postgresql+asyncpg://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

## PostGIS Setup

Supabase includes PostGIS by default, but you need to enable it:

### Using Supabase SQL Editor

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `migrations/0001_enable_postgis.sql`
5. Run the query

### Verify PostGIS Installation

Run the verification script:

```bash
cd backend
python scripts/verify_postgis.py
```

Or verify manually in Supabase SQL Editor:

```sql
SELECT PostGIS_version();
```

## Testing the Connection

Test your database connection:

```bash
cd backend
python -c "from app.core.database import DATABASE_URL; print('DATABASE_URL:', DATABASE_URL[:50] + '...' if len(DATABASE_URL) > 50 else DATABASE_URL)"
```

## Security Notes

- **Never commit `.env` files to git** (already in .gitignore)
- Store production credentials securely (use Supabase environment variables or secrets management)
- Use connection pooling for production deployments
- Rotate database passwords regularly

