# /docs/team/Person-D_Frontend-UX.md
# Person D — Frontend & UX (Next.js Flow + Charts + Disclosures)

## Role mission
Ship the judge-facing product experience:
**Search → Profile → Compare → AI Q&A → Inspect Sources**
with Responsible AI **visible and obvious**.

**Hard rules:** citations required, no rankings/endorsements, privacy-first, demo works offline, “Insufficient data” must be shown cleanly.

---

## Week-by-week execution plan

### Week 1 — Foundation (UI skeleton + golden path)
#### 1) App shell + routing (Day 1–2)
Pages:
- `/` (search)
- `/politician/[id]` (profile)
- `/compare`
- `/ask`
- `/about` (disclosures)

**Deliverables**
- Next.js layout + navbar
- Global error boundary + loading states

#### 2) Search page (Day 2–4)
- name search
- zip search (if supported)
- results list → profile link

**Deliverables**
- `/app/page.tsx` (or `/app/search/page.tsx`)
- `/components/SearchBar.tsx`
- `/components/SearchResults.tsx`

**Definition of Done**
- You can find demo politicians quickly

#### 3) Profile page (Day 4–7)
Must show:
- key votes (list)
- donor breakdown (chart)
- statements/quotes (list)
- “View sources” for every section

**Deliverables**
- `/app/politician/[id]/page.tsx`
- `/components/ProfileHeader.tsx`
- `/components/KeyVotes.tsx`
- `/components/DonorChart.tsx`
- `/components/StatementsList.tsx`

---

### Week 2 — Intelligence (compare + AI Q&A + charts)
#### 4) Compare page (Day 8–11)
Side-by-side:
- votes highlights
- donor chart
- linked citations

**Deliverables**
- `/app/compare/page.tsx`
- `/components/CompareView.tsx`

#### 5) AI Q&A UI (Day 10–14)
- Question input
- Answer + claims list
- Citations rendered per claim
- “Insufficient data” state

**Deliverables**
- `/app/ask/page.tsx`
- `/components/AskPanel.tsx`
- `/components/ClaimCard.tsx`
- `/components/Citations.tsx`

---

### Week 3 — Polish (disclosures + trust UX + demo-proofing)
#### 6) Responsible AI disclosures (Day 15–17)
Must state explicitly:
- no rankings
- no predictions
- no endorsements
- evidence-only summarization
- privacy-first (no tracking)
- limitations + reporting

**Deliverables**
- `/app/about/page.tsx`
- `/components/DisclosureBanner.tsx`

#### 7) Source inspection UX (Day 15–18)
“Citation drawer” is mandatory.
Click a citation → drawer opens with:
- title, publisher, retrieved_at
- snippet
- open source link

**Deliverables**
- `/components/SourceDrawer.tsx`

#### 8) Demo reliability (Day 18–21)
- Offline demo mode flag
- Polished loading/error states
- No UI dead-ends

**Deliverables**
- `/docs/demo_ui_checklist.md`

---

## UI rules (judge-proof)
- Citations are always 1 click away
- Charts are neutral (no “good/bad” colors, no moral language)
- Never show “score” or “ranking”
- Always include “limitations” when evidence sparse

---

## Interfaces you must coordinate with
- **Backend:** API response shape and error handling
- **AI/RAG:** rendering of claims/citations schema
- **Data:** chart-ready donation aggregates and vote summaries

---

## Daily checklist
- [ ] Golden path works end-to-end
- [ ] Every section has “View sources”
- [ ] “Insufficient data” looks clean, not broken
- [ ] Disclosures visible from main nav

---

## “Agent mode” prompts (copy/paste)
### Next.js build prompt
You are a Next.js frontend engineer. Build pages for Search, Profile, Compare, and Ask. Every data point must link to a citation. Add a Source Drawer component to inspect citation metadata and snippets.

### Charts prompt
Implement Recharts components for donation breakdowns and vote history. Ensure neutral labeling and include the source link and retrieval date next to each chart.

