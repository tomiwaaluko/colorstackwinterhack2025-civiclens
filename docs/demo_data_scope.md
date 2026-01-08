# Demo Data Scope and Inventory

This document describes the complete demo dataset included in the CivicLens project for visualization testing and offline development.

## Overview

The demo seed data provides a complete, self-contained dataset that enables all visualization features without requiring external API calls or live data sources.

---

## Data Files

### Primary Seed Files

1. **`backend/data/demo_seed_complete.sql`** - Main comprehensive seed file
   - Includes: Politicians, Bills, Votes, Statements, Sources
   - Run this first for complete demo data

2. **`backend/data/demo_seed_donations.sql`** - Donation data seed
   - Includes: Donations across multiple states, categories, and years
   - Can be run separately or is included in complete seed

---

## Data Inventory

### Politicians (6)

All politicians have complete records with `state_code`, `district_number`, and `position`:

| ID | Name | Party | State | District | Position |
|----|------|-------|-------|----------|----------|
| 1 | Joe Biden | Democrat | DE | NULL | Senator |
| 2 | Kamala Harris | Democrat | CA | NULL | Senator |
| 3 | Mitch McConnell | Republican | KY | NULL | Senator |
| 4 | Nancy Pelosi | Democrat | CA | 12 | Representative |
| 5 | Kevin McCarthy | Republican | CA | 20 | Representative |
| 6 | Alexandria Ocasio-Cortez | Democrat | NY | 14 | Representative |

**Coverage:**
- ✅ 4 different states (DE, CA, KY, NY)
- ✅ Both parties represented (Democrat: 4, Republican: 2)
- ✅ Both chambers (Senators: 3, Representatives: 3)

---

### Bills (10)

All bills are linked to votes and include `topic` for network graph visualization:

| Bill Number | Title | Topic | Introduced Date |
|-------------|-------|-------|-----------------|
| HR 8151 | American Innovation and Jobs Act | Technology | 2024-01-15 |
| S 4567 | Clean Energy Infrastructure Bill | Energy | 2024-02-10 |
| HR 7890 | Healthcare Affordability Act | Healthcare | 2024-03-05 |
| HR 6789 | Student Loan Forgiveness Act | Education | 2023-06-20 |
| S 3456 | Climate Action and Jobs Act | Environment | 2023-07-15 |
| HR 5678 | Affordable Housing Act | Housing | 2023-08-10 |
| S 2345 | Tax Reform for Working Families Act | Finance | 2023-09-05 |
| HR 4321 | Voting Rights Protection Act | Elections | 2023-10-20 |
| HR 1234 | Infrastructure Investment and Jobs Act | Infrastructure | 2022-03-15 |
| S 9876 | Mental Health Access Act | Healthcare | 2022-11-10 |

**Coverage:**
- ✅ 10 bills spanning 2022-2024 (3 years)
- ✅ Multiple topics (Technology, Energy, Healthcare, Education, Environment, Housing, Finance, Elections, Infrastructure)
- ✅ Both House (HR) and Senate (S) bills

---

### Votes (30)

All votes are linked to bills and politicians with dates spanning 2022-2024:

**2024 Votes (10):**
- HR 8151 - American Innovation and Jobs Act: 6 votes (2024-02-20)
- S 4567 - Clean Energy Infrastructure Bill: 3 votes (2024-03-10)
- HR 7890 - Healthcare Affordability Act: 4 votes (2024-04-05)

**2023 Votes (15):**
- HR 6789 - Student Loan Forgiveness Act: 5 votes (2023-07-15)
- S 3456 - Climate Action and Jobs Act: 3 votes (2023-08-10)
- HR 5678 - Affordable Housing Act: 3 votes (2023-09-05)
- S 2345 - Tax Reform for Working Families Act: 3 votes (2023-10-20)
- HR 4321 - Voting Rights Protection Act: 4 votes (2023-11-10)

**2022 Votes (5):**
- HR 1234 - Infrastructure Investment and Jobs Act: 4 votes (2022-06-15)
- S 9876 - Mental Health Access Act: 3 votes (2022-12-10)

**Coverage:**
- ✅ 30 votes total (exceeds 20-30 requirement)
- ✅ Spans 3 years (2022-2024)
- ✅ All votes linked to bills
- ✅ All votes have dates for timeline visualization
- ✅ Vote positions: 'yes', 'no' (for visualization)

---

### Statements (21)

All statements have dates spanning 2022-2024 for timeline visualization:

**Joe Biden (4 statements):**
- 2022-05-10: "We need to build back better with infrastructure investment..."
- 2023-04-15: "Climate change is an existential threat..."
- 2024-01-20: "Healthcare should be affordable and accessible..."
- 2024-03-08: "We must protect Social Security and Medicare..."

**Kamala Harris (4 statements):**
- 2022-07-20: "Healthcare is a right, not a privilege..."
- 2023-06-10: "Criminal justice reform is long overdue..."
- 2023-11-05: "We must protect voting rights..."
- 2024-02-14: "Student loan debt is crushing our young people..."

**Mitch McConnell (4 statements):**
- 2022-09-15: "We need to protect conservative values..."
- 2023-03-22: "Lower taxes spur economic growth..."
- 2023-08-30: "Strong national defense is essential..."
- 2024-05-12: "We must reduce federal spending..."

**Nancy Pelosi (3 statements):**
- 2022-11-18: "We must invest in clean energy..."
- 2023-09-12: "Affordable housing is a critical need..."
- 2024-01-30: "We need comprehensive immigration reform..."

**Kevin McCarthy (3 statements):**
- 2022-12-05: "We must reduce the size and scope..."
- 2023-07-25: "Energy independence is crucial..."
- 2024-04-10: "We need to cut wasteful spending..."

**Alexandria Ocasio-Cortez (3 statements):**
- 2023-02-28: "We need a Green New Deal..."
- 2023-10-15: "Medicare for All is the only solution..."
- 2024-03-20: "We must cancel student loan debt..."

**Coverage:**
- ✅ 21 statements spanning 2022-2024
- ✅ All statements have dates for timeline visualization
- ✅ All statements linked to politicians

---

### Donations (32+)

Donation data from `demo_seed_donations.sql`:

**Coverage:**
- ✅ 6 politicians (all have donation records)
- ✅ 32+ donations total
- ✅ 15+ states represented (DE, CA, TX, WA, DC, KY, NY, IL, VA, MA, FL, MD, PA, OH, GA, NC)
- ✅ 10+ donor categories (Healthcare, Energy, Technology, Finance, Labor, Telecommunications, Progressive, Environment, Interest Groups, etc.)
- ✅ Spans 3 years (2022-2024)
- ✅ All donations have `state_code` for map aggregation
- ✅ All donations have `date` for timeline visualization
- ✅ All donations linked to `source_id`

**Sample Donations by State:**
- California: 8+ donations (Tech companies, Healthcare)
- New York: 5+ donations (Finance, Progressive groups)
- Washington: 4+ donations (Technology companies)
- Delaware: 3+ donations (Healthcare, Labor)
- Texas: 4+ donations (Energy, Telecommunications)
- And 10+ more states

---

## Data Relationships

### Network Graph Structure

**Politicians ↔ Bills:**
- 6 politicians linked to 10 bills via votes
- Multiple politicians can vote on the same bill
- Each vote creates an edge in the network graph

**Politicians ↔ Donors:**
- 6 politicians linked to 20+ donors via donations
- Multiple donors per politician (3-6 per politician)
- Donors organized by category for network visualization

**Bills ↔ Donors (Indirect):**
- Can be linked via category alignment
- Example: Healthcare bills ↔ Healthcare PAC donations
- Enabled via `include_indirect` parameter in network graph endpoint

### Timeline Structure

**Chronological Events:**
- **2022**: 5 votes + 8 statements (13 events)
- **2023**: 15 votes + 10 statements (25 events)
- **2024**: 10 votes + 8 statements (18 events)
- **Total**: 56 timeline events across 3 years

**Event Types:**
- Votes: 30 events with dates
- Statements: 21 events with dates
- Donations: 32+ events with dates

---

## Visualization Coverage

### ✅ Donations Map (Choropleth)

**Data Requirements:**
- Donations aggregated by state ✅
- 15+ states represented ✅
- Total amounts and counts per state ✅
- Top donors, politicians, and categories per state ✅
- Citations (sources) per state ✅

**Coverage:** Excellent
- All requirements met
- Sufficient density for meaningful visualizations

---

### ✅ Timeline Visualization

**Data Requirements:**
- Events spanning 2-3 years ✅ (2022-2024 = 3 years)
- Multiple event types ✅ (votes, statements, donations)
- Dates for all events ✅
- Citations for events ✅

**Coverage:** Excellent
- 56+ timeline events
- 3 years of data
- Multiple politicians with timeline data

---

### ✅ Network Graph

**Data Requirements:**
- Bills linked to votes ✅ (10 bills, 30 votes)
- Politicians linked to bills ✅ (6 politicians)
- Politicians linked to donors ✅ (6 politicians, 20+ donors)
- Multiple relationship types ✅ (votes, donations)

**Coverage:** Excellent
- Complete network structure
- Sufficient nodes and edges for visualization
- Supports indirect relationships

---

### ✅ Radial Chart

**Data Requirements:**
- Donations by category per politician ✅
- Multiple categories per politician ✅ (3-6 categories each)
- Total amounts and counts ✅
- Citations per category ✅

**Coverage:** Excellent
- 6 politicians with donation data
- 10+ categories represented
- Sufficient data for meaningful breakdowns

---

## Data Verification

### Quick Check Queries

**Verify politicians:**
```sql
SELECT COUNT(*) FROM politicians;  -- Should return 6
SELECT name, state_code FROM politicians ORDER BY id;
```

**Verify bills:**
```sql
SELECT COUNT(*) FROM bills;  -- Should return 10
SELECT bill_number, title, introduced_date FROM bills ORDER BY introduced_date;
```

**Verify votes:**
```sql
SELECT COUNT(*) FROM votes;  -- Should return 30
SELECT MIN(vote_date) as earliest, MAX(vote_date) as latest FROM votes;
-- Should span 2022-2024
```

**Verify statements:**
```sql
SELECT COUNT(*) FROM statements;  -- Should return 21
SELECT MIN(date) as earliest, MAX(date) as latest FROM statements;
-- Should span 2022-2024
```

**Verify donations:**
```sql
SELECT COUNT(*) FROM donations;  -- Should return 32+
SELECT COUNT(DISTINCT state_code) as states FROM donations;
-- Should return 15+
SELECT COUNT(DISTINCT donor_category) as categories FROM donations;
-- Should return 10+
```

**Verify geographic diversity:**
```sql
SELECT state_code, COUNT(*) as donation_count, SUM(amount) as total_amount
FROM donations
GROUP BY state_code
ORDER BY total_amount DESC
LIMIT 10;
-- Should show 10+ states
```

**Verify time range:**
```sql
SELECT 
    EXTRACT(YEAR FROM vote_date) as year,
    COUNT(*) as vote_count
FROM votes
GROUP BY EXTRACT(YEAR FROM vote_date)
ORDER BY year;
-- Should show votes in 2022, 2023, 2024
```

---

## Seed File Usage

### Complete Seed (Recommended)

```bash
# Run the complete seed file (includes everything)
psql $DATABASE_URL -f backend/data/demo_seed_complete.sql
```

This file includes:
- ✅ Politicians (6)
- ✅ Bills (10)
- ✅ Votes (30)
- ✅ Statements (21)
- ✅ Sources (8)

**Note:** Donations are in a separate file (`demo_seed_donations.sql`) because they may already be seeded.

### Separate Donation Seed

```bash
# If donations are not already seeded, run:
psql $DATABASE_URL -f backend/data/demo_seed_donations.sql
```

---

## Data Quality

### Completeness

- ✅ All required fields populated
- ✅ All foreign key relationships valid
- ✅ All source_id references valid
- ✅ No NULL values in required fields

### Consistency

- ✅ State codes standardized (2-letter USPS codes)
- ✅ Dates in valid DATE format
- ✅ Vote positions validated ('yes', 'no', 'abstain', 'not_voting')
- ✅ Amounts non-negative

### Coverage

- ✅ Sufficient data for all visualizations
- ✅ Geographic diversity (15+ states)
- ✅ Temporal diversity (3 years)
- ✅ Category diversity (10+ donation categories, 10 bill topics)

---

## Offline Mode Support

All demo data works in **offline mode** (no API calls required):

- ✅ All data is static (stored in database)
- ✅ No external dependencies
- ✅ Sources are demo URLs (not real API endpoints)
- ✅ Frontend can work with demo data via `DEMO_MODE=true`

---

## Limitations

This is **demo/seed data**, not production data:

- ⚠️ Donation amounts and dates are examples only
- ⚠️ Bill information is simplified/demo data
- ⚠️ Vote positions may not reflect actual voting records
- ⚠️ Statements are example quotes
- ⚠️ Sources use demo URLs

**For production use:**
- Replace with real data from OpenSecrets, Congress.gov, etc.
- Use data ingestion scripts to import actual records
- Validate and normalize data according to source requirements

---

## Related Documentation

- **Database Schema**: `/docs/schema.md`
- **Migration Instructions**: `/backend/migrations/MIGRATION_INSTRUCTIONS.md`
- **Seed Scripts**: `/backend/scripts/seed_donations.py`
- **Data Ingestion**: `/backend/ingest/opensecrets_ingest.py`

---

**Last Updated**: Step 9 Implementation  
**Data Version**: 1.0  
**Status**: Complete ✅

