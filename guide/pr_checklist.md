# /docs/team/PR_CHECKLIST.md
# CivicLens — Pull Request Checklist (MANDATORY)

> **No PR is merged unless every applicable box is checked.**

---

## 1. General (all PRs)
- [ ] PR title describes user-visible change
- [ ] No secrets or API keys committed
- [ ] Code runs locally
- [ ] Demo dataset still loads successfully
- [ ] No rankings, predictions, or endorsements introduced

---

## 2. Data & Ingestion PRs
- [ ] Every new record includes a `source_id`
- [ ] `source_url`, `publisher`, and `retrieved_at` present
- [ ] No inferred or guessed data
- [ ] Demo seed updated if schema changed
- [ ] QC script passes on demo subset

---

## 3. Backend & API PRs
- [ ] Request and response models are typed
- [ ] API contracts updated if shape changed
- [ ] Aggregations map directly to raw data
- [ ] Errors return consistent `{code, message}` shape
- [ ] Endpoint works with demo data only

---

## 4. AI / RAG PRs
- [ ] Output matches AI response schema
- [ ] Every claim has ≥1 citation
- [ ] Citation IDs exist in database
- [ ] “Insufficient data” triggers correctly
- [ ] Guardrails enforced (no rankings, predictions, endorsements)

---

## 5. Frontend & UX PRs
- [ ] Every data point has a visible source link
- [ ] Citation drawer/modal works
- [ ] Charts are neutral (no persuasive colors or language)
- [ ] Disclosure text visible in UI
- [ ] Empty/insufficient data states handled cleanly

---

## 6. Demo-Safety Checks (ALL PRs)
- [ ] App works without external API calls (demo mode)
- [ ] No uncaught runtime errors
- [ ] Loading and error states visible
- [ ] Golden path still completes in <2 minutes

---

## 7. Reviewer Sign-Off
- [ ] Reviewer verified demo path manually
- [ ] Reviewer checked citations
- [ ] Reviewer agrees PR is judge-safe

**Reviewer name:**  
**Date:**  

---

## 🚫 Auto-Reject Conditions
PR will be rejected immediately if it:
- Adds rankings, scores, or “best/worst” language
- Generates uncited AI text
- Breaks demo seed or offline mode
- Adds personalization or tracking
- Introduces speculative claims

---

