## PostgreSQL Migration Instructions

You're now ready to migrate from JSON to PostgreSQL. Here's the step-by-step process:

### Prerequisites
- PostgreSQL 14+ running and accessible
- `DATABASE_URL` environment variable set in `.env`

### Step 1: Set up your environment

Create/update your `.env` file with PostgreSQL connection string:
```
DATABASE_URL=postgresql://user:password@localhost:5432/civic_lens
```

For Supabase:
```
DATABASE_URL=postgresql://postgres:password@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

### Step 2: Create the database schema

Run the migration SQL file to create tables:
```bash
psql $DATABASE_URL -f backend/app/data/0001_init.sql
```

Or if using Supabase CLI:
```bash
supabase db push
```

### Step 3: Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 4: Run the JSON-to-PostgreSQL migration script

```bash
cd backend/app/data
python migrate_json_to_psql.py
```

This script will:
- Load all politicians from `politicians.json`
- Create a default source record for the JSON data
- Insert politicians, statements, and votes into PostgreSQL
- Print a summary of what was migrated

Expected output:
```
2024-01-06 10:30:45,123 [INFO] Loaded 6 politicians from /path/to/politicians.json
2024-01-06 10:30:45,234 [INFO] Creating default source for JSON data...
2024-01-06 10:30:45,345 [INFO] Inserting politicians...
2024-01-06 10:30:45,456 [INFO] Inserted 6 politicians
2024-01-06 10:30:45,567 [INFO] Inserting votes and statements...
2024-01-06 10:30:45,678 [INFO] Inserted X statements and Y votes
============================================================
Migration Summary:
  Politicians:  6
  Statements:   X
  Votes:        Y
============================================================
2024-01-06 10:30:45,789 [INFO] Migration completed successfully!
```

### Step 5: Test the API

Start your FastAPI server:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

Test the endpoints:

**Search endpoint:**
```bash
curl http://localhost:8000/search?name=Biden
```

**Get politician by ID:**
```bash
curl http://localhost:8000/politicians/1
```

**Compare politicians:**
```bash
curl "http://localhost:8000/compare?ids=1,2,3"
```

### Troubleshooting

**"DATABASE_URL not found in environment"**
- Ensure `.env` file exists in the `backend/` directory
- Load environment: `export $(cat .env | xargs)` (Linux/Mac) or use Windows environment variables

**"Failed to connect to database"**
- Verify PostgreSQL is running: `psql $DATABASE_URL -c "SELECT 1"`
- Check credentials in CONNECTION STRING
- For Supabase, ensure firewall allows your IP

**"Relations already exist"**
- The schema was already created. Skip step 2 or drop existing tables first:
  ```sql
  DROP TABLE IF EXISTS votes, statements, offices, bills, politicians, sources CASCADE;
  ```

**API still returning empty results**
- Verify data was inserted: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM politicians;"`
- Check logs for errors in `migrate_json_to_psql.py`

### What Changed

| Aspect | Before | After |
|--------|--------|-------|
| Data source | `politicians.json` (file) | PostgreSQL database |
| Repository | `PoliticianRepo` reads JSON with `json.load()` | `PoliticianRepo` queries PostgreSQL with psycopg2 |
| API initialization | `PoliticianRepo(str(DATA_PATH))` | `PoliticianRepo()` (uses `DATABASE_URL`) |
| Performance | In-memory search (fast, limited scale) | Database queries (scalable) |

### Next Steps

1. **Backup your data**: `pg_dump $DATABASE_URL > backup.sql`
2. **Ingest real OpenStates data**: Use `openstates_ingest.py` to fetch and store live legislative data
3. **Add search indexing**: Create full-text search indexes on politician names and statements
4. **Implement caching**: Use Redis to cache popular searches
5. **Add embeddings**: Use `pgvector` for semantic search on statements
