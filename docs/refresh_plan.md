# Data Refresh Plan

## Overview

This document describes the procedure for refreshing data from various sources in the CivicLens database.

## Prerequisites

Before running any refresh procedures, ensure the following are in place:

### Environment Setup
- **Python 3.x environment**: Python 3.8 or higher with required packages installed
- **Dependencies**: Install packages from `requirements.txt` or equivalent:
  ```bash
  pip install requests psycopg2-binary python-dotenv beautifulsoup4 html2text
  ```

### Database Configuration
- **Database credentials**: Configure `DATABASE_URL` environment variable
  ```bash
  export DATABASE_URL=postgresql://user:pass@localhost/dbname
  ```
- **Database access**: Ensure database is accessible and you have appropriate permissions

### Directory Structure
- **Backend directory**: Ensure `backend/ingest/` directory exists with scripts:
  - `backend/ingest/congress_gov_ingest.py` (replaces propublica_ingest.py)
  - `backend/ingest/opensecrets_ingest.py`
  - `backend/ingest/statements_ingest.py`
- **Scripts directory**: Ensure `backend/scripts/` exists with:
  - `backend/scripts/chunk_sources.py`
  - `backend/scripts/refresh_materialized_views.py`
  - `backend/scripts/data_qc.py`
  - `backend/scripts/verify_demo_data.py`

### API Keys
- **Congress.gov API Key**: Set `CONGRESS_GOV_API_KEY` environment variable
  - Obtain from: https://api.congress.gov/
  - Note: ProPublica Congress API was discontinued July 2024. Congress.gov is the replacement.
- **OpenSecrets API Key**: Set `OPENSECRETS_API_KEY` environment variable
  - Obtain from: https://www.opensecrets.org/open-data/api-documentation

## Refresh Strategy

### Incremental vs Full Refresh

**Incremental Refresh** (Preferred):
- Only fetch new/updated records since last refresh
- More efficient and faster
- Requires tracking of last refresh timestamps

**Full Refresh** (Fallback):
- Re-fetch all data from sources
- Used when incremental refresh not supported
- More time-consuming but ensures completeness

## Source-Specific Refresh Procedures

### 1. Congress.gov Data (Congressional Members, Bills, Votes)

**Refresh Frequency**: Monthly or on-demand

**Procedure**:
```bash
# Refresh members and bills for current Congress
python backend/ingest/congress_gov_ingest.py --congress 118

# Refresh specific chamber
python backend/ingest/congress_gov_ingest.py --congress 118 --chamber house

# Refresh only members
python backend/ingest/congress_gov_ingest.py --congress 118 --members-only

# Refresh only bills
python backend/ingest/congress_gov_ingest.py --congress 118 --bills-only
```

**Notes**:
- Congress.gov is the official source for Congressional data
- Rate limit: 1,000 requests per day (free tier)
- Focus on current Congress for active data
- Historical Congresses rarely change
- See `docs/sources_congress_gov.md` for full documentation

**Incremental Strategy**:
- Track `introduced_date` for bills
- Track `vote_date` for votes
- Only fetch records newer than last refresh
- Monitor daily API request limit (1,000/day)

---

### 2. OpenSecrets Data

**Refresh Frequency**: Quarterly (after election cycles) or on-demand

**Procedure**:
```bash
# Refresh donations for specific cycle
# Example: python backend/ingest/opensecrets_ingest.py --cid <committee-id> --politician-id <politician-id> --cycle <year>
python backend/ingest/opensecrets_ingest.py --cid N00000019 --politician-id 12345 --cycle 2024
```

**Note**: Replace placeholders with actual values:
- `--cid`: OpenSecrets candidate ID (CRP ID), e.g., `N00000019`
- `--politician-id`: Internal politician record ID from your database (query `SELECT id, name FROM politicians;`)
- `--cycle`: Election cycle year, e.g., `2024`

**Notes**:
- Donation data is cumulative per cycle
- Refresh when new cycle data available
- Focus on current and recent cycles

**Incremental Strategy**:
- Cycle-based: Refresh entire cycle when complete
- Track cycle completion dates

---

### 3. Statements

**Refresh Frequency**: On-demand or scheduled weekly

**Procedure**:
```bash
# Refresh from JSON file
python backend/ingest/statements_ingest.py --json-file statements.json

# Refresh specific URL
# Example: python backend/ingest/statements_ingest.py --url <url> --politician "<politician-name>"
python backend/ingest/statements_ingest.py --url "https://example.com/press-release" --politician "Joe Biden"
```

**Notes**:
- Statements are manually curated
- Check source URLs for new content
- Verify dates and relevance

**Incremental Strategy**:
- Check source URLs for new content
- Compare last modified dates
- Manual curation workflow

---

### 4. Chunks and Embeddings

**Refresh Frequency**: After source data refresh

**Procedure**:
```bash
# Re-chunk all sources
python backend/scripts/chunk_sources.py --regenerate

# Re-chunk specific source type
python backend/scripts/chunk_sources.py --source-type "statement" --regenerate
```

**Notes**:
- Regenerate chunks when source text changes
- Embeddings must match chunks
- Use `--regenerate` flag to replace existing

**When to Refresh**:
- After source data updates
- When chunking strategy changes
- After embedding model updates

---

### 5. Materialized Views

**Refresh Frequency**: After data updates

**Procedure**:
```bash
# Refresh all materialized views
python backend/scripts/refresh_materialized_views.py

# Or via API
curl -X POST http://localhost:8000/api/admin/refresh-materialized-views
```

**Notes**:
- Materialized views cache aggregations
- Must refresh after underlying data changes
- Use concurrent refresh when possible

---

## Complete Refresh Workflow

### Step 1: Backup Current Data

```bash
# Export database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Step 2: Refresh Source Data

```bash
# Refresh Congress.gov data
python backend/ingest/congress_gov_ingest.py --congress 118

# Refresh OpenSecrets (for each politician/cycle)
python backend/ingest/opensecrets_ingest.py --cid N00000019 --politician-id 12345 --cycle 2024

# Refresh Statements
python backend/ingest/statements_ingest.py --json-file statements.json
```

**Validation after Step 2**:
- **Exit code check**: Verify all scripts exit with code 0 (success)
- **Error log review**: Check `congress_gov_ingest.log`, `opensecrets_ingest.log`, `statements_ingest.log` for errors
- **Row count verification**: Query database to confirm expected records were ingested:
  ```sql
  SELECT COUNT(*) FROM politicians;
  SELECT COUNT(*) FROM bills;
  SELECT COUNT(*) FROM votes;
  SELECT COUNT(*) FROM donations;
  SELECT COUNT(*) FROM statements;
  ```
- **Success criteria**: 
  - Zero critical errors in logs
  - Expected row counts match previous refresh or documented targets
  - All source records have valid URLs and raw_text
- **Failure handling**: If critical errors found, abort and restore from backup (Step 1). Review logs and fix issues before retrying.

### Step 3: Re-chunk and Generate Embeddings

```bash
# Chunk all updated sources
python backend/scripts/chunk_sources.py

# Or regenerate all
python backend/scripts/chunk_sources.py --regenerate
```

**Validation after Step 3**:
- **Exit code check**: Verify `chunk_sources.py` exits with code 0
- **Chunk count verification**: Query to confirm chunks were created:
  ```sql
  SELECT COUNT(*) FROM source_chunks;
  SELECT COUNT(*) FROM embeddings WHERE model_name = 'gemini-embedding-001';
  ```
- **Success criteria**:
  - All sources with raw_text have corresponding chunks
  - Embedding generation completed (if enabled)
  - Chunk count matches expected (typically 1-10 chunks per source depending on text length)
- **Failure handling**: If chunking fails, check `chunk_sources.log` for errors. Regenerate specific sources if needed.

### Step 4: Refresh Materialized Views

```bash
python backend/scripts/refresh_materialized_views.py
```

**Validation after Step 4**:
- **Exit code check**: Verify script exits with code 0
- **Refresh time**: Materialized view refresh should complete within expected time (typically 5-10 minutes)
- **Success criteria**: No errors in logs, views refresh successfully
- **Failure handling**: If refresh fails, check database logs and retry. Concurrent refresh may be needed for large datasets.

### Step 5: Run QC Checks

```bash
python backend/scripts/data_qc.py --export qc_report.json
```

**Validation after Step 5**:
- **Exit code check**: Verify `data_qc.py` exits with code 0
- **QC Report review**: Check `qc_report.json` for:
  - **Summary counts**: `total_issues`, breakdown by `severity` (error/warning/info)
  - **Failed records**: Review `failed_records` array for patterns
  - **Sample entries**: Check sample record entries for data quality issues
  - **Timestamps**: Verify report timestamp matches refresh time
- **Success criteria**:
  - Zero critical errors (severity: "error")
  - Warning count below threshold (e.g., < 10 warnings acceptable)
  - Info-level issues are informational only (e.g., outdated sources)
- **QC Report structure**:
  ```json
  {
    "timestamp": "2024-01-15T10:30:00",
    "total_issues": 5,
    "issues": [
      {
        "check_name": "missing_invalid_url",
        "severity": "error",
        "table": "sources",
        "record_id": 123,
        "description": "...",
        "fixable": false
      }
    ]
  }
  ```
- **Failure handling**: 
  - **Blocking errors**: If critical errors found, abort refresh and restore from backup
  - **Non-blocking warnings**: Log warnings and proceed with manual review
  - **Remediation**: Use `data_qc.py --fix --no-dry-run` to apply fixable fixes, or manually address issues
- **Re-run**: Re-run QC after fixes: `python backend/scripts/data_qc.py --export qc_report_after_fixes.json`

### Step 6: Verify Data

```bash
# Run demo data verification
python backend/scripts/verify_demo_data.py
```

**Validation after Step 6**:
- **Exit code check**: Verify `verify_demo_data.py` exits with code 0
- **Verification checks**: The script checks:
  - **Schema conformity**: All tables have expected columns and types
  - **Required demo records**: Expected demo politicians, bills, votes, statements present
  - **Value ranges**: Dates, amounts, and other values within expected ranges
  - **Referential integrity**: Foreign keys are valid (politicians exist, bills exist, etc.)
- **Success messages**: Look for output like:
  ```
  ✅ All verification checks passed!
     Demo data is ready for visualization testing.
  ```
- **Failure messages**: Script will report specific failures:
  ```
  ❌ Verification failed: Missing required politician: Joe Biden
  ❌ Verification failed: Invalid foreign key in votes table
  ```
- **Success criteria**:
  - All schema checks pass
  - Required demo records present
  - No referential integrity violations
  - Value ranges valid
- **Failure handling**: 
  - **Blocking failures**: Abort and restore from backup if critical data missing
  - **Non-blocking issues**: Log and review, may require data correction
- **Re-run**: After fixes, re-run verification: `python backend/scripts/verify_demo_data.py`

## Scheduled Refresh (Automation)

### Using Cron (Linux/Mac)

```bash
# Add to crontab (crontab -e)
# Refresh Congress.gov data monthly
0 2 1 * * cd /path/to/project/backend && python ingest/congress_gov_ingest.py --congress 118

# Refresh chunks weekly
0 3 * * 0 cd /path/to/project/backend && python scripts/chunk_sources.py

# Refresh materialized views daily
0 4 * * * cd /path/to/project/backend && python scripts/refresh_materialized_views.py

# Run QC checks weekly
0 5 * * 0 cd /path/to/project/backend && python scripts/data_qc.py --export /path/to/qc_reports/qc_$(date +\%Y\%m\%d).json
```

### Using Task Scheduler (Windows)

Create scheduled tasks for:
1. Monthly Congress.gov refresh
2. Weekly chunking
3. Daily materialized view refresh
4. Weekly QC checks

## Refresh Tracking

### Track Last Refresh Times

Consider adding a `refresh_log` table:

```sql
CREATE TABLE IF NOT EXISTS refresh_log (
    id SERIAL PRIMARY KEY,
    source_type TEXT NOT NULL,
    last_refresh TIMESTAMP NOT NULL,
    records_updated INTEGER,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Monitor Refresh Status

Check last refresh times:
```sql
SELECT source_type, MAX(last_refresh) as last_refresh
FROM refresh_log
GROUP BY source_type;
```

## Rollback Procedure

If refresh causes issues:

1. **Stop any running refresh processes**
2. **Restore from backup**:
   ```bash
   psql $DATABASE_URL < backup_YYYYMMDD.sql
   ```
3. **Verify data integrity**
4. **Investigate and fix issues**
5. **Re-attempt refresh**

## Performance Considerations

### Parallel Processing
- **Concurrency Safety**: 
  - **Different sources**: Safe to refresh Congress.gov, OpenSecrets, and Statements in parallel (they write to different tables)
  - **Chunk writes**: Chunking operations are safe to run in parallel for different source IDs, but avoid parallel chunking of the same source
  - **Materialized views**: Materialized view refreshes should run sequentially to avoid lock contention
  - **Failure isolation**: If one parallel job fails, others can continue. Aggregate failures at the end and report all issues
- Use separate processes for different sources
- Monitor resource usage (CPU, memory, database connections)

### Rate Limiting
- Respect API rate limits
- Add delays between requests
- Batch operations when possible

### Database Performance
- Use transactions for atomicity
- Refresh materialized views during low-traffic hours
- Monitor database load

### Logging and Monitoring
- **Log locations**: 
  - Centralized logging: All scripts write to log files in the project root (e.g., `congress_gov_ingest.log`, `opensecrets_ingest.log`, `statements_ingest.log`, `chunk_sources.log`, `data_qc.log`)
  - Structured logs: Use consistent log format with timestamps, levels, and context
- **Metrics to emit**:
  - Job start/finish timestamps
  - Duration (total time for refresh operation)
  - Progress indicators (e.g., "Processing 50/100 sources")
  - Failure counts and error summaries
  - Row counts ingested/updated
- **Log levels**: 
  - `INFO`: Normal operation progress
  - `WARNING`: Non-critical issues (missing optional data, retries)
  - `ERROR`: Failures that prevent completion
  - `DEBUG`: Detailed debugging information (enable only when troubleshooting)
- **Log retention**: Retain logs for at least 30 days for troubleshooting
- **Alerting thresholds**: 
  - Alert on: Job failures, error rate > 5%, duration > 2x expected time
  - Monitor: Warning count trends, API rate limit hits

### Error Recovery
- **Timeout expectations**: 
  - API requests: 30 second timeout per request
  - Total job duration: 2-4 hours for complete refresh
- **Watchdog/retry behavior**: 
  - Implement exponential backoff for transient failures (network, rate limits)
  - Maximum retries: 3 attempts for API calls
  - Watchdog: Monitor long-running jobs and alert if stuck (> 6 hours)
- **Retry/backoff strategy**: 
  - Initial delay: 1 second
  - Exponential backoff: 2^attempt seconds
  - Maximum delay: 60 seconds between retries
- **Failure isolation semantics**: 
  - **One job fails**: Other parallel jobs continue, aggregate all failures at end
  - **Critical failure**: Abort entire refresh, restore from backup
  - **Non-critical failure**: Log and continue, report at end
- **Recovery flow example**:
  1. Job fails with database connection error
  2. Log error with full context
  3. If retryable: Wait with exponential backoff, retry
  4. If non-retryable: Mark job as failed, continue other jobs
  5. At end: Report all failures, provide rollback instructions
  6. Operator reviews logs, fixes issues, re-runs failed jobs

## Maintenance Windows

**Recommended**: Off-peak hours (e.g., 2-5 AM)

**Duration**:
- Congress.gov: 30-90 minutes (rate limit: 1,000 requests/day may require multiple days for large refreshes)
- OpenSecrets: 15-30 minutes per politician
- Statements: 10-20 minutes
- Chunking: 30-120 minutes (depending on volume)
- Materialized views: 5-10 minutes

**Total**: 2-4 hours for complete refresh

## Future Enhancements

- [ ] Automated incremental refresh
- [ ] Refresh scheduling UI
- [ ] Refresh status dashboard
- [ ] Automated rollback on failure
- [ ] Refresh notifications
- [ ] Performance monitoring
- [ ] Refresh history tracking

## Related Files

- Refresh Scripts: `backend/scripts/refresh_materialized_views.py`
- Ingestion Scripts: `backend/ingest/*.py`
- QC Script: `backend/scripts/data_qc.py`

