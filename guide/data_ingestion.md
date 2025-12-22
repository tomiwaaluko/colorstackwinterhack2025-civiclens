# /docs/team/Person-A_Data-Ingestion.md
# Person A — Data & Ingestion (Schema + Pipelines + Demo Data)

## Role mission
Own the **truth layer** of CivicLens. Your job is to make sure every data point is:
- **Correct**
- **Traceable**
- **Citable**
- **Demo-safe (offline fallback works)**

**Hard rules:** citations required, no rankings/endorsements, privacy-first, demo works offline, “no evidence → Insufficient data.”

---

## Week-by-week execution plan

### Week 1 — Foundation (schema + first ingestion)
#### 1) Lock the database schema (Day 1–2)
**Goal:** create a stable schema that the backend + AI can rely on.

**Tables (minimum)**
- `politicians`
- `offices`
- `bills`
- `votes`
- `donations`
- `statements`
- `sources`
- `source_chunks`
- `embeddings` (pgvector)

**Non-negotiable provenance fields (on `sources`)**
- `source_url`
- `publisher`
- `title`
- `source_type` (vote | bill | donation | statement)
- `published_at` (nullable)
- `retrieved_at`
- `license_notes` (nullable)
- `raw_text` (or `raw_text_path`)

**Deliverables**
- `/docs/schema.md` (ERD-style description + keys)
- `/backend/migrations/0001_init.sql` (or equivalent)

**Definition of Done**
- Every factual table row can reference at least one `sources.id`
- Primary keys and indexes defined for search/join
- Demo seed can load without errors

#### 2) Create demo-safe seed dataset (Day 2–3)
**Goal:** offline demo works even if APIs fail.

**Scope suggestion (keep small)**
- 2–3 politicians (or candidates)
- 10–20 votes total
- 1–3 donor categories per politician
- 5–10 statements total
- 1–2 bills linked to votes

**Deliverables**
- `/data/demo_seed.sql`
- `/docs/demo_data_scope.md`

**Definition of Done**
- `psql < demo_seed.sql` populates all required tables
- Every record has at least one `sources` entry

#### 3) Ingest ProPublica (Day 3–7)
**Goal:** bring in “members / bills / votes” into raw tables.

**Pipeline stages**
1. Fetch (API)
2. Normalize
3. Store source metadata
4. Store raw records
5. Link to politician IDs (external IDs)
6. Generate a text “evidence bundle” per record (for chunks)

**Deliverables**
- `/ingest/propublica_ingest.py`
- `/docs/sources_propublica.md`

**Definition of Done**
- You can ingest at least the demo subset reliably
- No rows created without provenance

---

### Week 2 — Intelligence (OpenSecrets + statements + chunking)
#### 4) Ingest OpenSecrets donations (Day 8–11)
**Goal:** donor totals suitable for charts + citations.

**Deliverables**
- `/ingest/opensecrets_ingest.py`
- `/docs/sources_opensecrets.md`

**Definition of Done**
- Donations can be aggregated by category + time window
- Every donation aggregation links back to source docs

#### 5) Statements ingestion (Day 10–14)
**Goal:** curated official statements with reliable citations.

**Approach**
- Keep it curated and small for demo
- Only official pages (press releases, transcripts)

**Deliverables**
- `/ingest/statements_ingest.py`
- `/docs/sources_statements.md`

**Definition of Done**
- Each statement has clean text, url, retrieved_at

#### 6) Chunking & embeddings feed (Day 12–14)
**Goal:** prepare evidence chunks for RAG.

**Chunk rules**
- Store `chunk_text`, `source_id`, offsets
- Keep chunk size consistent (e.g., 300–800 tokens)

**Deliverables**
- `/scripts/chunk_sources.py`
- `/docs/chunking_rules.md`

**Definition of Done**
- Chunks exist and map 1:1 to sources
- No politician leakage (chunks correctly linked)

---

### Week 3 — Polish (QC + refresh plan + offline reliability)
#### 7) Data QC automation (Day 15–18)
**QC checks**
- Missing/invalid URLs
- Empty raw_text
- Orphaned chunks/embeddings
- Duplicate sources
- Outdated retrieved_at (flag only)

**Deliverables**
- `/scripts/data_qc.py`
- `/docs/data_qc_rules.md`

#### 8) Refresh + demo lock (Day 18–21)
- Freeze demo dataset
- Document refresh procedure

**Deliverables**
- `/docs/refresh_plan.md`
- `/docs/demo_lock.md`

---

## Interfaces you must coordinate with
- **Backend:** agree on schema and API-ready aggregation fields
- **AI/RAG:** agree on source_chunks format and citation mapping
- **Frontend:** agree on chart-friendly shapes (donations/votes)

---

## Daily checklist
- [ ] All new records have `sources` provenance
- [ ] Demo seed still loads cleanly
- [ ] QC script passing on demo subset
- [ ] Document any schema change in `/docs/schema.md`

---

## “Agent mode” prompts (copy/paste)
### Schema prompt
You are a data engineer. Generate a Postgres schema for CivicLens including politicians, votes, bills, donations, statements, sources, source_chunks, and embeddings (pgvector). Every factual row must be traceable to a source with URL, publisher, title, and retrieved_at.

### Ingestion prompt
Build a Python ingestion script for ProPublica/OpenSecrets that fetches data, normalizes fields, stores source provenance, links records to politicians, and outputs a demo subset seed file. Include retry logic and logging.

