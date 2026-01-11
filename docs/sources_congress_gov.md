# Congress.gov API Source Documentation

## Overview

Congress.gov API v3 provides official access to members of Congress, bills, and voting records from the Library of Congress. This document describes how we integrate Congress.gov data into CivicLens with full provenance tracking.

## API Information

- **API URL**: https://api.congress.gov/v3
- **Documentation**: https://api.congress.gov/
- **GitHub**: https://github.com/LibraryOfCongress/api.congress.gov
- **License**: Public domain
- **Rate Limits**:
  - 1,000 requests per day (free tier)
  - Rate limiting delay: 1.0 seconds between requests (recommended)

## Authentication

Congress.gov API requires an API key:

1. Visit https://api.congress.gov/
2. Sign up for a free API key (via Data.gov)
3. Get your API key from the dashboard
4. Set environment variable: `CONGRESS_GOV_API_KEY=your_key_here`

**Note**: As of 2024-2025, there have been some reported issues with the Congress.gov API. If you encounter problems, see [ProPublica Alternatives](./propublica_alternatives.md) for other options.

## Data Sources

### 1. Members of Congress

**Endpoint**: `/member`

**Data Captured**:

- Name (first, last)
- State
- Party affiliation
- Chamber (House/Senate)
- Bioguide ID (unique identifier)

**Provenance**:

- **Source URL**: Congress.gov member profile URL
- **Publisher**: "Congress.gov"
- **Source Type**: "profile"
- **Raw Text**: Full JSON response from API

### 2. Bills

**Endpoint**: `/bill/{congress}/{billType}`

**Bill Types**:

- `hr`: House bills
- `s`: Senate bills
- `hjres`: House joint resolutions
- `sjres`: Senate joint resolutions
- `hconres`: House concurrent resolutions
- `sconres`: Senate concurrent resolutions
- `hres`: House resolutions
- `sres`: Senate resolutions

**Data Captured**:

- Bill number (e.g., "HR 1234", "S. 567")
- Title
- Introduction date
- Summary/abstract
- Status
- Sponsor information

**Provenance**:

- **Source URL**: Congress.gov bill URL
- **Publisher**: "Congress.gov"
- **Source Type**: "bill"
- **Raw Text**: Full JSON response from API

### 3. Votes

**Endpoint**: `/vote/{congress}/{chamber}/{session}/{rollCall}`

**Data Captured**:

- Roll call number
- Vote description
- Vote date
- Bill associated with vote
- Individual member positions (yes/no/abstain/not_voting)

**Provenance**:

- **Source URL**: Congress.gov vote URL
- **Publisher**: "Congress.gov"
- **Source Type**: "vote"
- **Raw Text**: Full JSON response from API

## Ingestion Process

### Pipeline Stages

1. **Fetch**: Retrieve data from Congress.gov API
2. **Normalize**: Convert Congress.gov format to our schema
3. **Store Source Metadata**: Create source record in `sources` table
4. **Store Raw Records**: Insert politicians, bills, votes
5. **Link Records**: Connect votes to bills, votes to politicians
6. **Generate Evidence Bundle**: Store raw JSON for chunking

### Usage

```bash
# Ingest all members and bills for current Congress
python backend/ingest/congress_gov_ingest.py

# Ingest only members
python backend/ingest/congress_gov_ingest.py --members-only

# Ingest only bills
python backend/ingest/congress_gov_ingest.py --bills-only

# Ingest specific Congress
python backend/ingest/congress_gov_ingest.py --congress 117

# Ingest specific chamber
python backend/ingest/congress_gov_ingest.py --chamber house

# Ingest specific bill type
python backend/ingest/congress_gov_ingest.py --bill-type s

# Limit bill pages
python backend/ingest/congress_gov_ingest.py --max-pages 5
```

## Data Mapping

### Party Normalization

| Congress.gov Value | CivicLens Value |
| ------------------ | --------------- |
| "Democratic"       | "Democrat"      |
| "Republican"       | "Republican"    |
| "Independent"      | "Independent"   |
| Other              | "Other"         |

### Vote Position Mapping

| Congress.gov Value | CivicLens Value |
| ------------------ | --------------- |
| "yea", "Y", "yes"  | "yes"           |
| "nay", "N", "no"   | "no"            |
| "present"          | "abstain"       |
| Other              | "not_voting"    |

### Position Mapping

| Congress.gov Chamber | CivicLens Position |
| -------------------- | ------------------ |
| "house"              | "Representative"   |
| "senate"             | "Senator"          |

## Error Handling

The ingestion script includes:

- **Retry Logic**: Exponential backoff for failed requests (3 retries)
- **Rate Limit Handling**: Automatic retry on 429 responses
- **Daily Limit Tracking**: Monitors 1,000 requests/day limit
- **Transaction Rollback**: Database rollback on pipeline failure
- **Individual Record Error Handling**: Continue processing if one record fails
- **Logging**: Detailed logs to `congress_gov_ingest.log`

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

3. **Rate Limits**: Free tier has daily limit of 1,000 requests

   - Solution: Batch processing over multiple days, use `--max-pages` to limit

4. **API Availability**: Congress.gov API has had some reported outages

   - Solution: Monitor API status, consider GovTrack.us as backup

## Demo Mode Compatibility

The ingestion script works with demo mode. Demo data can be loaded separately via SQL seed files without requiring API access.

## Future Enhancements

- [ ] Historical Congress data ingestion
- [ ] Cosponsor tracking
- [ ] Amendment tracking
- [ ] Committee membership
- [ ] Voting patterns analysis
- [ ] Automated politician matching improvements
- [ ] Bill text extraction

## Related Files

- Ingestion Script: `backend/ingest/congress_gov_ingest.py`
- Schema Definition: `backend/app/data/0001_init.sql`
- Demo Data: `backend/app/data/demo_seed.sql`
- Alternatives: `docs/propublica_alternatives.md`

## License Notes

Congress.gov API data is in the public domain. All source records include appropriate license attribution in the `license_notes` field.

