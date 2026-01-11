# Data Ingestion Implementation Plan

**Status: ✅ ALL TASKS COMPLETE!**

This document outlines the plan to complete all missing data ingestion tasks from `guide/data_ingestion.md`.

**Last Updated:** All implementation tasks have been completed. All scripts are fully implemented and all documentation has been created.

## Current Status

### ✅ Completed

1. **Database Schema** - Complete with all required tables
2. **Demo Seed Dataset** - Complete with comprehensive demo data
3. **ProPublica Ingestion** (`backend/ingest/propublica_ingest.py`) - ✅ Complete (DEPRECATED)
   - Full implementation with API integration
   - Members, bills, and votes ingestion
   - **Note:** ProPublica API discontinued July 2024. See `docs/propublica_alternatives.md` for migration.
4. **OpenSecrets Ingestion** (`backend/ingest/opensecrets_ingest.py`) - ✅ Complete (DEPRECATED)
   - Full implementation with API integration
   - Donation and campaign finance data
   - **Note:** OpenSecrets API discontinued April 15, 2025. Replaced by FEC API.
5. **FEC Ingestion** (`backend/ingest/fec_ingest.py`) - ✅ Complete (Replacement)
   - Full implementation with FEC API integration
   - Itemized campaign contributions and donations
   - Official federal source for campaign finance data
   - Documentation: `docs/sources_fec.md`
6. **Statements Ingestion** (`backend/ingest/statements_ingest.py`) - ✅ Complete
   - Full implementation with URL fetching and manual entry
   - HTML parsing and text extraction
   - Documentation: `docs/sources_statements.md`
7. **Chunking & Embeddings** (`backend/scripts/chunk_sources.py`) - ✅ Complete
   - Chunking with sentence boundaries and overlap
   - Gemini embeddings generation
   - Documentation: `docs/chunking_rules.md`
8. **Data QC Automation** (`backend/scripts/data_qc.py`) - ✅ Complete
   - Comprehensive QC checks for data quality
   - Export and auto-fix capabilities
   - Documentation: `docs/data_qc_rules.md`
9. **Refresh Plan & Demo Lock** - ✅ Complete
   - `docs/refresh_plan.md` - Complete refresh procedures
   - `docs/demo_lock.md` - Demo dataset versioning strategy

### 🎉 All Tasks Complete!

All planned data ingestion tasks have been implemented and documented.

---

## Implementation Plan

### Phase 1: Data Ingestion Scripts (Week 1 & 2) - ✅ COMPLETE

#### 1. ProPublica Ingestion (`backend/ingest/propublica_ingest.py`) - ✅ COMPLETE

**Status:** ✅ Fully implemented

**Implemented Features:**

- ✅ ProPublica Congress API integration
- ✅ Fetch members, bills, and votes
- ✅ Store with full provenance (sources table)
- ✅ Link to politician IDs
- ✅ Generate evidence bundles for chunking
- ✅ Retry logic and rate limiting
- ✅ Error handling and transaction management

**Files:**

- ✅ `backend/ingest/propublica_ingest.py` (652 lines, fully implemented)
- ✅ `docs/propublica_alternatives.md` (migration guide - replaces deprecated sources_propublica.md)

**Note:** ProPublica Congress API was discontinued in July 2024. The script is complete but the API is deprecated. Use Congress.gov API instead. See `docs/propublica_alternatives.md` for migration options.

---

#### 2. OpenSecrets Ingestion (`backend/ingest/opensecrets_ingest.py`) - ✅ COMPLETE (DEPRECATED)

**Status:** ✅ Fully implemented (API discontinued)

**Implemented Features:**

- ✅ OpenSecrets API integration
- ✅ Fetch campaign finance/donation data
- ✅ Aggregate by category + time window
- ✅ Store with source provenance
- ✅ Map industry codes to our categories
- ✅ Industry mapping to donor categories
- ✅ Candidate and organization donation tracking

**Files:**

- ✅ `backend/ingest/opensecrets_ingest.py` (558 lines, fully implemented - legacy)
- ✅ `docs/opensecrets_alternatives.md` (migration guide - replaces deprecated sources_opensecrets.md)

**Note:** OpenSecrets API was discontinued on April 15, 2025. **Replaced by FEC API.** See below.

---

#### 2b. FEC Ingestion (`backend/ingest/fec_ingest.py`) - ✅ COMPLETE (Replacement)

**Status:** ✅ Fully implemented

**Implemented Features:**

- ✅ FEC API integration (replaces OpenSecrets)
- ✅ Fetch itemized campaign contributions
- ✅ Store with source provenance
- ✅ Map contributor employer/occupation to donor categories
- ✅ Candidate search and contribution tracking
- ✅ Real-time data updates
- ✅ Pagination support for large datasets

**Files:**

- ✅ `backend/ingest/fec_ingest.py` (fully implemented - replacement for OpenSecrets)
- ✅ `docs/sources_fec.md` (source documentation)
- ✅ `docs/opensecrets_alternatives.md` (migration guide)

**Note:** FEC API is the official federal source for campaign finance data. See `docs/opensecrets_alternatives.md` for migration details.

---

#### 3. Statements Ingestion (`backend/ingest/statements_ingest.py`) - ✅ COMPLETE

**Status:** ✅ Fully implemented

**Implemented Features:**

- ✅ Curated official statements ingestion
- ✅ Support multiple sources (official websites, press releases)
- ✅ Extract clean text from HTML/PDF
- ✅ Store with full citation information
- ✅ Date parsing and validation
- ✅ URL-based fetching with HTML parsing
- ✅ JSON file batch processing
- ✅ Manual entry support
- ✅ BeautifulSoup4 integration with fallback

**Files:**

- ✅ `backend/ingest/statements_ingest.py` (502 lines, fully implemented)
- ✅ `docs/sources_statements.md` (documentation complete)

---

### Phase 2: Data Processing (Week 2) - ✅ COMPLETE

#### 4. Chunking & Embeddings (`backend/scripts/chunk_sources.py`) - ✅ COMPLETE

**Status:** ✅ Fully implemented

**Implemented Features:**

- ✅ Chunk source text into 300-800 token pieces
- ✅ Store chunks in `source_chunks` table
- ✅ Generate embeddings using Gemini or other model
- ✅ Store embeddings in `embeddings` table (pgvector)
- ✅ Maintain 1:1 mapping between sources and chunks
- ✅ Preserve offsets for citation tracking
- ✅ Sentence boundary respect
- ✅ Overlap between chunks (100 tokens)
- ✅ Token counting with tiktoken (with fallback)
- ✅ Regenerate support

**Files:**

- ✅ `backend/scripts/chunk_sources.py` (471 lines, fully implemented)
- ✅ `docs/chunking_rules.md` (documentation complete)

---

### Phase 3: Quality Control & Maintenance (Week 3) - ✅ COMPLETE

#### 5. Data QC Automation (`backend/scripts/data_qc.py`) - ✅ COMPLETE

**Status:** ✅ Fully implemented

**Implemented QC Checks:**

- ✅ Missing/invalid URLs (source_url validation)
- ✅ Empty raw_text fields
- ✅ Orphaned chunks/embeddings (no source)
- ✅ Duplicate sources (same URL)
- ✅ Outdated retrieved_at (flag records > 90 days old)
- ✅ Missing required fields
- ✅ Invalid foreign key references

**Implemented Features:**

- ✅ Report of issues found
- ✅ Auto-fix for simple issues (dry-run support)
- ✅ Export issues to JSON
- ✅ Severity levels (error, warning, info)
- ✅ Summary reporting

**Files:**

- ✅ `backend/scripts/data_qc.py` (521 lines, fully implemented)
- ✅ `docs/data_qc_rules.md` (documentation complete)

---

#### 6. Refresh Plan & Demo Lock (`docs/refresh_plan.md` & `docs/demo_lock.md`) - ✅ COMPLETE

**Status:** ✅ Fully documented

**Documented Content:**

- ✅ Refresh procedure for all data sources
- ✅ Demo dataset freeze point (Version 1.0, locked 2024-01-15)
- ✅ Version control for demo data
- ✅ Backup/restore procedures
- ✅ Migration path for schema changes
- ✅ Scheduled refresh procedures
- ✅ Refresh tracking and monitoring
- ✅ Error recovery procedures

**Files:**

- ✅ `docs/refresh_plan.md` (499 lines, fully documented)
- ✅ `docs/demo_lock.md` (264 lines, fully documented)

---

## Implementation Order

**Status: ✅ All Completed!**

1. ✅ **ProPublica Ingestion** - Foundation for members/bills/votes - **COMPLETE**
2. ✅ **OpenSecrets Ingestion** - Complete the placeholder - **COMPLETE**
3. ✅ **Statements Ingestion** - Add statement source - **COMPLETE**
4. ✅ **Chunking & Embeddings** - Enable RAG functionality - **COMPLETE**
5. ✅ **Data QC** - Ensure data quality - **COMPLETE**
6. ✅ **Refresh Plan** - Document maintenance procedures - **COMPLETE**

All planned implementation tasks have been completed and documented.

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
