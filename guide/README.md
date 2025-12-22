# /docs/team/README.md
# CivicLens — Team Execution Guide (Day-1 → Demo Day)

This document tells **each person exactly what to do first**, how work flows between roles, and how we stay judge-proof.

**Hard rules (non-negotiable)**
- Citations required for every factual claim
- No rankings, predictions, or endorsements
- Privacy-first (no user tracking or personalization)
- Demo must work offline (fallback dataset)
- If no evidence exists → respond with **“Insufficient data”**

---

## Team Mapping (locked)
| Person | Role |
|------|------|
| Person A | Data & Ingestion |
| Person B | Backend & Infrastructure |
| Person C | AI / RAG |
| Person D | Frontend & UX |

---

## Day-1 Start Order (critical)
> **Do not reorder these steps. This avoids rework.**

### Day 1 Morning (All hands – 60 minutes)
1. Read:
   - `/docs/schema.md`
   - `/docs/api_contracts.md`
   - `/docs/ai_contract.md`
2. Align on:
   - Demo politicians (2–3 max)
   - Demo questions (5–10 max)
   - What *will not* be built

**Output**
- Locked MVP scope
- Locked demo entities
- Locked “out of scope” list

---

## Individual Day-1 Assignments

### Person A — Data & Ingestion
**Day 1**
- Draft initial schema (politicians, votes, donations, statements, sources)
- Create demo seed outline (not full ingestion yet)

**Must deliver by EOD**
- `/docs/schema.md`
- `/docs/demo_data_scope.md`

---

### Person B — Backend & Infrastructure
**Day 1**
- Create FastAPI skeleton
- Define API contracts (no logic yet)
- Create standard error format

**Must deliver by EOD**
- `/docs/api_contracts.md`
- `/backend/main.py`
- `/backend/models.py`

---

### Person C — AI / RAG
**Day 1**
- Define AI response schema
- Write guardrail rules (plain English)
- Draft “Insufficient data” behavior

**Must deliver by EOD**
- `/docs/ai_contract.md`
- `/docs/ai_disclosures.md`

---

### Person D — Frontend & UX
**Day 1**
- Create app shell (routes only, placeholders)
- Draft UX flow for:
  - Search → Profile → Compare → Ask → Sources

**Must deliver by EOD**
- `/docs/ui_flow.md`
- `/app/layout.tsx` (or equivalent)

---

## Week-by-Week Coordination Rules

### Week 1 — Foundation
**Goal:** end-to-end flow exists with demo data

- Person A: schema + demo seed
- Person B: endpoints return demo data
- Person C: RAG stub (mock answers allowed, schema enforced)
- Person D: UI wired to real endpoints (even if empty)

**Rule:** ugly but connected beats perfect but isolated

---

### Week 2 — Intelligence
**Goal:** real data + real citations + real AI

- Person A: ingest ProPublica + OpenSecrets subset
- Person B: aggregation + compare endpoints
- Person C: real RAG with citation enforcement
- Person D: charts + citation drawer

**Rule:** no feature merges without citations

---

### Week 3 — Polish & Judge-Proofing
**Goal:** zero surprises during demo

- Offline demo mode
- Clear disclosures everywhere
- Graceful failures
- Demo rehearsal daily

**Rule:** stability > new features

---

## Cross-Role Handshake Points (must happen)

### Schema handshake
- Person A → Person B + C + D
- No schema changes without updating `/docs/schema.md`

### API handshake
- Person B → Person C + D
- No response shape changes without updating `/docs/api_contracts.md`

### AI handshake
- Person C → Person B + D
- No schema-breaking AI changes allowed after Week 2

### UX handshake
- Person D → Everyone
- Disclosures and “limitations” text must be approved by Person C

---

## Daily Standup Template (5–10 minutes)
Each person answers:
1. What shipped yesterday?
2. What ships today?
3. Any blocker that affects the demo path?

---

## Demo Path (golden path)
1. Search politician
2. Open profile
3. Show key votes + donors
4. Ask a question
5. Click a citation
6. Show disclosure

If any step fails → stop and fix before adding features.

---

