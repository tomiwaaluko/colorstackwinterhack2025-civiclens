# Federal Election Commission (FEC) API Source Documentation

## Overview

Federal Election Commission (FEC) API provides official campaign finance data including itemized contributions, expenditures, and committee information. This document describes how we integrate FEC data into CivicLens with full provenance tracking.

**Replaces:** OpenSecrets API (discontinued April 15, 2025)

## API Information

- **API URL**: https://api.open.fec.gov/v1/
- **Documentation**: https://api.open.fec.gov/developers/
- **License**: Public domain (official government data)
- **Rate Limits**: 
  - Free tier: 1,000 requests per hour
  - Higher limits available with registration
- **Recommended delay**: 0.5 seconds between requests

## Authentication

FEC API requires an API key:

1. Register at https://api.open.fec.gov/developers/
2. Create an account and get your API key
3. Set environment variable: `FEC_API_KEY=your_key_here`

## Data Sources

### 1. Candidates

**Endpoint**: `/candidates/`

**Parameters:**
- `candidate_id`: FEC candidate ID (e.g., "S8TX00161")
- `name`: Candidate name
- `office`: 'H' (House), 'S' (Senate), 'P' (President)
- `state`: State code (e.g., 'TX')
- `cycle`: Election cycle (e.g., 2024)

**Data Captured:**
- Candidate name
- Office sought
- Party affiliation
- State
- Candidate ID
- Committee IDs associated with candidate

**Provenance:**
- **Source URL**: FEC candidate page URL
- **Publisher**: "Federal Election Commission"
- **Source Type**: "profile"
- **Raw Text**: Full JSON response from API

### 2. Itemized Contributions (Schedule A)

**Endpoint**: `/schedules/schedule_a/`

**Parameters:**
- `candidate_id`: FEC candidate ID
- `committee_id`: FEC committee ID
- `two_year_transaction_period`: Election cycle (e.g., 2024)
- `contribution_receipt_amount`: Contribution amount
- `sort`: Sort order (e.g., '-contribution_receipt_amount')

**Data Captured:**
- Contributor name
- Contributor employer
- Contributor occupation
- Contribution amount
- Contribution date
- Committee ID
- Receipt type

**Provenance:**
- **Source URL**: FEC contribution search URL
- **Publisher**: "Federal Election Commission"
- **Source Type**: "donation"
- **Raw Text**: Full JSON response from API

### 3. Committees

**Endpoint**: `/committees/`

**Parameters:**
- `committee_id`: FEC committee ID
- `name`: Committee name
- `committee_type`: Committee type (e.g., 'H', 'S', 'P', 'N', 'O', 'Q', 'V', 'W')

**Data Captured:**
- Committee name
- Committee type
- Designation (principal, authorized, etc.)
- Organization type
- Treasurer name
- Associated candidate IDs

**Provenance:**
- **Source URL**: FEC committee page URL
- **Publisher**: "Federal Election Commission"
- **Source Type**: "committee"
- **Raw Text**: Full JSON response from API

### 4. Candidate Committees

**Endpoint**: `/candidates/{candidate_id}/committees`

**Data Captured:**
- Committees associated with a candidate
- Committee roles (principal, authorized, etc.)
- Election cycles

## Ingestion Process

### Pipeline Stages

1. **Fetch**: Retrieve data from FEC API
2. **Normalize**: Convert FEC format to our schema
3. **Store Source Metadata**: Create source record in `sources` table
4. **Store Donations**: Insert itemized contribution records
5. **Link to Politicians**: Connect contributions to politician IDs
6. **Categorize**: Map contributor employer/occupation to donor categories

### Usage

```bash
# Ingest contributions for specific candidate
python backend/ingest/fec_ingest.py --candidate-id S8TX00161 --politician-id 1 --cycle 2024

# Ingest with limit on contributions
python backend/ingest/fec_ingest.py --candidate-id S8TX00161 --politician-id 1 --cycle 2024 --max-contributions 500

# Ingest for all politicians (searches FEC by name)
python backend/ingest/fec_ingest.py --all-politicians --cycle 2024
```

## Data Mapping

### Industry/Donor Category Mapping

Unlike OpenSecrets (which provided pre-aggregated industry data), FEC provides raw contributor data. We categorize contributions based on:

1. **Contributor Employer**: Maps employer name to industry categories
2. **Contributor Occupation**: Maps occupation to industry categories
3. **Fallback**: "Other" if no match found

**Industry Mappings:**
- Healthcare: Health professionals, hospitals, pharmaceuticals, medical
- Energy: Oil & gas, mining, electric utilities, nuclear energy
- Technology: Internet, computer software, electronics, telecommunications
- Finance: Commercial banks, securities & investment, insurance, real estate
- Defense: Defense, defense aerospace
- Agriculture: Agriculture, food & beverage
- Transportation: Transportation, automotive, airlines
- Construction: Construction
- Retail: Retail
- Other: All others

### Donor Type Mapping

- **Individual**: Personal contributions from individuals
- **PAC**: Contributions from Political Action Committees (when `committee_id` present)

### Date Handling

FEC provides contribution dates in `YYYY-MM-DD` format. These are parsed and stored as date objects.

## Key Differences from OpenSecrets

### Data Format

| Aspect | OpenSecrets (Deprecated) | FEC API |
|--------|-------------------------|---------|
| **Data Type** | Pre-aggregated | Raw itemized contributions |
| **Industry Data** | Pre-categorized | Manual categorization required |
| **Coverage** | Federal + some state | Federal only |
| **Real-time** | Periodic updates | Real-time (electronic filings within minutes) |
| **Detail Level** | Aggregated totals | Individual contribution records |

### ID Mapping

- **OpenSecrets**: Used CRP IDs (Center for Responsive Politics)
- **FEC**: Uses FEC candidate IDs (format: `S8TX00161` for Senate, `H8TX01000` for House)
- **Mapping**: FEC candidate IDs are different from CRP IDs. You may need to:
  1. Search FEC API by candidate name + state
  2. Maintain a mapping table
  3. Use Congress.gov data which may include both IDs

### Categorization

- **OpenSecrets**: Provided industry-level aggregations
- **FEC**: Requires categorization logic based on employer/occupation fields

## Error Handling

The ingestion script includes:

- **Retry Logic**: Exponential backoff for failed requests (3 retries)
- **Rate Limit Handling**: Automatic retry on 429 responses
- **Transaction Rollback**: Database rollback on pipeline failure
- **Individual Record Error Handling**: Continue processing if one record fails
- **Logging**: Detailed logs to `fec_ingest.log`

## Data Quality

### Validation Checks

- Every donation must have a source
- Politician IDs must exist in database
- Amounts are validated as positive numbers
- Categories are mapped using industry logic
- Dates are validated and parsed

### Known Limitations

1. **FEC ID Mapping**: Requires matching politician names to FEC candidate IDs
   - Solution: Search FEC API by name + state, or maintain mapping table
2. **Industry Categorization**: FEC provides raw data, not pre-categorized
   - Solution: Map based on employer/occupation fields using keyword matching
3. **Volume**: FEC provides itemized contributions, which can be large
   - Solution: Use `--max-contributions` flag to limit ingestion per candidate

## Finding FEC Candidate IDs

### Method 1: API Search

```python
from backend.ingest.fec_ingest import FECClient

client = FECClient(api_key="your_key")
candidates = client.search_candidates(name="John Smith", state="TX", office="S")
# Returns list of matching candidates with candidate_id fields
```

### Method 2: FEC Website

1. Visit https://www.fec.gov/data/browse-data/?tab=candidates
2. Search for candidate
3. Click on candidate name
4. FEC candidate ID is in the URL (e.g., `/data/candidate/S8TX00161/`)

### Method 3: Combine with Congress.gov

Congress.gov API may include FEC IDs in member data, making mapping easier.

## Demo Mode Compatibility

The ingestion script works with demo mode. Demo data can be loaded separately via SQL seed files without requiring API access.

## Rate Limits

FEC API free tier allows:
- **1,000 requests per hour**
- Rate limiting is enforced by FEC
- Script includes 0.5 second delay between requests to stay within limits

For higher volume:
- Consider batching requests
- Use `--max-contributions` to limit per-candidate ingestion
- Register for higher rate limits if needed

## Future Enhancements

- [ ] Automated FEC candidate ID mapping from Congress.gov data
- [ ] Enhanced industry categorization (ML-based)
- [ ] Committee-level contribution aggregation
- [ ] Expenditure tracking (Schedule B)
- [ ] Independent expenditure tracking (Schedule E)
- [ ] Historical cycle data ingestion
- [ ] State-level contribution breakdowns

## Example: Ingesting Contributions

```bash
# Step 1: Find FEC candidate ID
# Search FEC API or use FEC website to find candidate ID

# Step 2: Get politician ID from database
# Query: SELECT id, name FROM politicians WHERE name = 'John Smith';

# Step 3: Ingest contributions
python backend/ingest/fec_ingest.py \
  --candidate-id S8TX00161 \
  --politician-id 123 \
  --cycle 2024 \
  --max-contributions 1000
```

## Related Files

- Ingestion Script: `backend/ingest/fec_ingest.py`
- Alternatives Guide: `docs/opensecrets_alternatives.md`
- Schema Definition: `docs/schema.md`
- Demo Data: `backend/data/demo_seed_complete.sql`

## License Notes

FEC data is public domain (official government data). All source records include appropriate attribution in the `license_notes` field.

## Migration from OpenSecrets

If migrating from OpenSecrets API:

1. **Update environment variables**: Replace `OPENSECRETS_API_KEY` with `FEC_API_KEY`
2. **Find FEC candidate IDs**: Map your politicians to FEC candidate IDs
3. **Update ingestion scripts**: Use `fec_ingest.py` instead of `opensecrets_ingest.py`
4. **Rebuild categorization**: Industry categorization may differ (FEC uses different categories)
5. **Adjust data volume**: FEC provides itemized contributions (more detailed, larger volume)

See `docs/opensecrets_alternatives.md` for detailed migration guidance.
