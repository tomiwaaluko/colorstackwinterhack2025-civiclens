# ProPublica Congress API Source Documentation

## ⚠️ DEPRECATED - API Discontinued

**ProPublica Congress API was discontinued in July 2024.** This documentation is retained for historical reference only.

**See [ProPublica Alternatives](./propublica_alternatives.md) for migration options.**

---

## Overview (Historical)

ProPublica Congress API provided access to members of Congress, bills, and voting records. This document describes how we integrated ProPublica data into CivicLens with full provenance tracking.

## API Information

- **API URL**: https://api.propublica.org/congress/v1
- **Documentation**: https://projects.propublica.org/api-docs/congress-api/
- **License**: ProPublica Congress API data is licensed under Creative Commons Attribution 4.0
- **Rate Limits**:
  - 5,000 requests per day (free tier)
  - Rate limiting delay: 0.2 seconds between requests

## Authentication

ProPublica Congress API requires an API key:

1. Sign up at https://www.propublica.org/datastore/api/propublica-congress-api
2. Get your API key
3. Set environment variable: `PROPUBLICA_API_KEY=your_key_here`

## Data Sources

### 1. Members of Congress

**Endpoint**: `/{congress}/{chamber}/members.json`

**Data Captured**:

- Name (first, last)
- State
- Party affiliation
- Chamber (House/Senate)
- District (for House members)
- Member ID

**Provenance**:

- **Source URL**: ProPublica member profile URL
- **Publisher**: "ProPublica"
- **Source Type**: "profile"
- **Raw Text**: Full JSON response from API

### 2. Bills

**Endpoint**: `/{congress}/{chamber}/bills/{type}.json`

**Bill Types**:

- `introduced`: Recently introduced bills
- `updated`: Recently updated bills
- `passed_house`: Bills passed by House
- `passed_senate`: Bills passed by Senate
- `enacted`: Enacted bills

**Data Captured**:

- Bill number (e.g., "HR 1234")
- Title
- Introduction date
- Subjects/topics
- Bill slug

**Provenance**:

- **Source URL**: Congress.gov bill URL
- **Publisher**: "ProPublica"
- **Source Type**: "bill"
- **Raw Text**: Full JSON response from API

### 3. Votes

**Endpoint**: `/{congress}/{chamber}/sessions/{session}/votes/{roll_call}.json`

**Data Captured**:

- Roll call number
- Vote description
- Vote date
- Bill associated with vote
- Individual member positions (yes/no/abstain)

**Provenance**:

- **Source URL**: ProPublica vote URL
- **Publisher**: "ProPublica"
- **Source Type**: "vote"
- **Raw Text**: Full JSON response from API

## Ingestion Process

### Pipeline Stages

1. **Fetch**: Retrieve data from ProPublica API
2. **Normalize**: Convert ProPublica format to our schema
3. **Store Source Metadata**: Create source record in `sources` table
4. **Store Raw Records**: Insert politicians, bills, votes
5. **Link Records**: Connect votes to bills, votes to politicians
6. **Generate Evidence Bundle**: Store raw JSON for chunking

### Usage

```bash
# Ingest all members and bills for current Congress
python backend/ingest/propublica_ingest.py

# Ingest only members
python backend/ingest/propublica_ingest.py --members-only

# Ingest only bills
python backend/ingest/propublica_ingest.py --bills-only

# Ingest specific Congress
python backend/ingest/propublica_ingest.py --congress 117

# Ingest specific chamber
python backend/ingest/propublica_ingest.py --chamber house

# Limit bill pages
python backend/ingest/propublica_ingest.py --max-pages 5
```

## Data Mapping

### Party Normalization

| ProPublica Value | CivicLens Value |
| ---------------- | --------------- |
| "Democratic"     | "Democrat"      |
| "Republican"     | "Republican"    |
| "Independent"    | "Independent"   |
| Other            | "Other"         |

### Vote Position Mapping

| ProPublica Value | CivicLens Value |
| ---------------- | --------------- |
| "yea", "Y"       | "yes"           |
| "nay", "N"       | "no"            |
| "present"        | "abstain"       |
| Other            | "not_voting"    |

### Position Mapping

| ProPublica Chamber | CivicLens Position |
| ------------------ | ------------------ |
| "house"            | "Representative"   |
| "senate"           | "Senator"          |

## Error Handling

The ingestion script includes:

- **Retry Logic**: Exponential backoff for failed requests (3 retries)
- **Rate Limit Handling**: Automatic retry on 429 responses
- **Transaction Rollback**: Database rollback on pipeline failure
- **Individual Record Error Handling**: Continue processing if one record fails
- **Logging**: Detailed logs to `propublica_ingest.log`

## Data Quality

### Validation Checks

- Every record must have a source
- Bill numbers are unique
- Politician names are matched against existing records
- Vote dates are validated

### Known Limitations

1. **Politician Matching**: Name-based matching may have false positives/negatives
   - Solution: Manual verification recommended for critical records
2. **Bill-Vote Linking**: Some votes may not have associated bills

   - Solution: Minimal bill records created from vote data

3. **Rate Limits**: Free tier has daily limits
   - Solution: Batch processing over multiple days

## Demo Mode Compatibility

The ingestion script works with demo mode. Demo data can be loaded separately via SQL seed files without requiring API access.

## Future Enhancements

- [ ] Historical Congress data ingestion
- [ ] Cosponsor tracking
- [ ] Amendment tracking
- [ ] Committee membership
- [ ] Voting patterns analysis
- [ ] Automated politician matching improvements

## Related Files

- Ingestion Script: `backend/ingest/propublica_ingest.py`
- Schema Definition: `docs/schema.md`
- Demo Data: `backend/data/demo_seed_complete.sql`

## License Notes

ProPublica Congress API data is licensed under Creative Commons Attribution 4.0. All source records include appropriate license attribution in the `license_notes` field.
