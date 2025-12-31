# Backend Game Plan (Civic Lens)

## Your role (Backend / APIs)
- Own the FastAPI service that exposes the product features as clean, stable APIs.
- Define request/response contracts so frontend can build against them.
- Aggregate data from the data/ingestion pipeline (or a temporary store) and shape it for UI needs.
- Handle performance basics: caching, indexes, pagination, and error behavior.

You are not responsible for the frontend UI, RAG/AI, or data ingestion logic itself. You do coordinate on data schema and API contracts so those teams can integrate cleanly.

## Where the information sits (source of truth)
Recommended setup for hackathon speed:
- Primary data store: a lightweight database (SQLite for local/dev; Postgres for shared/demo).
- Data ingestion owns writing/updating the DB (or a JSON fixture while ingestion is still building).
- Backend owns reading/aggregating data and exposes it via FastAPI.

If ingestion is not ready, use a small JSON/CSV fixture in `backend/data/` and wrap it behind a repository layer so you can swap in a real DB later without rewriting routes.

## Proposed backend structure (blank canvas)
Create these directories/files:
- `backend/app/` — application package root
- `backend/app/main.py` — FastAPI app instance + middleware + router registration
- `backend/app/api/` — route modules
- `backend/app/api/health.py` — `/health` endpoint
- `backend/app/api/search.py` — `/search` endpoint (name + optional zip)
- `backend/app/api/politicians.py` — `/politicians` and `/politicians/{id}`
- `backend/app/api/compare.py` — `/compare?ids=...`
- `backend/app/api/qa.py` — `/qa` placeholder (if needed by AI/RAG)
- `backend/app/models/` — ORM models if using SQLAlchemy
- `backend/app/schemas/` — Pydantic request/response schemas
- `backend/app/services/` — aggregation logic (search, compare, profile)
- `backend/app/repositories/` — DB queries (clean interface for data layer)
- `backend/app/core/` — settings, logging, caching helpers
- `backend/app/data/` — sample fixtures (JSON/CSV) for local dev
- `backend/tests/` — smoke tests for key routes
- `backend/Makefile` — run/test targets (already present)

## API contracts (first pass)
These align to the frontend pages you described.
- `GET /health` → `{ status: "ok" }`
- `GET /search?name=...&zip=...` → list of politicians with summary cards
- `GET /politicians/{id}` → full profile + statements
- `GET /compare?ids=1,2,3` → side-by-side list of the same summary fields
- `POST /qa` → placeholder for future RAG (can be stubbed)

## Data shape needed by UI (summary card fields)
Each search/compare result should include:
- `id`
- `name`
- `image_url`
- `party`
- `state_or_district`
- `position` (president, senator, representative, etc.)
- `vote_count`
- `statement_count`

## Roadmap aligned to your tickets (backend-only)
1) Define Pydantic schemas for search results, profiles, compare results.
2) Implement repository layer that can read from:
   - JSON fixtures (short-term) and
   - database (long-term)
3) Build routes for `/health`, `/search`, `/politicians/{id}`, `/compare`.
4) Add caching and indexes:
   - cache common search results (in-memory LRU or Redis if available)
   - index on `name`, `state`, `district`, `zip` (if in DB)
5) Add a simple smoke test and a one-command startup (docker compose) later.

## Open questions to sync with other roles
- Data/ingestion: What is the source of truth (DB vs files), and what schema?
- Frontend: Exact fields needed for search cards and compare rows.
- RAG/AI: Expected `/qa` payload/response shape (if needed for demo).

## Next actions (for you)
1) Confirm if we want SQLite or Postgres for the hackathon demo.
2) Decide whether to start with JSON fixtures or jump straight to DB.
3) Draft Pydantic schemas and route stubs so frontend can integrate now.
