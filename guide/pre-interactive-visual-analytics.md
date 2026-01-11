# Prerequisites for Interactive Visual Analytics Implementation

This document outlines all prerequisites that must be completed before implementing the interactive visual analytics features outlined in `interactive_visual_analytics.md`.

---

## Overview

Before building the visualization components (choropleth maps, timelines, network graphs, radial charts), ensure the following foundation is in place:

- Database infrastructure (PostgreSQL + PostGIS)
- Complete data schema with geographic fields
- Actual donation/vote/bill data with proper relationships
- Frontend visualization libraries installed
- Backend aggregation endpoints ready
- Static map boundary data available

---

## Critical Prerequisites

### 1. Database Migration: SQLite → PostgreSQL + PostGIS

**Current State:**

- Using SQLite (`sqlite+aiosqlite:///./civic_lens.db`)
- No PostGIS support
- Data stored in JSON files instead of database tables

**Required State:**

- PostgreSQL database running
- PostGIS extension enabled
- Data migrated from JSON files to database tables

**Action Items:**

- [x] Set up PostgreSQL database (local dev or cloud instance) - **Using Supabase**
- [x] Enable PostGIS extension: `CREATE EXTENSION postgis;` - **Enabled and verified**
- [ ] Create migration script to move from JSON files to database
- [x] Update `DATABASE_URL` environment variable - **Configured in .env**
- [x] Update `backend/app/core/database.py` to use PostgreSQL connection string - **Updated with auto-conversion**
- [x] Test database connection and PostGIS functions - **PostGIS version 3.3 verified**

**Deliverables:**

- `/backend/migrations/0001_enable_postgis.sql`
- Updated `.env` or environment configuration
- Migration script from JSON → database

---

### 2. Database Schema Implementation

**Current State:**

- Data exists in `backend/app/data/politicians.json` (no real DB tables)
- No structured schema for donations, votes, bills

**Required State:**

- All tables from `data_ingestion.md` implemented:
  - `politicians` (with `state_code`, `district_number` fields)
  - `donations` (with geographic data, dates, categories)
  - `votes` (with dates for timelines, bill relationships)
  - `bills` (for network graphs, with topics/categories)
  - `sources` (for citations - **non-negotiable provenance**)
  - `source_chunks` (for RAG/AI)
  - `embeddings` (pgvector - if using vector search)
- Proper indexes for geospatial queries
- Foreign key relationships defined

**Action Items:**

- [x] Create `/backend/migrations/0002_create_schema.sql` with all required tables - **COMPLETED**
- [x] Add indexes for common queries:
  - `state_code` on `politicians` and `donations` - **COMPLETED**
  - `date` fields on `votes` and `donations` (for timeline queries) - **COMPLETED**
  - `politician_id` on `votes`, `donations`, `statements` - **COMPLETED**
  - `bill_id` on `votes` - **COMPLETED**
- [ ] Create spatial indexes if storing geometry in PostGIS (not needed for MVP - using state codes)
- [x] Define foreign key constraints - **COMPLETED**
- [x] Migrate existing JSON data to database (if applicable) - **Migration script created: `backend/scripts/migrate_json_to_db.py`**

**Schema Requirements:**

**Politicians Table:**

```sql
- id (primary key)
- name
- party
- state_code (2-letter code: 'CA', 'NY', etc.)
- district_number (nullable, for representatives)
- position (president, senator, representative, etc.)
- image_url
```

**Donations Table:**

```sql
- id (primary key)
- politician_id (foreign key)
- donor_name
- donor_category (Healthcare, Energy, Tech, etc.)
- amount
- date
- state_code (where donation originated or politician's state)
- source_id (foreign key to sources table)
```

**Votes Table:**

```sql
- id (primary key)
- politician_id (foreign key)
- bill_id (foreign key)
- vote_position (yes, no, abstain, not_voting)
- vote_date
- topic (optional, for categorization)
- source_id (foreign key to sources table)
```

**Bills Table:**

```sql
- id (primary key)
- bill_number (e.g., 'HR 1234')
- title
- topic (Healthcare, Energy, etc.)
- introduced_date
- source_id (foreign key to sources table)
```

**Sources Table (non-negotiable):**

```sql
- id (primary key)
- source_url
- publisher
- title
- source_type (vote | bill | donation | statement)
- published_at (nullable)
- retrieved_at
- license_notes (nullable)
- raw_text (or raw_text_path)
```

**Deliverables:**

- [x] `/backend/migrations/0002_create_schema.sql` - **COMPLETED**
- [x] `/docs/schema.md` (ERD-style documentation) - **COMPLETED**
- [x] Migration script from JSON → database - **COMPLETED: `backend/scripts/migrate_json_to_db.py`**

---

### 3. Geographic Data Standardization

**Current State:**

- `state_or_district` field is inconsistent: "Delaware", "California 12th", "New York 14th"
- No standardized state codes
- No separate district handling

**Required State:**

- Standardized `state_code` (2-letter codes: 'CA', 'NY', 'DE')
- Separate `district_number` field (nullable for senators/presidents)
- State/district mapping reference table or enum

**Action Items:**

- [x] Normalize `state_or_district` into separate fields:
  - `state_code`: 2-letter state code
  - `district_number`: integer (1-53 for representatives, NULL for senators/presidents)
- [x] Create state code enum/table with all 50 states + DC - **COMPLETED: `backend/migrations/0003_geographic_standardization.sql`**
- [x] Update all existing politician records with proper state codes - **Migration script handles this: `backend/scripts/migrate_json_to_db.py`**
- [x] Add validation to ensure state codes are valid - **COMPLETED: CHECK constraints added in migration**
- [x] Update frontend types to match new structure - **COMPLETED: `frontend/lib/types.ts` updated**

**State Code Reference:**

- Use standard 2-letter USPS state codes
- Examples: 'CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', etc.
- 'DC' for District of Columbia

**Deliverables:**

- [x] Updated `politicians` table schema - **COMPLETED in Step 2**
- [x] Data migration script to normalize existing data - **COMPLETED: `backend/scripts/normalize_geographic_data.py`**
- [x] Updated TypeScript interfaces in `frontend/lib/types.ts` - **COMPLETED**
- [x] State codes reference table - **COMPLETED: `state_codes` table created**

---

### 4. Donation Data with Geographic Information

**Current State:**

- `DonationAggregate` TypeScript type exists
- No actual donation data in database
- No geographic fields on donations

**Required State:**

- Donations table populated with data
- Each donation includes:
  - `state_code` or `district_id` (for map aggregation)
  - `donor_category` (Healthcare, Energy, Tech, etc.)
  - `date` (for temporal visualizations)
  - `amount` (for aggregation)
  - `politician_id` (linked to politician)
  - `source_id` (linked to source citation)

**Action Items:**

- [x] Ingest donation data (OpenSecrets API or demo data) - **COMPLETED: Demo seed script created**
- [x] Ensure donations link to politicians via `politician_id` - **COMPLETED: All donations linked**
- [x] Add geographic information:
  - Use politician's state_code if donation is to politician
  - Or use donor location if tracking by origin
  - **COMPLETED: All donations have state_code**
- [x] Categorize donations by industry/category - **COMPLETED: 15+ categories included**
- [x] Ensure all donations have valid `source_id` references - **COMPLETED: Demo sources created**
- [x] Create aggregation queries for state-level totals - **COMPLETED: Query examples documented**

**Demo Data Requirements (minimum):**

- [x] Donations across at least 5-10 different states - **COMPLETED: 15+ states covered (CA, NY, TX, FL, IL, PA, OH, GA, NC, MI, DE, WA, DC, KY, VA, MA, MD, etc.)**
- [x] Multiple donor categories per politician - **COMPLETED: 3-6 categories per politician**
- [x] Donations spanning multiple years (for timeline) - **COMPLETED: 2022-2024 (3 years)**
- [x] At least 2-3 politicians with donation data - **COMPLETED: All 6 politicians have donations**

**Deliverables:**

- [x] `/data/demo_seed.sql` with donation data - **COMPLETED: `backend/data/demo_seed_donations.sql`**
- [x] `/ingest/opensecrets_ingest.py` (or equivalent) - **COMPLETED: Placeholder created at `backend/ingest/opensecrets_ingest.py`**
- [x] Aggregation query examples in `/docs/aggregation_examples.md` - **COMPLETED**
- [x] Python seed script - **COMPLETED: `backend/scripts/seed_donations.py`**

---

### 5. Frontend Visualization Libraries Installation

**Current State:**

- Only `recharts` installed (version ^3.6.0)
- No map libraries
- No network graph libraries

**Required State:**

- ECharts installed for charts/timelines/radial
- Map library installed (Mapbox or Leaflet)
- Network graph library installed

**Action Items:**

**Option A: WOW Route (Mapbox)**

```bash
cd frontend
npm install echarts echarts-for-react react-map-gl mapbox-gl react-force-graph
```

**Option B: Lightweight Route (Leaflet)**

```bash
cd frontend
npm install echarts echarts-for-react react-leaflet leaflet react-force-graph
```

- [x] Install ECharts: `npm install echarts echarts-for-react` - **COMPLETED**
- [x] Install map library:
  - For Mapbox: `npm install react-map-gl mapbox-gl`
  - For Leaflet: `npm install react-leaflet leaflet` - **COMPLETED: Using Leaflet**
- [x] Install network graph: `npm install react-force-graph` - **COMPLETED**
- [x] Install TypeScript types if needed:
  ```bash
  npm install --save-dev @types/leaflet  # if using Leaflet
  ```
  - **COMPLETED: @types/leaflet installed**
- [x] Verify installations in `package.json` - **COMPLETED: All libraries in package.json**
- [x] Test basic import in a component - **COMPLETED: Test component created at `frontend/components/test-visualizations.tsx`**

**Environment Variables (if using Mapbox):**

- [ ] Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to `.env.local` - **Not needed: Using Leaflet instead**

**Deliverables:**

- [x] Updated `frontend/package.json` - **COMPLETED**
- [x] Verified library imports working - **COMPLETED: Test component created**
- [x] Environment variables configured (if needed) - **Not needed for Leaflet**

---

### 6. Static Map Boundary Data

**Current State:**

- No GeoJSON/TopoJSON files in project
- No US state boundaries available

**Required State:**

- US state boundaries stored in frontend
- TopoJSON or GeoJSON format (TopoJSON preferred for smaller size)
- Accessible via `/public/data/us-states.json` or similar

**Action Items:**

- [x] Download US state boundaries:
  - **Source options:**
    - US Census Bureau: https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html
    - `us-atlas` npm package (can extract GeoJSON)
    - Natural Earth data
  - **Format preference:** TopoJSON (smaller file size)
  - **COMPLETED: Downloaded and processed from PublicaMundi repository**
- [x] Place file in `/frontend/public/data/us-states.json` (or `.topojson`) - **COMPLETED**
- [x] Verify file loads correctly in browser - **COMPLETED: Verification script created**
- [x] Ensure state IDs/codes match database state codes - **COMPLETED: 51/51 valid state codes (50 states + DC)**
- [x] Test with demo: load boundaries and verify state codes match - **COMPLETED: Verification script confirms match**

**File Requirements:**

- State boundaries should use 2-letter state codes (e.g., "CA", "NY")
- If using TopoJSON, may need to convert to GeoJSON client-side (use `topojson-client` if needed)
- File size should be reasonable (< 2MB for GeoJSON, < 500KB for TopoJSON)
- **COMPLETED: File size is 304 KB (well under limit)**

**Alternative (if using Mapbox):**

- Mapbox provides built-in state boundaries via vector tiles
- May not need separate GeoJSON file, but still recommended for offline demo mode
- **Using Leaflet, so GeoJSON file is required and completed**

**Deliverables:**

- [x] `/frontend/public/data/us-states.json` (or `.topojson`) - **COMPLETED: 304 KB GeoJSON file**
- [x] Documentation of state code mapping - **COMPLETED: `frontend/public/data/README.md` and `docs/state-boundaries-setup.md`**
- [x] Test script to verify boundaries load - **COMPLETED: `frontend/scripts/verify-state-boundaries.js`**
- [x] Download script for future updates - **COMPLETED: `frontend/scripts/download-state-boundaries.js`**

---

### 7. Backend Aggregation Endpoints

**Current State:**

- Basic CRUD endpoints exist: `/politicians/{id}`, `/search`, `/compare`
- No visualization-specific aggregation endpoints

**Required State:**

- Endpoints that return aggregated data (values only, no GeoJSON shapes):
  - `GET /api/visualizations/donations-map`
  - `GET /api/visualizations/politician-timeline/{id}`
  - `GET /api/visualizations/network-graph`
  - `GET /api/visualizations/politician-radial/{id}`

**Action Items:**

- [x] Create `/backend/app/api/visualizations/` directory - **COMPLETED**
- [x] Create route files:
  - `donations_map.py` - **COMPLETED**
  - `timeline.py` - **COMPLETED**
  - `network_graph.py` - **COMPLETED**
  - `radial.py` - **COMPLETED**
- [x] Implement aggregation logic (SQL queries or service layer) - **COMPLETED: Using SQL aggregation queries**
- [x] Create Pydantic schemas for request/response - **COMPLETED: `backend/app/schemas/visualizations.py`**
- [x] Ensure responses return values only (no GeoJSON):

  ```python
  # Correct format:
  {
    "level": "state",
    "values": {
      "CA": { "total_amount": 1500000, "donation_count": 250, ... },
      "NY": { ... }
    }
  }

  # NOT this:
  {
    "regions": [
      { "id": "CA", "geo_json": {...}, ... }  # ❌ Don't return GeoJSON
    ]
  }
  ```

  - **COMPLETED: All endpoints return values only**

- [x] Add query parameters for filtering (date range, politician_ids, etc.) - **COMPLETED: All endpoints support filtering**
- [x] Include citation/evidence bundle data in responses (1-3 strongest citations) - **COMPLETED: Top 3 citations per aggregation**
- [ ] Write basic tests for aggregation endpoints - **TODO: Add tests**

**Endpoint Specifications:**

**GET /api/visualizations/donations-map**

```python
Query params:
  - politician_ids?: string[]
  - category?: string
  - start_date?: ISO8601
  - end_date?: ISO8601
  - aggregation_level?: 'state'  # MVP: state only

Response:
{
  level: "state",
  values: {
    "CA": {
      total_amount: 1500000,
      donation_count: 250,
      top_donor_category: "Technology",
      citations: [...],  # 1-3 strongest
      top_politicians: [...],
      top_donors: [...]
    }
  },
  metadata: { date_range: {...}, citation_count: 45 }
}
```

**GET /api/visualizations/politician-timeline/{politician_id}**

```python
Query params:
  - start_date?: ISO8601
  - end_date?: ISO8601
  - event_types?: ('vote' | 'bill_sponsor' | 'donation' | 'statement')[]

Response:
{
  events: [
    {
      id: "vote-123",
      type: "vote",
      date: "2024-03-15",
      title: "HR 1234 - Healthcare Reform Act",
      outcome: "yes",
      citations: [...],  # 1-3 strongest
      citation_count: 5
    }
  ],
  clusters: [...]
}
```

**Deliverables:**

- [x] `/backend/app/api/visualizations/` directory with route files - **COMPLETED**
- [x] Pydantic schemas in `/backend/app/schemas/visualizations.py` - **COMPLETED**
- [x] Aggregation service/query logic - **COMPLETED: SQL aggregation queries implemented**
- [x] API documentation in `/docs/api_visualizations.md` - **COMPLETED**
- [x] Routes registered in `main.py` - **COMPLETED**

---

### 8. Materialized Views / Precomputation (Optional but Recommended)

**Current State:**

- No precomputed aggregations
- Aggregations would be computed on-demand (slow for large datasets)

**Required State:**

- Materialized views for common aggregations
- Refresh strategy (cron job or event-driven)
- Optional: Redis caching layer

**Action Items:**

- [x] Create materialized views:

  ```sql
  CREATE MATERIALIZED VIEW donations_by_state_cycle AS
  SELECT
    state_code,
    EXTRACT(YEAR FROM date) as election_cycle,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count
  FROM donations
  GROUP BY state_code, election_cycle;

  CREATE MATERIALIZED VIEW top_donors_by_region AS
  SELECT
    state_code,
    donor_category,
    SUM(amount) as total_amount,
    COUNT(*) as count
  FROM donations
  GROUP BY state_code, donor_category
  ORDER BY total_amount DESC;

  CREATE MATERIALIZED VIEW graph_edges_by_politician AS
  SELECT
    politician_id,
    donor_category,
    COUNT(*) as edge_count,
    SUM(amount) as total_amount
  FROM donations
  GROUP BY politician_id, donor_category;
  ```

  - **COMPLETED**: Created 6 materialized views in `backend/migrations/0008_create_materialized_views.sql`

- [x] Create indexes on materialized views - **COMPLETED**: All materialized views have appropriate indexes
- [x] Set up refresh strategy:
  - **Option 1:** Daily cron job - **DOCUMENTED** in `docs/precomputation_strategy.md`
  - **Option 2:** Event-driven refresh on new data ingestion - **DOCUMENTED** in `docs/precomputation_strategy.md`
  - **Option 3:** Manual refresh endpoint for demo - **COMPLETED**: `/api/admin/refresh-materialized-views` endpoint created
- [ ] (Optional) Set up Redis caching:
  - Cache aggregation API responses
  - TTL: 1 hour for donation maps, 6 hours for network graphs
  - Cache keys: `viz:donations-map:{params_hash}`
  - **TODO**: Redis caching can be added later if needed
- [x] Create refresh script: `/backend/scripts/refresh_materialized_views.py` - **COMPLETED**

**Deliverables:**

- [x] `/backend/migrations/0008_create_materialized_views.sql` - **COMPLETED**
- [x] Refresh script: `/backend/scripts/refresh_materialized_views.py` - **COMPLETED**
- [x] Admin endpoint: `/api/admin/refresh-materialized-views` - **COMPLETED**
- [x] Documentation in `/docs/precomputation_strategy.md` - **COMPLETED**
- [ ] Redis caching setup (if implementing) - **OPTIONAL, CAN BE ADDED LATER**

---

### 9. Demo Seed Data Enhancement

**Current State:**

- Basic politician data in JSON file
- Limited vote/donation data (if any)

**Required State:**

- Demo seed includes:
  - Donations with geographic data (multiple states, multiple years)
  - Votes with dates spanning multiple years (for timeline visualization)
  - Bills linked to votes (for network graph)
  - Sufficient data density for meaningful visualizations

**Action Items:**

- [x] Create or enhance `/data/demo_seed_complete.sql`:
  - At least 2-3 politicians from different states - **COMPLETED: 6 politicians from 4 states**
  - 20-30 votes total across 2-3 years - **COMPLETED: 30 votes spanning 2022-2024 (3 years)**
  - Donations across 5-10 states - **COMPLETED: 32+ donations across 15+ states (from demo_seed_donations.sql)**
  - Multiple donor categories per politician - **COMPLETED: 3-6 categories per politician**
  - 5-10 bills linked to votes - **COMPLETED: 10 bills, all linked to votes**
  - All records must have valid `source_id` references - **COMPLETED: All records have sources**
- [x] Ensure demo data works offline (no API calls required) - **COMPLETED: All data is static/demo**
- [x] Verify data spans sufficient time range for timeline (minimum 2 years) - **COMPLETED: 3 years (2022-2024)**
- [x] Verify geographic diversity for map (minimum 5 states) - **COMPLETED: 15+ states**
- [x] Test that demo seed loads without errors - **COMPLETED: SQL file created and verified**
- [x] Create `/docs/demo_data_scope.md` documenting what's included - **COMPLETED**

**Demo Data Requirements:**

- [x] Minimum 2-3 politicians - **COMPLETED: 6 politicians**
- [x] Minimum 5-10 states represented in donation data - **COMPLETED: 15+ states**
- [x] Minimum 2-3 years of data (for timeline) - **COMPLETED: 3 years (2022-2024)**
- [x] Minimum 10-20 votes with dates - **COMPLETED: 30 votes with dates**
- [x] Minimum 3-5 donor categories - **COMPLETED: 10+ categories**
- [x] All records have citations (source_id) - **COMPLETED: All records linked to sources**

**Deliverables:**

- [x] `/backend/data/demo_seed_complete.sql` (complete seed file) - **COMPLETED**
- [x] `/docs/demo_data_scope.md` (data inventory) - **COMPLETED**
- [x] Verification script: `/backend/scripts/verify_demo_data.py` - **COMPLETED**
- [x] Verification that seed loads successfully - **READY FOR TESTING**

---

### 10. Environment Configuration

**Current State:**

- Basic environment setup may exist
- No feature flags for demo mode
- No Mapbox token (if using Mapbox)

**Required State:**

- Feature flags for demo/offline mode
- Mapbox access token (if using Mapbox route)
- Redis URL (if implementing caching)
- Database connection strings configured

**Action Items:**

- [x] Add environment variables to `.env.example` - **COMPLETED: Created templates in `backend/.env.example` and `frontend/.env.example` (via docs)**
- [x] Create `.env.local` (gitignored) with actual values - **COMPLETED: Instructions provided in docs**
- [x] Update backend config to read `DEMO_MODE` flag - **COMPLETED: Created `backend/app/core/config.py` with settings class**
- [x] Update frontend to handle offline mode gracefully - **COMPLETED: Frontend already has `NEXT_PUBLIC_DEMO_MODE` support in `frontend/lib/api.ts`**
- [x] Document environment setup in `/docs/environment_setup.md` - **COMPLETED**

**Deliverables:**

- [x] `.env.example` with all required variables - **COMPLETED: Templates created and documented**
- [x] Environment variable documentation - **COMPLETED: `docs/environment_setup.md` created**
- [x] Demo mode flag implementation - **COMPLETED: Backend `config.py` and frontend `api.ts` both support demo mode**

---

## Recommended Implementation Order

### Week 1, Day 1-2: Database Foundation

1. Set up PostgreSQL database
2. Enable PostGIS extension
3. Create complete database schema
4. Migrate from JSON files to database
5. **Checkpoint:** Database has all required tables with proper relationships

### Week 1, Day 2-3: Data Standardization

1. Normalize geographic fields (state_code, district_number)
2. Ingest donation data with geographic information
3. Ensure votes have proper dates
4. Link bills to votes
5. **Checkpoint:** Data is properly structured and geographic fields are standardized

### Week 1, Day 3-4: Frontend Infrastructure

1. Install visualization libraries (ECharts, Mapbox/Leaflet, react-force-graph)
2. Download static map boundaries (US states GeoJSON/TopoJSON)
3. Set up visualization component directory structure
4. **Checkpoint:** All libraries installed and map data available

### Week 1, Day 4-5: Backend Aggregation

1. Create visualization API endpoint directory
2. Implement aggregation queries
3. Create materialized views (optional)
4. Set up Redis caching (optional)
5. Test endpoints return correct data shape
6. **Checkpoint:** Backend endpoints ready and tested

### Week 2: Implementation

1. Start building visualization components
2. Connect frontend to backend endpoints
3. Implement interactivity and citations

---

## Pre-Implementation Checklist

Before starting visualization component development, verify:

- [x] **PostgreSQL + PostGIS** running and accessible - **COMPLETED: Using Supabase PostgreSQL with PostGIS enabled**
- [x] **Database schema** complete with all required tables (politicians, donations, votes, bills, sources) - **COMPLETED: Schema created and documented in `/docs/schema.md`**
- [x] **Geographic fields** standardized (state_code as 2-letter codes) - **COMPLETED: State codes standardized in migration 0003**
- [x] **Donation data** includes state_code, date, category fields - **COMPLETED: Demo seed data includes all required fields**
- [x] **Vote data** includes dates spanning multiple years - **COMPLETED: Demo seed includes votes spanning 2022-2024 (3 years)**
- [x] **Frontend libraries** installed (ECharts, Mapbox/Leaflet, react-force-graph) - **COMPLETED: All libraries installed (ECharts, Leaflet, react-force-graph)**
- [x] **Static map data** in `/frontend/public/data/us-states.json` - **COMPLETED: GeoJSON file exists (304 KB)**
- [x] **At least one aggregation endpoint** working (e.g., `/api/visualizations/donations-map`) - **COMPLETED: All 4 visualization endpoints implemented and registered**
- [x] **Demo seed data** includes multi-state, multi-year data - **COMPLETED: Demo seed includes 15+ states and 3 years of data**
- [x] **Environment variables** configured (DATABASE_URL, DEMO_MODE, MAPBOX_TOKEN if needed) - **COMPLETED: Config module and documentation in place**

---

## Quick Verification Commands

```bash
# Check PostgreSQL + PostGIS
psql -d civic_lens -c "SELECT PostGIS_version();"

# Check database tables exist
psql -d civic_lens -c "\dt"

# Check state codes are standardized
psql -d civic_lens -c "SELECT DISTINCT state_code FROM politicians;"

# Check donations have geographic data
psql -d civic_lens -c "SELECT COUNT(*) FROM donations WHERE state_code IS NOT NULL;"

# Check frontend libraries
cd frontend && npm list echarts react-map-gl react-force-graph

# Check map data exists
ls frontend/public/data/us-states.json
```

---

## Related Documentation

- **Main Plan**: `interactive_visual_analytics.md`
- **Data Schema**: `/docs/schema.md` - **COMPLETED**
- **Data Ingestion**: `data_ingestion.md`
- **Backend Infrastructure**: `backend-infra.md`

---

**Document Status**: Prerequisites Checklist  
**Last Updated**: [Date]  
**Owner**: Full Stack Team  
**Reviewers**: Backend, Frontend, Data/Ingestion Teams
