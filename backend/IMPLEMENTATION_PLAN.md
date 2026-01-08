# Data Ingestion Implementation Plan

This document outlines the plan to complete all missing data ingestion tasks from `guide/data_ingestion.md`.

## Current Status

### ✅ Completed
1. **Database Schema** - Complete with all required tables
2. **Demo Seed Dataset** - Complete with comprehensive demo data

### ❌ Missing (To Implement)
1. **ProPublica Ingestion** (Week 1, Task 3)
2. **OpenSecrets Ingestion** - Currently placeholder only (Week 2, Task 4)
3. **Statements Ingestion** (Week 2, Task 5)
4. **Chunking & Embeddings** (Week 2, Task 6)
5. **Data QC Automation** (Week 3, Task 7)
6. **Refresh Plan & Demo Lock** (Week 3, Task 8)

---

## Implementation Plan

### Phase 1: Data Ingestion Scripts (Week 1 & 2)

#### 1. ProPublica Ingestion (`backend/ingest/propublica_ingest.py`)
**Requirements:**
- ProPublica Congress API integration
- Fetch members, bills, and votes
- Store with full provenance (sources table)
- Link to politician IDs
- Generate evidence bundles for chunking
- Retry logic and rate limiting

**Dependencies:**
- ProPublica API key (environment variable: `PROPUBLICA_API_KEY`)
- psycopg2 or asyncpg for database operations
- requests or httpx for API calls

**Deliverables:**
- `backend/ingest/propublica_ingest.py`
- `docs/sources_propublica.md`

---

#### 2. OpenSecrets Ingestion (`backend/ingest/opensecrets_ingest.py`)
**Current Status:** Placeholder exists, needs full implementation

**Requirements:**
- OpenSecrets API integration
- Fetch campaign finance/donation data
- Aggregate by category + time window
- Store with source provenance
- Map industry codes to our categories

**Dependencies:**
- OpenSecrets API key (environment variable: `OPENSECRETS_API_KEY`)
- Database connection

**Deliverables:**
- Complete `backend/ingest/opensecrets_ingest.py` (currently placeholder)
- `docs/sources_opensecrets.md`

---

#### 3. Statements Ingestion (`backend/ingest/statements_ingest.py`)
**Requirements:**
- Curated official statements ingestion
- Support multiple sources (official websites, press releases)
- Extract clean text from HTML/PDF
- Store with full citation information
- Date parsing and validation

**Approach:**
- Start with curated list for demo
- Focus on official sources only
- Manual curation supported for quality control

**Deliverables:**
- `backend/ingest/statements_ingest.py`
- `docs/sources_statements.md`

---

### Phase 2: Data Processing (Week 2)

#### 4. Chunking & Embeddings (`backend/scripts/chunk_sources.py`)
**Requirements:**
- Chunk source text into 300-800 token pieces
- Store chunks in `source_chunks` table
- Generate embeddings using Gemini or other model
- Store embeddings in `embeddings` table (pgvector)
- Maintain 1:1 mapping between sources and chunks
- Preserve offsets for citation tracking

**Chunking Rules:**
- Overlap chunks slightly (50-100 tokens) for context
- Respect sentence boundaries
- Preserve formatting where possible
- Track character offsets in original text

**Dependencies:**
- Gemini API key (for embeddings)
- pgvector extension enabled
- Token counting library

**Deliverables:**
- `backend/scripts/chunk_sources.py`
- `docs/chunking_rules.md`

---

### Phase 3: Quality Control & Maintenance (Week 3)

#### 5. Data QC Automation (`backend/scripts/data_qc.py`)
**QC Checks to Implement:**
- Missing/invalid URLs (source_url validation)
- Empty raw_text fields
- Orphaned chunks/embeddings (no source)
- Duplicate sources (same URL)
- Outdated retrieved_at (flag records > 90 days old)
- Missing required fields
- Invalid foreign key references

**Output:**
- Report of issues found
- Optional: Auto-fix for simple issues
- Optional: Export issues to CSV/JSON

**Deliverables:**
- `backend/scripts/data_qc.py`
- `docs/data_qc_rules.md`

---

#### 6. Refresh Plan & Demo Lock (`docs/refresh_plan.md` & `docs/demo_lock.md`)
**Requirements:**
- Document refresh procedure for all data sources
- Define demo dataset freeze point
- Version control for demo data
- Backup/restore procedures
- Migration path for schema changes

**Deliverables:**
- `docs/refresh_plan.md`
- `docs/demo_lock.md`

---

## Implementation Order

1. **ProPublica Ingestion** - Foundation for members/bills/votes
2. **OpenSecrets Ingestion** - Complete the placeholder
3. **Statements Ingestion** - Add statement source
4. **Chunking & Embeddings** - Enable RAG functionality
5. **Data QC** - Ensure data quality
6. **Refresh Plan** - Document maintenance procedures

---

## Common Patterns Across All Scripts

### Database Connection
- Use `psycopg2` for synchronous operations (ingestion scripts)
- Support `DATABASE_URL` environment variable
- Handle connection errors gracefully
- Use connection pooling where appropriate

### Source Provenance
- Every factual record MUST reference a source
- Store source metadata in `sources` table
- Include: source_url, publisher, title, source_type, retrieved_at
- Preserve raw_text or raw_text_path

### Error Handling
- Retry logic for API calls (exponential backoff)
- Logging to file and console
- Transaction rollback on failure
- Continue processing on individual record failures

### Rate Limiting
- Respect API rate limits
- Add delays between requests
- Use API key when required
- Handle 429 (rate limit) errors

---

## Testing Strategy

For each script:
1. Test with demo dataset first
2. Verify all records have source provenance
3. Check data integrity (foreign keys, required fields)
4. Run QC script on output
5. Test error handling (invalid API key, network failure, etc.)

---

## Environment Variables Needed

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# API Keys
PROPUBLICA_API_KEY=your_key_here
OPENSECRETS_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here  # For embeddings

# Optional
LOG_LEVEL=INFO
```

---

## Notes

- All scripts should work with demo mode (offline)
- Scripts should be idempotent (safe to run multiple times)
- Use existing patterns from `backend/app/data/openstates_ingest.py` as reference
- Follow the schema defined in `docs/schema.md`
- Ensure backward compatibility with existing demo data

