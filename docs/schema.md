# CivicLens Database Schema

## Overview

This document describes the database schema for CivicLens. Every factual record must be traceable to a source with proper citations (non-negotiable provenance requirement).

## Entity Relationship Diagram

```
sources (1) ────< (many) politicians
                  < (many) bills
                  < (many) votes
                  < (many) donations
                  < (many) statements

politicians (1) ────< (many) offices
                 < (many) votes
                 < (many) donations
                 < (many) statements

bills (1) ────< (many) votes

source_chunks (many) ────< (1) sources
source_chunks (1) ────< (1) embeddings
```

## Tables

### sources

**Purpose:** Non-negotiable provenance table. Every factual record must reference at least one source.

| Column        | Type                     | Constraints     | Description                                           |
| ------------- | ------------------------ | --------------- | ----------------------------------------------------- |
| id            | SERIAL                   | PRIMARY KEY     | Unique identifier                                     |
| source_url    | TEXT                     | NOT NULL        | URL to the source document                            |
| publisher     | TEXT                     | NOT NULL        | Name of publisher (e.g., "ProPublica", "OpenSecrets") |
| title         | TEXT                     | NOT NULL        | Title of the source                                   |
| source_type   | TEXT                     | NOT NULL, CHECK | Type: 'vote', 'bill', 'donation', 'statement'         |
| published_at  | TIMESTAMP WITH TIME ZONE | NULLABLE        | Original publication date                             |
| retrieved_at  | TIMESTAMP WITH TIME ZONE | NOT NULL        | When we retrieved the data                            |
| license_notes | TEXT                     | NULLABLE        | Licensing information                                 |
| raw_text      | TEXT                     | NULLABLE        | Full text of source                                   |
| raw_text_path | TEXT                     | NULLABLE        | Path to stored file                                   |
| created_at    | TIMESTAMP WITH TIME ZONE | NOT NULL        | Record creation timestamp                             |
| updated_at    | TIMESTAMP WITH TIME ZONE | NOT NULL        | Record update timestamp                               |

**Indexes:**

- `idx_sources_type` on `source_type`
- `idx_sources_publisher` on `publisher`
- `idx_sources_url` on `source_url`

---

### politicians

**Purpose:** Store politician information with standardized geographic fields.

| Column          | Type                     | Constraints     | Description                                                                     |
| --------------- | ------------------------ | --------------- | ------------------------------------------------------------------------------- |
| id              | SERIAL                   | PRIMARY KEY     | Unique identifier                                                               |
| name            | TEXT                     | NOT NULL        | Full name                                                                       |
| party           | TEXT                     | NOT NULL, CHECK | 'Democrat', 'Republican', 'Independent', 'Other'                                |
| state_code      | CHAR(2)                  | NULLABLE        | 2-letter USPS state code (CA, NY, etc.)                                         |
| district_number | INTEGER                  | NULLABLE, CHECK | Congressional district (1-53) or NULL for senators                              |
| position        | TEXT                     | NOT NULL, CHECK | 'President', 'Vice President', 'Senator', 'Representative', 'Governor', 'Other' |
| image_url       | TEXT                     | NULLABLE        | URL to politician photo                                                         |
| bio             | TEXT                     | NULLABLE        | Biography                                                                       |
| created_at      | TIMESTAMP WITH TIME ZONE | NOT NULL        | Record creation timestamp                                                       |
| updated_at      | TIMESTAMP WITH TIME ZONE | NOT NULL        | Record update timestamp                                                         |

**Indexes:**

- `idx_politicians_state_code` on `state_code` (for map aggregation)
- `idx_politicians_party` on `party`
- `idx_politicians_position` on `position`
- `idx_politicians_name` on `name`

**Geographic Fields:**

- `state_code`: Standardized 2-letter codes for visualization consistency
- `district_number`: Separate field for district-level mapping (future)

---

### offices

**Purpose:** Track office history for politicians.

| Column          | Type                     | Constraints  | Description                         |
| --------------- | ------------------------ | ------------ | ----------------------------------- |
| id              | SERIAL                   | PRIMARY KEY  | Unique identifier                   |
| politician_id   | INTEGER                  | NOT NULL, FK | References politicians(id)          |
| position        | TEXT                     | NOT NULL     | Office position                     |
| state_code      | CHAR(2)                  | NULLABLE     | State code for this office          |
| district_number | INTEGER                  | NULLABLE     | District number                     |
| start_date      | DATE                     | NULLABLE     | When office started                 |
| end_date        | DATE                     | NULLABLE     | When office ended (NULL if current) |
| created_at      | TIMESTAMP WITH TIME ZONE | NOT NULL     | Record creation timestamp           |
| updated_at      | TIMESTAMP WITH TIME ZONE | NOT NULL     | Record update timestamp             |

**Foreign Keys:**

- `politician_id` → `politicians(id)` ON DELETE CASCADE

**Indexes:**

- `idx_offices_politician_id` on `politician_id`
- `idx_offices_state_code` on `state_code`

---

### bills

**Purpose:** Store legislative bills for network graph visualization.

| Column          | Type                     | Constraints      | Description                                      |
| --------------- | ------------------------ | ---------------- | ------------------------------------------------ |
| id              | SERIAL                   | PRIMARY KEY      | Unique identifier                                |
| bill_number     | TEXT                     | NOT NULL, UNIQUE | Official bill number (e.g., 'HR 1234', 'S 5678') |
| title           | TEXT                     | NOT NULL         | Bill title                                       |
| topic           | TEXT                     | NULLABLE         | Category (Healthcare, Energy, etc.)              |
| introduced_date | DATE                     | NULLABLE         | When bill was introduced                         |
| source_id       | INTEGER                  | NOT NULL, FK     | References sources(id)                           |
| created_at      | TIMESTAMP WITH TIME ZONE | NOT NULL         | Record creation timestamp                        |
| updated_at      | TIMESTAMP WITH TIME ZONE | NOT NULL         | Record update timestamp                          |

**Foreign Keys:**

- `source_id` → `sources(id)` ON DELETE RESTRICT

**Indexes:**

- `idx_bills_bill_number` on `bill_number`
- `idx_bills_topic` on `topic`
- `idx_bills_introduced_date` on `introduced_date`
- `idx_bills_source_id` on `source_id`

---

### votes

**Purpose:** Store voting records with dates for timeline visualization.

| Column        | Type                     | Constraints     | Description                          |
| ------------- | ------------------------ | --------------- | ------------------------------------ |
| id            | SERIAL                   | PRIMARY KEY     | Unique identifier                    |
| politician_id | INTEGER                  | NOT NULL, FK    | References politicians(id)           |
| bill_id       | INTEGER                  | NOT NULL, FK    | References bills(id)                 |
| vote_position | TEXT                     | NOT NULL, CHECK | 'yes', 'no', 'abstain', 'not_voting' |
| vote_date     | DATE                     | NOT NULL        | **Critical for timeline queries**    |
| topic         | TEXT                     | NULLABLE        | Optional categorization              |
| source_id     | INTEGER                  | NOT NULL, FK    | References sources(id)               |
| created_at    | TIMESTAMP WITH TIME ZONE | NOT NULL        | Record creation timestamp            |
| updated_at    | TIMESTAMP WITH TIME ZONE | NOT NULL        | Record update timestamp              |

**Foreign Keys:**

- `politician_id` → `politicians(id)` ON DELETE CASCADE
- `bill_id` → `bills(id)` ON DELETE CASCADE
- `source_id` → `sources(id)` ON DELETE RESTRICT

**Indexes:**

- `idx_votes_politician_id` on `politician_id`
- `idx_votes_bill_id` on `bill_id`
- `idx_votes_vote_date` on `vote_date` (for timeline queries)
- `idx_votes_vote_position` on `vote_position`
- `idx_votes_topic` on `topic`
- `idx_votes_source_id` on `source_id`
- `idx_votes_politician_date` on `(politician_id, vote_date)` (composite for common queries)

---

### donations

**Purpose:** Store donation records with geographic data for map visualization.

| Column         | Type                     | Constraints     | Description                                                                     |
| -------------- | ------------------------ | --------------- | ------------------------------------------------------------------------------- |
| id             | SERIAL                   | PRIMARY KEY     | Unique identifier                                                               |
| politician_id  | INTEGER                  | NOT NULL, FK    | References politicians(id)                                                      |
| donor_name     | TEXT                     | NOT NULL        | Name of donor/PAC                                                               |
| donor_category | TEXT                     | NOT NULL        | Industry category (Healthcare, Energy, Tech, etc.)                              |
| amount         | DECIMAL(12, 2)           | NOT NULL, CHECK | Donation amount (>= 0)                                                          |
| date           | DATE                     | NOT NULL        | **Critical for timeline queries**                                               |
| state_code     | CHAR(2)                  | NULLABLE        | **For map aggregation** - state where donation originated or politician's state |
| source_id      | INTEGER                  | NOT NULL, FK    | References sources(id)                                                          |
| created_at     | TIMESTAMP WITH TIME ZONE | NOT NULL        | Record creation timestamp                                                       |
| updated_at     | TIMESTAMP WITH TIME ZONE | NOT NULL        | Record update timestamp                                                         |

**Foreign Keys:**

- `politician_id` → `politicians(id)` ON DELETE CASCADE
- `source_id` → `sources(id)` ON DELETE RESTRICT

**Indexes:**

- `idx_donations_politician_id` on `politician_id`
- `idx_donations_date` on `date` (for timeline queries)
- `idx_donations_state_code` on `state_code` (for map aggregation)
- `idx_donations_donor_category` on `donor_category`
- `idx_donations_source_id` on `source_id`
- `idx_donations_state_category` on `(state_code, donor_category)` (composite for map aggregation)
- `idx_donations_politician_category` on `(politician_id, donor_category)` (composite for radial charts)

**Geographic Fields:**

- `state_code`: Used for choropleth map aggregation by state

---

### statements

**Purpose:** Store official statements from politicians.

| Column        | Type                     | Constraints  | Description                |
| ------------- | ------------------------ | ------------ | -------------------------- |
| id            | SERIAL                   | PRIMARY KEY  | Unique identifier          |
| politician_id | INTEGER                  | NOT NULL, FK | References politicians(id) |
| text          | TEXT                     | NOT NULL     | Statement text             |
| date          | DATE                     | NULLABLE     | When statement was made    |
| source_id     | INTEGER                  | NOT NULL, FK | References sources(id)     |
| created_at    | TIMESTAMP WITH TIME ZONE | NOT NULL     | Record creation timestamp  |
| updated_at    | TIMESTAMP WITH TIME ZONE | NOT NULL     | Record update timestamp    |

**Foreign Keys:**

- `politician_id` → `politicians(id)` ON DELETE CASCADE
- `source_id` → `sources(id)` ON DELETE RESTRICT

**Indexes:**

- `idx_statements_politician_id` on `politician_id`
- `idx_statements_date` on `date`
- `idx_statements_source_id` on `source_id`

---

### source_chunks

**Purpose:** Store text chunks from sources for RAG/AI processing.

| Column       | Type                     | Constraints  | Description                                   |
| ------------ | ------------------------ | ------------ | --------------------------------------------- |
| id           | SERIAL                   | PRIMARY KEY  | Unique identifier                             |
| source_id    | INTEGER                  | NOT NULL, FK | References sources(id)                        |
| chunk_text   | TEXT                     | NOT NULL     | Text content of chunk                         |
| chunk_index  | INTEGER                  | NOT NULL     | Order of chunk in source (0-based or 1-based) |
| start_offset | INTEGER                  | NULLABLE     | Character offset in original text             |
| end_offset   | INTEGER                  | NULLABLE     | Character offset in original text             |
| created_at   | TIMESTAMP WITH TIME ZONE | NOT NULL     | Record creation timestamp                     |

**Foreign Keys:**

- `source_id` → `sources(id)` ON DELETE CASCADE

**Unique Constraints:**

- `(source_id, chunk_index)` - Each chunk must be unique within a source

**Indexes:**

- `idx_source_chunks_source_id` on `source_id`

---

### embeddings

**Purpose:** Store vector embeddings for semantic search using pgvector.

| Column     | Type                     | Constraints          | Description                                   |
| ---------- | ------------------------ | -------------------- | --------------------------------------------- |
| id         | SERIAL                   | PRIMARY KEY          | Unique identifier                             |
| chunk_id   | INTEGER                  | NOT NULL, FK, UNIQUE | References source_chunks(id)                  |
| embedding  | vector(1536)             | NULLABLE             | Vector embedding (adjust dimension as needed) |
| model_name | TEXT                     | NULLABLE             | Name of embedding model used                  |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL             | Record creation timestamp                     |

**Foreign Keys:**

- `chunk_id` → `source_chunks(id)` ON DELETE CASCADE

**Indexes:**

- `idx_embeddings_vector` using HNSW for vector similarity search

---

## Key Design Decisions

### 1. Non-Negotiable Provenance

Every factual table (`votes`, `donations`, `bills`, `statements`) **must** reference a `source_id`. Foreign key constraints enforce this.

### 2. Geographic Standardization

- `state_code`: Always 2-letter USPS codes (CA, NY, etc.) for consistency in visualizations
- `district_number`: Separate field (not combined with state) for cleaner queries
- Used in both `politicians` and `donations` tables for map aggregation

### 3. Timeline Optimization

- `vote_date` and `donation.date` have dedicated indexes for efficient timeline queries
- Composite indexes support common query patterns (politician + date)

### 4. Visualization-Friendly Structure

- Donations include `state_code` for choropleth maps
- Votes include `vote_date` for timeline visualizations
- Bills include `topic` for network graph categorization
- All tables support citation/evidence bundles via `source_id`

### 5. Cascade vs. Restrict

- `ON DELETE CASCADE`: Related records (votes, donations, statements) deleted when politician deleted
- `ON DELETE RESTRICT`: Sources cannot be deleted if referenced (protects provenance)

---

## Common Query Patterns

### Map Aggregation (by State)

```sql
SELECT
    state_code,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count
FROM donations
WHERE date >= '2020-01-01'
GROUP BY state_code;
```

### Timeline Query

```sql
SELECT
    vote_date,
    COUNT(*) FILTER (WHERE vote_position = 'yes') as yes_count,
    COUNT(*) FILTER (WHERE vote_position = 'no') as no_count
FROM votes
WHERE politician_id = 1
    AND vote_date >= '2020-01-01'
GROUP BY vote_date
ORDER BY vote_date;
```

### Network Graph Query

```sql
SELECT
    p.id as politician_id,
    b.id as bill_id,
    d.donor_category
FROM politicians p
JOIN votes v ON v.politician_id = p.id
JOIN bills b ON b.id = v.bill_id
JOIN donations d ON d.politician_id = p.id
WHERE b.topic = 'Healthcare';
```

---

## Migration Notes

- Run `0001_enable_postgis.sql` first to enable PostGIS extension
- Run `0002_create_schema.sql` to create all tables
- Sources table must exist before other tables (foreign key dependency)
- pgvector extension is enabled in `0002_create_schema.sql` for embeddings table
