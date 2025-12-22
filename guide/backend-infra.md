# /docs/team/Person-B_Backend-Infra.md
# Person B — Backend & Infrastructure (FastAPI + Contracts + Aggregation APIs)

## Role mission
Build the **stable API layer** that connects data → UI → AI.
Your job is to make contracts deterministic, typed, and demo-safe.

**Hard rules:** no rankings/endorsements, citations required downstream, privacy-first, graceful failure, offline demo works.

---

## Week-by-week execution plan

### Week 1 — Foundation (contracts + core endpoints)
#### 1) Lock API contracts (Day 1–2)
**Must-have endpoints**
- `GET /search?name=...` and/or `GET /search?zip=...`
- `GET /politician/{id}`
- `GET /politician/{id}/votes`
- `GET /politician/{id}/donations`
- `POST /compare`
- `POST /ai/ask` (AI service wrapper; must accept evidence bundle)

**Deliverables**
- `/docs/api_contracts.md`
- `/backend/models.py` (Pydantic request/response models)

**Definition of Done**
- Contracts documented + shared with frontend/AI
- Error format standardized: `{code, message, details, request_id}`

#### 2) FastAPI skeleton + config (Day 1–3)
- App factory
- env config
- CORS (dev)
- structured logging

**Deliverables**
- `/backend/main.py`
- `/backend/config.py`
- `/docs/runbook_local.md`

#### 3) Implement search + profile (Day 3–7)
- Search by name and (if possible) ZIP→district mapping (optional MVP)
- Profile returns politician + summary stats + source counts

**Deliverables**
- `/backend/routes/search.py`
- `/backend/routes/politician.py`
- `/backend/services/politician_service.py`

---

### Week 2 — Intelligence (aggregations + compare + AI evidence)
#### 4) Aggregation services (Day 8–12)
**Votes aggregation**
- by topic (if available) or by bill
- show key votes list (top N)

**Donations aggregation**
- totals by category
- optional time window

**Deliverables**
- `/backend/services/aggregation.py`
- `/docs/aggregation_rules.md`

**Definition of Done**
- Every aggregate output can link back to underlying sources/records

#### 5) Compare endpoint (Day 10–14)
**Input**
- politician A ID
- politician B ID
- issue/topic

**Output**
- side-by-side structured evidence bundles (not opinions)

**Deliverables**
- `/backend/routes/compare.py`
- `/docs/compare_contract.md`

#### 6) Evidence bundle endpoint (for AI) (Day 10–14)
Backend should produce:
- `evidence_chunks[]` (text + source_id)
- `citations[]` (url, title, publisher, retrieved_at)

**Deliverables**
- `/backend/services/evidence_bundle.py`

---

### Week 3 — Polish (reliability + rate limits + offline)
#### 7) Failure modes + fallbacks (Day 15–18)
- If DB missing data → return empty with “insufficient data”
- If AI fails → return evidence-only
- Rate limit AI endpoints

**Deliverables**
- `/docs/failure_modes.md`
- `/backend/middleware/rate_limit.py` (or equivalent)

#### 8) Deployment readiness (Day 18–21)
- ENV example
- health check endpoint
- production CORS

**Deliverables**
- `.env.example`
- `GET /health`

---

## Interfaces you must coordinate with
- **Data:** schema finalization + fields for aggregations
- **AI/RAG:** evidence bundle format + citation IDs
- **Frontend:** API contract stability + pagination shapes

---

## Daily checklist
- [ ] API contracts updated when changed
- [ ] Responses typed and validated
- [ ] No endpoint returns uncitable data without source references
- [ ] Local run instructions still accurate

---

## “Agent mode” prompts (copy/paste)
### API skeleton prompt
You are a FastAPI engineer. Implement typed endpoints for search, politician profile, votes, donations, compare, and ai/ask. Use Pydantic models, consistent error responses, and produce evidence bundles with citation metadata.

### Aggregation prompt
Implement aggregation services that compute donation totals by category and key vote lists. Ensure aggregations are traceable to raw records and include source references in responses.

