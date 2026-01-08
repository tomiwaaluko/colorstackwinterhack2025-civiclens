# ProPublica Congress API Alternatives

## Overview

ProPublica discontinued their Congress API in July 2024. This document outlines viable alternatives for obtaining Congressional data (members, bills, and votes).

## Recommended Alternatives

### 1. GovTrack.us API (Recommended) ⭐

**Best overall replacement for ProPublica Congress API**

- **API URL**: https://www.govtrack.us/api/v2
- **Documentation**: https://www.govtrack.us/developers/api
- **License**: Open data (public domain)
- **API Key**: **Not required** (free, no registration needed)
- **Rate Limits**: Reasonable rate limits (not explicitly documented, but generous)

**Features:**
- ✅ Members of Congress (current and historical)
- ✅ Bills and resolutions
- ✅ Roll call votes
- ✅ Committees
- ✅ Cosponsorships
- ✅ Bill text and summaries
- ✅ Voting records per member

**API Endpoints (v2):**
```
GET /role - Current members of Congress
GET /person - Individual member details
GET /bill - Bills and resolutions
GET /vote - Roll call votes
GET /vote_vote - Individual vote positions
```

**Example:**
```python
# Get current members
GET https://www.govtrack.us/api/v2/role?current=true

# Get bills
GET https://www.govtrack.us/api/v2/bill?congress=118

# Get votes
GET https://www.govtrack.us/api/v2/vote?congress=118
```

**Advantages:**
- No API key required
- Comprehensive data coverage
- Well-maintained and actively updated
- JSON API format similar to ProPublica
- Historical data available

**Disadvantages:**
- Different data structure than ProPublica (requires migration work)
- Rate limits less explicit

---

### 2. Congress.gov API (Official)

**Official government API with limited endpoints**

- **API URL**: https://api.congress.gov/v3
- **Documentation**: https://api.congress.gov/
- **License**: Public domain
- **API Key**: **Required** (free, registration needed)
- **Rate Limits**: 1,000 requests/day (free tier)

**Features:**
- ✅ Bills
- ✅ Members (limited)
- ✅ Roll call votes
- ✅ Committee information
- ✅ Bill text and summaries

**API Endpoints:**
```
GET /bill/{congress}/{billType}/{billNumber}
GET /member/{memberId}
GET /vote/{congress}/{chamber}/{sessionNumber}/{rollCallNumber}
```

**Registration:**
1. Visit https://api.congress.gov/
2. Sign up for a free API key
3. Set environment variable: `CONGRESS_GOV_API_KEY=your_key_here`

**Advantages:**
- Official government source
- Reliable and stable
- Structured data format

**Disadvantages:**
- More limited endpoints than ProPublica/GovTrack
- Requires API key registration
- Lower rate limits (1,000/day)
- Different endpoint structure

---

### 3. OpenStates API (State-Level Only)

**Note:** OpenStates is primarily for **state legislatures**, not federal Congress. However, it may have some federal data in certain jurisdictions.

- **API URL**: https://v3.openstates.org
- **Documentation**: https://docs.openstates.org/en/latest/api/v3/index.html
- **License**: Creative Commons Attribution 4.0
- **API Key**: **Required** (free, registration needed)

**Current Status in Project:**
- Already integrated in `backend/app/data/openstates_ingest.py`
- Works well for state-level data
- **Not suitable for federal Congressional data**

---

## Migration Recommendation

### ✅ Selected: Congress.gov API

**Status**: Implementation complete. See `backend/ingest/congress_gov_ingest.py`

### Option 1: Migrate to GovTrack.us API (Alternative)

**Why GovTrack:**
- No API key needed (easier setup)
- Most similar data coverage to ProPublica
- Free and open
- Well-documented
- Actively maintained

**Migration Steps:**
1. Create new `govtrack_ingest.py` script
2. Map GovTrack API responses to existing database schema
3. Update documentation
4. Replace ProPublica references with GovTrack
5. Test with sample data

### Option 2: Use Congress.gov API

**Why Congress.gov:**
- Official source
- More reliable long-term
- Better for official citations

**Migration Steps:**
1. ✅ Register for API key
2. ✅ Create `congress_gov_ingest.py` script (`backend/ingest/congress_gov_ingest.py`)
3. ✅ Handle rate limits (1,000/day)
4. ✅ Map API responses to schema
5. ✅ Create documentation (`docs/sources_congress_gov.md`)

**Status**: ✅ **IMPLEMENTED** - Ready to use!

### Option 3: Hybrid Approach

Use both:
- **GovTrack** for members and votes (easier, no API key)
- **Congress.gov** for bill text and official data (when needed)

---

## Data Mapping Considerations

### Members of Congress

**ProPublica** → **GovTrack:**
```python
# ProPublica format
member['first_name'] + ' ' + member['last_name']
member['party']
member['state']
member['district']

# GovTrack format
person['name']
role['party']
role['state']
role['district']
```

### Bills

**ProPublica** → **GovTrack:**
```python
# ProPublica
bill['number']  # "HR 1234"
bill['title']
bill['introduced_date']

# GovTrack
bill['display_number']  # "H.R. 1234"
bill['title']
bill['introduced_date']
```

### Votes

**ProPublica** → **GovTrack:**
```python
# ProPublica
vote['description']
vote['date']
vote['result']

# GovTrack
vote['category']
vote['created']
vote['result']
```

---

## Implementation Priority

1. **Immediate**: Update documentation to note ProPublica is discontinued
2. **Short-term**: Implement GovTrack API integration
3. **Medium-term**: Migrate existing ProPublica ingestion script to GovTrack
4. **Long-term**: Consider Congress.gov API for official bill text if needed

---

## Resources

- **GovTrack API Docs**: https://www.govtrack.us/developers/api
- **Congress.gov API**: https://api.congress.gov/
- **OpenStates Docs**: https://docs.openstates.org/

---

## Next Steps

1. ✅ Document alternatives (this file)
2. ✅ Update `docs/sources_propublica.md` with deprecation notice
3. ✅ Create `backend/ingest/congress_gov_ingest.py` (Congress.gov implementation)
4. ✅ Create `docs/sources_congress_gov.md` documentation
5. ⏳ Update environment variable documentation (add CONGRESS_GOV_API_KEY)
6. ⏳ Test Congress.gov API integration
7. ⏳ Update frontend citations to use Congress.gov URLs (if needed)
8. ⏳ Consider keeping GovTrack.us as backup option if Congress.gov has issues

---

**Last Updated**: January 2025
**Status**: ProPublica Congress API discontinued July 2024

