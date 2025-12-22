# /docs/team/Person-C_AI-RAG.md
# Person C — AI / RAG (Citation-First Q&A + Embeddings + Guardrails)

## Role mission
Deliver Responsible AI that **only answers from evidence**.
Your job is to ensure:
- Citation-first responses
- No speculative claims
- Robust refusal behavior
- Simple eval harness that catches failures

**Hard rules:** no rankings/endorsements/predictions, citations required, privacy-first, “no evidence → Insufficient data.”

---

## Week-by-week execution plan

### Week 1 — Prep (schemas + guardrails contract)
#### 1) Lock AI response schema (Day 1–2)
**Response shape (must be machine-validated)**
- `answer` (short, neutral)
- `claims[]`: `{text, citations[], confidence}`
- `citations[]`: `{source_id, url, title, publisher, retrieved_at, snippet}`
- `limitations` (when evidence weak)
- `disclosure` (what system does/doesn’t do)

**Deliverables**
- `/ai/schemas.py` (Pydantic/Zod style)
- `/docs/ai_contract.md`

**Definition of Done**
- Backend + frontend agree on this schema

#### 2) Guardrails policy (Day 2–4)
Implement strict rules:
- If asked “who is better” → refuse / reframe to evidence comparison
- If asked for endorsements → refuse
- If no evidence → “Insufficient data”
- Avoid moral/loaded language

**Deliverables**
- `/ai/guardrails.py`
- `/docs/ai_disclosures.md`

---

### Week 2 — Build (RAG + embeddings + validation)
#### 3) Retrieval (Day 8–10)
- Use pgvector
- Input: question + politician_id(s)
- Output: top-k chunks, plus citations

**Deliverables**
- `/ai/retrieval.py`
- `/docs/retrieval_strategy.md`

#### 4) Generation (Day 10–12)
- Summarize only retrieved chunks
- Produce JSON output matching schema

**Deliverables**
- `/ai/generate.py`
- `/ai/prompts/system_prompt.txt`
- `/ai/prompts/answer_prompt.txt`

#### 5) Citation enforcement (Day 12–14)
Validator must fail if:
- any claim has zero citations
- citations reference non-existent sources
- citation snippet not found in the chunk text (best effort)

**Deliverables**
- `/ai/validate.py`
- `/docs/citation_enforcement.md`

**Definition of Done**
- Model output cannot bypass validator

---

### Week 3 — Polish (evals + edge cases + UX alignment)
#### 6) Eval harness (Day 15–18)
Create a small eval set:
- 10–20 questions
- expected: citations present + proper refusal on missing evidence

**Deliverables**
- `/evals/questions.json`
- `/evals/run_evals.py`
- `/docs/eval_report_template.md`

#### 7) Edge case behaviors (Day 18–21)
- contradictory sources → mention conflict + show both citations
- question too broad → ask clarifying question OR return limited scope with citations
- “corruption” type questions → neutral reframing + evidence only

**Deliverables**
- `/docs/edge_case_playbook.md`

---

## Interfaces you must coordinate with
- **Data:** chunking strategy + source metadata completeness
- **Backend:** evidence bundle API + source IDs
- **Frontend:** how to display confidence, citations, limitations

---

## Daily checklist
- [ ] Every claim has citations
- [ ] Refusals happen when evidence missing
- [ ] No endorsement language slips through
- [ ] Evals run clean on demo dataset

---

## “Agent mode” prompts (copy/paste)
### RAG pipeline prompt
You are a Responsible AI engineer. Implement a RAG pipeline using pgvector retrieval that answers strictly from retrieved evidence. Output must match the provided JSON schema. If no evidence is retrieved, respond exactly with “Insufficient data.”

### Citation validator prompt
Implement a validator that rejects any response where a claim lacks citations or citation IDs do not exist. Include unit tests for these checks.

