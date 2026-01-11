# OpenSecrets API Source Documentation

## ⚠️ DEPRECATED - API Discontinued

**OpenSecrets API was discontinued on April 15, 2025.** This documentation is retained for historical reference only.

**See [OpenSecrets Alternatives](./opensecrets_alternatives.md) for migration options.**

---

## Overview (Historical)

OpenSecrets API provided campaign finance data including contributions, PAC donations, and industry-level aggregations. This document describes how we integrated OpenSecrets data into CivicLens with full provenance tracking.

## API Information

- **API URL**: https://www.opensecrets.org/api/
- **Documentation**: https://www.opensecrets.org/open-data/api-documentation
- **License**: OpenSecrets data from Center for Responsive Politics
- **Rate Limits**:
  - Varies by tier
  - Recommended delay: 1.0 seconds between requests

## Authentication

OpenSecrets API requires an API key:

1. Sign up at https://www.opensecrets.org/open-data/api-documentation
2. Request an API key
3. Set environment variable: `OPENSECRETS_API_KEY=your_key_here`

## Data Sources

### 1. Candidate Funding Summary

**Endpoint**: `candSummary`

**Parameters**:

- `cid`: OpenSecrets candidate ID (CRP ID)
- `cycle`: Election cycle (e.g., '2024', '2022')

**Data Captured**:

- Total contributions
- Total spent
- Cash on hand
- Cycle summary

**Provenance**:

- **Source URL**: OpenSecrets candidate profile URL
- **Publisher**: "OpenSecrets"
- **Source Type**: "donation"
- **Raw Text**: Full JSON response from API

### 2. Top Contributors

**Endpoint**: `candContrib`

**Data Captured**:

- Organization name
- PAC contributions
- Individual contributions
- Total contributions

**Provenance**:

- **Source URL**: OpenSecrets contributor page URL
- **Publisher**: "OpenSecrets"
- **Source Type**: "donation"

### 3. Contributions by Industry

**Endpoint**: `candIndByInd`

**Data Captured**:

- Industry name
- Total contributions
- Number of contributions

**Provenance**:

- **Source URL**: OpenSecrets industry contributions page
- **Publisher**: "OpenSecrets"
- **Source Type**: "donation"

## Ingestion Process

### Pipeline Stages

1. **Fetch**: Retrieve donation data from OpenSecrets API
2. **Normalize**: Map industries to our categories
3. **Store Source Metadata**: Create source record in `sources` table
4. **Store Donations**: Insert aggregated donation records
5. **Link to Politicians**: Connect donations to politician IDs

### Usage

```bash
# Ingest donations for specific candidate
python backend/ingest/opensecrets_ingest.py --cid N00000019 --politician-id 1 --cycle 2024

# Ingest for multiple cycles
python backend/ingest/opensecrets_ingest.py --cid N00000019 --politician-id 1 --cycle 2024
python backend/ingest/opensecrets_ingest.py --cid N00000019 --politician-id 1 --cycle 2022
```

**Note on `--politician-id`**: The `--politician-id` parameter must be the internal politician record ID in your database. To obtain this ID:

- Query your database: `SELECT id, name FROM politicians WHERE name = 'Politician Name';`
- Use your admin UI or API to look up the politician record
- If the politician doesn't exist, create the politician entry first (e.g., via ProPublica ingestion) so it has an ID

The script will fail if the provided `--politician-id` does not exist in the database.

## Data Mapping

### Industry to Donor Category Mapping

| OpenSecrets Industry                                                                   | CivicLens Category |
| -------------------------------------------------------------------------------------- | ------------------ |
| Health, Pharmaceuticals/Health Products, Hospitals/Nursing Homes, Health Professionals | Healthcare         |
| Oil & Gas, Mining, Electric Utilities, Nuclear Energy                                  | Energy             |
| Internet, Computer Software, Electronics Mfg & Equip, Telecom Services & Equipment     | Technology         |
| Commercial Banks, Securities & Investment, Insurance, Real Estate                      | Finance            |
| Defense Aerospace, Defense/Foreign Policy Advocates                                    | Defense            |
| Agriculture, Food & Beverage                                                           | Agriculture        |
| Construction                                                                           | Construction       |
| Transportation, Automotive, Airlines                                                   | Transportation     |
| Retail Sales                                                                           | Retail             |
| Other                                                                                  | Other              |

### Data Aggregation

OpenSecrets provides aggregated data (by industry, by organization), not individual donation records. Our ingestion script:

1. Creates donation records for industry-level totals
2. Creates donation records for top contributing organizations
3. Separates PAC contributions from individual contributions when available

### Date Handling

Since OpenSecrets provides cycle-level aggregations, donation dates use the cycle start date (January 1 of the cycle year).

## CRP ID (CID) Mapping

**Important**: OpenSecrets uses CRP IDs (CIDs), not politician names. You need to:

1. **Option 1**: Ingest ProPublica data first, which may include CRP IDs
2. **Option 2**: Manually map politician names to CRP IDs
3. **Option 3**: Use OpenSecrets candidate search API to find CIDs

Example CID: `N00000019` (Nancy Pelosi)

## Error Handling

The ingestion script includes:

- **Retry Logic**: Exponential backoff for failed requests (3 retries)
- **Rate Limit Handling**: Automatic retry on 429 responses
- **Transaction Rollback**: Database rollback on pipeline failure
- **Individual Record Error Handling**: Continue processing if one record fails
- **Logging**: Detailed logs to `opensecrets_ingest.log`

## Data Quality

### Validation Checks

- Every donation must have a source
- Politician IDs must exist in database
- Amounts are validated as positive numbers
- Categories are normalized using mapping

### Known Limitations

1. **CRP ID Mapping**: Requires manual or automated mapping to politician IDs
   - Solution: Integrate with ProPublica ingestion or create mapping table
2. **Aggregated Data**: OpenSecrets provides totals, not individual donations
   - Solution: Store as aggregated records with industry/organization names
3. **Date Granularity**: Only cycle-level dates available
   - Solution: Use cycle start date for all donations in that cycle

## Demo Mode Compatibility

The ingestion script works with demo mode. Demo data can be loaded separately via SQL seed files without requiring API access.

## Integration with ProPublica

For best results:

1. Ingest politicians from ProPublica first (may include CRP IDs)
2. Map ProPublica politician records to OpenSecrets CRP IDs
3. Then ingest OpenSecrets donation data using CRP IDs

## Future Enhancements

- [ ] Automated CRP ID mapping from ProPublica data
- [ ] Historical cycle data ingestion
- [ ] State-level contribution breakdowns
- [ ] Individual contributor names (when available)
- [ ] PAC-specific tracking
- [ ] Super PAC tracking

## Related Files

- Ingestion Script: `backend/ingest/opensecrets_ingest.py`
- Schema Definition: `docs/schema.md`
- Demo Data: `backend/data/demo_seed_donations.sql`

## License Notes

OpenSecrets data is from the Center for Responsive Politics. All source records include appropriate attribution in the `license_notes` field.
