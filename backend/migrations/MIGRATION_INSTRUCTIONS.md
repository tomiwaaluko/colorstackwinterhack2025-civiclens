# PostGIS Migration Instructions for Supabase

## Step 1: Enable PostGIS Extension

### Option A: Using Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**

   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**

   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run PostGIS Migration**

   - Copy the contents of `0001_enable_postgis.sql`
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl+Enter`

4. **Verify Installation**
   - Run this query to verify:
     ```sql
     SELECT PostGIS_version();
     ```
   - You should see the PostGIS version number (e.g., "3.4.0")

### Option B: Using Command Line (psql)

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the migration
\i backend/migrations/0001_enable_postgis.sql

# Verify
SELECT PostGIS_version();
```

### Option C: Using Python Script

```bash
cd backend
python scripts/verify_postgis.py
```

## Step 2: Update Environment Variables

1. **Create `.env` file in `backend/` directory**

   ```bash
   cd backend
   touch .env
   ```

2. **Add your Supabase connection string**

   - Get it from: Supabase Dashboard > Project Settings > Database > Connection String
   - Format: `postgresql+asyncpg://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres`
   - See `ENV_SETUP.md` for detailed instructions

3. **Your `.env` should contain:**
   ```bash
   DATABASE_URL=postgresql+asyncpg://postgres:your_password@your-project-ref.supabase.co:5432/postgres
   ```

## Step 3: Test Connection

Run the verification script:

```bash
cd backend
python scripts/verify_postgis.py
```

Expected output:

```
✅ PostGIS version: 3.4.0
✅ PostGIS extension installed: 3.4.0
✅ PostGIS function test passed: POINT(0 0)
✅ All PostGIS checks passed!
```

## Troubleshooting

### Error: "extension postgis does not exist"

- **Solution**: Supabase should have PostGIS pre-installed, but if you get this error, contact Supabase support or check if your project has PostGIS enabled in project settings.

### Error: "could not connect to server"

- **Solution**:
  - Verify your DATABASE_URL is correct
  - Check that your Supabase project is active
  - Ensure your IP is whitelisted (if IP restrictions are enabled)

### Error: "authentication failed"

- **Solution**:
  - Verify your database password is correct
  - Check if your password needs URL encoding (replace special characters with %XX)

## Next Steps

After PostGIS is enabled, proceed to:

1. Create database schema (Step 2 in prerequisites)
2. Migrate data from JSON files
3. Set up geographic data standardization
