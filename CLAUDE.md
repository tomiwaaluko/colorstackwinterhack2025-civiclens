# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CivicLens is an evidence-based political information platform that allows users to search, compare, and understand politicians through cited factual data. The application emphasizes non-negotiable provenance - every factual claim must be traceable to a source.

**Hard rules:**
- Citations required for every factual claim
- No rankings, predictions, or endorsements
- Privacy-first (no user tracking)
- If no evidence exists, respond with "Insufficient data"

## Development Commands

### Backend (FastAPI + Python)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload          # Start dev server on port 8000
pytest                                  # Run all tests
pytest tests/test_health.py            # Run single test file
pytest tests/test_health.py::test_name # Run single test
```

### Frontend (Next.js + React)
```bash
cd frontend
npm install
npm run dev      # Start dev server on port 3000
npm run build    # Production build
npm run lint     # ESLint
```

### Environment Variables

**Backend (`backend/.env`):**
```
DATABASE_URL=postgresql+asyncpg://...   # Or sqlite+aiosqlite:///./civic_lens.db for local
GEMINI_API_KEY=your_key_here            # Required for AI features
DEMO_MODE=false
```

**Frontend (`frontend/.env.local`):**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEMO_MODE=false
```

## Architecture

### Backend (`backend/`)
- **FastAPI application** with async SQLAlchemy (PostgreSQL/SQLite)
- Entry point: `app/main.py` (creates FastAPI app with all routers)
- Alternative entry: `main.py` (simpler version)

**Key directories:**
- `app/api/` - API route handlers (health, search, politicians, compare, votes, policies, impact, map, qa, rag, visualizations)
- `app/ai/` - AI/RAG components (retrieval, generation, guardrails, schemas)
- `app/core/` - Configuration (`config.py`) and database (`database.py`)
- `app/schemas/` - Pydantic models
- `app/repositories/` - Data access layer
- `ingest/` - Data ingestion scripts (Congress.gov, FEC, OpenSecrets, ProPublica)
- `scripts/` - Utility scripts (chunking, migrations, data QC)
- `tests/` - pytest tests

**RAG Pipeline:**
- Uses Gemini API for embeddings and generation
- pgvector for semantic search
- Evidence retrieval from `chunks` and `sources` tables

### Frontend (`frontend/`)
- **Next.js 16** with React 19, TypeScript, Tailwind CSS 4
- App Router structure in `app/`

**Key pages:**
- `/` - Home
- `/search` - Politician search
- `/politician/[id]` - Politician profile
- `/compare` - Compare politicians
- `/ask` - AI Q&A
- `/visualizations` - Data visualizations
- `/about` - About page

**Components (`components/`):**
- UI primitives in `ui/` (Radix-based: button, card, dialog, tabs, etc.)
- Feature components: SearchBar, PoliticianCard, CompareView, AskPanel, Citations, KeyVotes, DonorChart
- Visualization components: TimelineChart, NetworkGraph, RadialChart, DonationsMap

### Database Schema
Core tables (all require `source_id` for provenance):
- `sources` - Provenance table (URL, publisher, retrieved_at)
- `politicians` - Politician records with state_code, party, position
- `bills` - Legislative bills
- `votes` - Voting records with vote_date
- `donations` - Donation records with state_code for map aggregation
- `statements` - Official statements
- `source_chunks` + `embeddings` - RAG text chunks with pgvector embeddings

## API Endpoints

Core endpoints:
- `GET /health` - Health check
- `GET /search?name=&zip_code=&limit=` - Search politicians
- `GET /politicians` - List all politicians
- `GET /politicians/{id}` - Politician profile
- `GET /compare?ids=1,2,3` - Compare politicians
- `GET /politicians/{id}/votes` - Voting records
- `GET /politicians/{id}/policies` - Policy positions
- `GET /politicians/{id}/impact` - Impact metrics
- `GET /map/politicians?state=` - Map search
- `POST /api/qa/ask` - Simple AI Q&A
- `POST /api/rag/answer` - Full RAG pipeline

Visualization endpoints under `/api/visualizations/`:
- `timeline`, `network-graph`, `radial`, `donations-map`, `ai-insights`

## Key Technical Decisions

1. **Async SQLAlchemy** with asyncpg for PostgreSQL, aiosqlite for local SQLite fallback
2. **Supabase compatibility** - Auto-disables prepared statements for pgbouncer
3. **Gemini AI** for embeddings (`gemini-embedding-001`) and generation
4. **pgvector** for semantic similarity search with configurable `RAG_TOP_K` and `RAG_MIN_SIMILARITY`
5. **Radix UI** components with Tailwind CSS for consistent, accessible UI
