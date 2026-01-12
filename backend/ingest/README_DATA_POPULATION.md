# Data Population Guide

This guide explains how to populate your database with bills, votes, statements, and link donations to politicians.

## Overview

Your database currently has politicians but may be missing:
- **Bills** - Legislation voted on
- **Votes** - How politicians voted on bills
- **Statements** - Public statements from politicians
- **Linked Donations** - Campaign finance data tied to specific politicians

The existing **sources** table contains raw data that can be processed and linked to politicians.

## Quick Start

### 1. Check Current Status

```bash
cd backend/ingest
python populate_politician_data.py --check-only
```

This will show you:
- Row counts for all tables
- Which politicians are missing data
- How many orphaned donations exist
- Sample data distribution

### 2. Populate Everything

```bash
# Make sure CONGRESS_GOV_API_KEY is set in your .env file
python populate_politician_data.py --populate-all --max-bills 100
```

This will:
- Fetch recent votes and bills from ProPublica API
- Add sample statements for major politicians
- Check for orphaned donations
- Show before/after status

### 3. Populate Specific Data Types

```bash
# Only populate votes and bills
python populate_politician_data.py --votes-only --congress 118 --max-bills 100

# Only add sample statements
python populate_politician_data.py --statements-only

# Only check donations
python populate_politician_data.py --donations-only
```

## Individual Ingest Scripts

### Congress.gov Votes & Bills

```bash
# Fetch members
python congress_gov_ingest.py --congress 118 --chamber both --members-only

# Fetch bills
python congress_gov_ingest.py --congress 118 --chamber house --bills-only --max-pages 5

# The populate script automatically handles votes
```

**Requirements:**
- Congress.gov API key (FREE): https://api.congress.gov/sign-up/
- Set `CONGRESS_GOV_API_KEY` in `.env`
- **Note**: ProPublica's Congress API is deprecated and no longer available

### FEC Campaign Finance (Donations)

```bash
# Add donations for a specific politician
python fec_ingest.py --candidate-id S8TX00161 --politician-id 42 --cycle 2024

# Add for all politicians (requires name matching)
python fec_ingest.py --all-politicians --cycle 2024
```

**Requirements:**
- FEC API key (free): https://api.open.fec.gov/developers/
- Set `FEC_API_KEY` in `.env`
- FEC candidate ID for each politician (or use name search)

### Statements Ingestion

```bash
# From a URL (fetches automatically)
python statements_ingest.py --url "https://..." --politician "Joe Biden"

# Manual entry
python statements_ingest.py --text "Statement text here" --url "https://source.com" --politician "Joe Biden"

# From JSON file (bulk)
python statements_ingest.py --json-file statements.json
```

**JSON Format for Bulk Statements:**
```json
[
  {
    "politician_name": "Joe Biden",
    "url": "https://whitehouse.gov/...",
    "publisher": "White House",
    "title": "Statement on...",
    "date": "2024-01-15"
  }
]
```

## Understanding the Data Structure

### Sources Table
- Contains ALL raw data with provenance
- Each vote, bill, donation, statement has a `source_id` pointing here
- Includes publisher, URL, license info, and raw JSON

### Linking Data
All data links to politicians via `politician_id`:
```
politician 1 ─┬─→ votes
              ├─→ statements
              └─→ donations

Each links to → sources (provenance)
```

### Bills & Votes Relationship
```
bill 1 ─→ votes ─→ politician 1 (voted yes)
       ├─→ votes ─→ politician 2 (voted no)
       └─→ votes ─→ politician 3 (abstain)
```

## Troubleshooting

### "Politician not found"
Make sure politician names **exactly** match database entries:
```bash
# Check exact names in database
psql $DATABASE_URL -c "SELECT id, name FROM politicians ORDER BY name;"
```

### "No API key found"
Set in `.env`:
```bash
CONGRESS_GOV_API_KEY=your_key_here
FEC_API_KEY=your_key_here
DATABASE_URL=postgresql://...
```

Get free API keys:
- Congress.gov: https://api.congress.gov/sign-up/
- FEC: https://api.open.fec.gov/developers/

### "Rate limited"
The scripts have built-in rate limiting. If you hit limits:
- Congress.gov: Wait 1 hour (1,000 requests/hour for free tier)
- FEC: Wait 1 hour (1,000 requests/hour)
- Or use `--max-bills` to limit requests

### "Source already exists"
This is normal - the scripts check for duplicates automatically.

## Database Schema

### Donations Table
```sql
CREATE TABLE donations (
    id SERIAL PRIMARY KEY,
    politician_id INTEGER REFERENCES politicians(id),
    donor_name TEXT NOT NULL,
    donor_category TEXT NOT NULL,  -- Healthcare, Tech, Energy, etc.
    amount DECIMAL(12, 2) NOT NULL,
    date DATE NOT NULL,
    state_code CHAR(2),
    source_id INTEGER REFERENCES sources(id)
);
```

### Votes Table
```sql
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    politician_id INTEGER REFERENCES politicians(id),
    bill_id INTEGER REFERENCES bills(id),
    vote_position TEXT CHECK (vote_position IN ('yes', 'no', 'abstain', 'not_voting')),
    vote_date DATE NOT NULL,
    topic TEXT,
    source_id INTEGER REFERENCES sources(id)
);
```

### Statements Table
```sql
CREATE TABLE statements (
    id SERIAL PRIMARY KEY,
    politician_id INTEGER REFERENCES politicians(id),
    text TEXT NOT NULL,
    date DATE,
    source_id INTEGER REFERENCES sources(id)
);
```

### Bills Table
```sql
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    bill_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    topic TEXT,
    introduced_date DATE,
    source_id INTEGER REFERENCES sources(id)
);
```

## Recommended Population Strategy

1. **Start with votes** (most important for comparison features)
   ```bash
   python populate_politician_data.py --votes-only --max-bills 100
   ```

2. **Add statements** (good for personality/context)
   ```bash
   python populate_politician_data.py --statements-only
   ```

3. **Add donations** (time-consuming, do targeted)
   ```bash
   # Add for top 10 most-viewed politicians
   python fec_ingest.py --politician-id 1 --candidate-id <fec_id> --cycle 2024
   ```

4. **Check status regularly**
   ```bash
   python populate_politician_data.py --check-only
   ```

## Performance Tips

- **Bills & Votes**: Congress.gov provides bills with vote data
  - Start with `--max-bills 100` to test (~750 bills = 3 pages)
  - Each page = ~250 bills
  - Bills include associated vote data

- **Donations**: Can be very slow (100-1000 contributions per politician)
  - Use `--max-contributions 100` to limit
  - Target high-profile politicians first

- **Statements**: Manual curation recommended
  - Use `--json-file` for bulk import
  - Focus on recent major statements

## API Rate Limits

- **Congress.gov**: 1,000 requests/hour (free tier), higher limits available
- **FEC**: 1,000 requests/hour (free)
- Scripts have automatic rate limiting and retry logic

## Need Help?

Check the logs:
- `populate_politician_data.log` - Main population script
- `propublica_ingest.log` - Votes/bills ingestion
- `fec_ingest.log` - Donations ingestion
- `statements_ingest.log` - Statements ingestion

All scripts have `--help` flags for detailed options.
