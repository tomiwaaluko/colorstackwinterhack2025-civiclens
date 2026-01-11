# OpenSecrets API Alternatives

## Overview

OpenSecrets discontinued their public APIs as of **April 15, 2025**. This document outlines viable alternatives for obtaining campaign finance data (contributions, donations, and industry-level aggregations).

**Note**: OpenSecrets now offers **OpenSecrets Pro**, a subscription-based commercial service. For custom data needs, contact: `commercial@opensecrets.org`

## Recommended Alternatives

### 1. Federal Election Commission (FEC) API ⭐ (Recommended)

**Official federal source for campaign finance data**

- **API URL**: https://api.open.fec.gov/
- **Documentation**: https://api.open.fec.gov/developers/
- **License**: Public domain (official government data)
- **API Key**: **Free, registration required**
- **Rate Limits**: 
  - Free tier: 1,000 requests per hour
  - Higher limits available with registration

**Features:**
- ✅ Federal campaign contributions (itemized)
- ✅ Committee data
- ✅ Candidate filings and summaries
- ✅ Expenditures
- ✅ PAC and Super PAC data
- ✅ Real-time updates (electronic filings within minutes)
- ✅ Historical data (1979-present)

**API Endpoints:**
```
GET /candidates/ - Candidate information
GET /committees/ - Committee data
GET /schedules/schedule_a/ - Individual contributions
GET /schedules/schedule_b/ - Expenditures
GET /schedules/schedule_e/ - Independent expenditures
GET /filings/ - Campaign finance filings
```

**Getting Started:**
1. Register for API key: https://api.open.fec.gov/developers/
2. Get your API key from the developer portal
3. Set environment variable: `FEC_API_KEY=your_key_here`

**Advantages:**
- Official government source
- Most comprehensive federal data
- Free with registration
- Real-time updates
- Well-documented API
- No cost for standard usage

**Limitations:**
- Federal level only (no state data)
- Requires data processing for industry aggregations
- Some endpoints may require rate limit management

**Migration Notes:**
- FEC data is more raw/detailed than OpenSecrets aggregations
- Industry categorization may need to be done manually or via mapping
- CRP IDs (used by OpenSecrets) don't map directly to FEC committee IDs

---

### 2. ProPublica Campaign Finance API

**ProPublica's interface to FEC data**

- **API URL**: Based on FEC data
- **Documentation**: Contact ProPublica for API access
- **License**: ProPublica terms
- **API Key**: **Free, email registration required**
- **Contact**: `campaign-finance-api@propublica.org`

**Features:**
- ✅ FEC filing data (same source as FEC API)
- ✅ Updated every 15 minutes (electronic filings)
- ✅ Daily summary updates
- ✅ Committee and candidate information
- ✅ May include some processing/aggregation

**Getting Started:**
1. Email `campaign-finance-api@propublica.org` to request API key
2. Describe your use case
3. Receive API key via email

**Advantages:**
- Access to FEC data via ProPublica's interface
- May include additional processing
- Free access

**Limitations:**
- Federal level only
- Requires email request (not instant)
- Less comprehensive than direct FEC API
- Terms may vary

---

### 3. FollowTheMoney.org (State-Level Data)

**State-level campaign finance data**

- **Website**: https://www.followthemoney.org/
- **Organization**: National Institute on Money in State Politics
- **API**: Web scraping or bulk downloads
- **License**: Open data license
- **API Key**: Not required (public data)

**Features:**
- ✅ State-level campaign contributions
- ✅ Legislative and judicial races
- ✅ Ballot measure campaigns
- ✅ Political party contributions
- ✅ Lobbying data (some states)
- ✅ Covers all 50 states

**Data Access:**
- **Bulk Downloads**: CSV/Excel files available
- **API**: Limited API available (check website for current status)
- **Web Interface**: Searchable database

**Advantages:**
- Comprehensive state-level data
- Free and open
- Covers all states
- Historical data available

**Limitations:**
- Primarily bulk download format (not real-time API)
- Requires local data processing
- No federal data
- API access may be limited

**Use Case:**
Best for state-level analysis or when combined with FEC data for comprehensive coverage.

---

### 4. OpenSecrets Pro (Commercial)

**OpenSecrets' commercial subscription service**

- **Website**: https://ospro.org/
- **Contact**: `commercial@opensecrets.org`
- **License**: Commercial subscription
- **Cost**: Subscription-based (contact for pricing)

**Features:**
- ✅ Federal and state contribution data
- ✅ Advanced filtering and search
- ✅ Export capabilities
- ✅ Aggregated industry data
- ✅ Historical data
- ✅ May include features from discontinued public API

**Advantages:**
- Most similar to original OpenSecrets API
- Includes both federal and state data
- Pre-processed and aggregated
- Professional support

**Limitations:**
- Requires paid subscription
- Commercial use restrictions
- Contact required (no self-service)

**Use Case:**
Best for organizations with budget for data subscriptions who need similar functionality to the original OpenSecrets API.

---

## Migration Strategy

### Recommended Approach: FEC API

1. **For Federal Data**:
   - Use FEC API as primary source
   - Register at https://api.open.fec.gov/developers/
   - Implement ingestion similar to OpenSecrets script
   - Process raw data for industry categorization

2. **For State Data**:
   - Use FollowTheMoney.org bulk downloads
   - Combine with federal data for comprehensive coverage

3. **For Aggregated/Analyzed Data**:
   - Consider OpenSecrets Pro if budget allows
   - Or build aggregation logic using FEC + FollowTheMoney data

### Implementation Checklist

1. ✅ Document alternatives (this file)
2. ✅ Update `docs/sources_opensecrets.md` with deprecation notice
3. ⏳ Create `backend/ingest/fec_ingest.py` (FEC API implementation)
4. ⏳ Create `docs/sources_fec.md` documentation
5. ⏳ Update environment variable documentation (add FEC_API_KEY)
6. ⏳ Test FEC API integration
7. ⏳ Map FEC committee IDs to politician records
8. ⏳ Implement industry categorization logic

---

## Data Mapping Considerations

### Key Differences from OpenSecrets

1. **ID Mapping**:
   - OpenSecrets used CRP IDs (candidate IDs)
   - FEC uses committee IDs and candidate IDs
   - Mapping between systems may be required

2. **Data Format**:
   - OpenSecrets provided pre-aggregated industry data
   - FEC provides raw contribution records
   - Industry aggregation needs to be built

3. **Coverage**:
   - OpenSecrets: Federal + some state data
   - FEC: Federal only
   - FollowTheMoney: State only

4. **Update Frequency**:
   - OpenSecrets: Periodic updates
   - FEC: Real-time (electronic filings within minutes)

---

## Code Example: FEC API Integration

```python
import requests
import os

FEC_API_KEY = os.getenv('FEC_API_KEY')
FEC_BASE_URL = "https://api.open.fec.gov/v1"

def get_candidate_contributions(candidate_id, cycle):
    """Get contributions for a candidate"""
    params = {
        'api_key': FEC_API_KEY,
        'candidate_id': candidate_id,
        'two_year_transaction_period': cycle,
        'sort': '-contribution_receipt_amount',
        'per_page': 100
    }
    
    response = requests.get(
        f"{FEC_BASE_URL}/schedules/schedule_a/",
        params=params
    )
    response.raise_for_status()
    return response.json()

def get_committee_contributions(committee_id, cycle):
    """Get contributions to a committee"""
    params = {
        'api_key': FEC_API_KEY,
        'committee_id': committee_id,
        'two_year_transaction_period': cycle,
        'sort': '-contribution_receipt_amount',
        'per_page': 100
    }
    
    response = requests.get(
        f"{FEC_BASE_URL}/schedules/schedule_a/",
        params=params
    )
    response.raise_for_status()
    return response.json()
```

---

## Comparison Table

| Feature | OpenSecrets (Discontinued) | FEC API | ProPublica FEC | FollowTheMoney | OpenSecrets Pro |
|---------|---------------------------|---------|----------------|----------------|-----------------|
| **Cost** | Free | Free | Free | Free | Paid |
| **Coverage** | Federal + State | Federal only | Federal only | State only | Federal + State |
| **API Access** | ✅ Public API | ✅ Public API | ✅ Email request | Limited/Bulk | Subscription |
| **Real-time** | Periodic | ✅ Real-time | ✅ Real-time | Bulk | Real-time |
| **Aggregations** | ✅ Pre-aggregated | Raw data | Raw data | Some | ✅ Pre-aggregated |
| **Industry Data** | ✅ Yes | Manual | Manual | Limited | ✅ Yes |
| **Documentation** | ✅ Good | ✅ Excellent | Contact | Website | Support |

---

## Recommendation

**For CivicLens:**

1. **Primary**: Use **FEC API** for federal campaign finance data
   - Official source
   - Free with registration
   - Comprehensive and real-time
   - Requires industry categorization logic

2. **Secondary**: Consider **FollowTheMoney.org** bulk downloads for state data
   - When state-level data is needed
   - Can be processed and stored locally

3. **Future**: Evaluate **OpenSecrets Pro** if budget allows
   - Only if pre-aggregated data is critical
   - Or if time to build aggregation is limited

---

**Last Updated**: January 2025  
**Status**: OpenSecrets API discontinued April 15, 2025  
**Migration Status**: Alternatives identified, implementation pending
