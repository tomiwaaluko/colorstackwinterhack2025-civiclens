# Aggregation Query Examples

This document provides SQL query examples for aggregating donation data for visualization endpoints.

## Overview

These queries aggregate donation data by geographic region (state) and category for use in choropleth maps, timelines, and radial charts.

**Key Design Principle**: Queries return **values only** (no GeoJSON shapes). The frontend stores static boundary data and combines it with these values.

---

## 1. Donations by State (for Choropleth Maps)

### Basic Aggregation

```sql
-- Aggregates donations by state code
SELECT 
    state_code,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count,
    AVG(amount) as avg_amount
FROM donations
WHERE state_code IS NOT NULL
GROUP BY state_code
ORDER BY total_amount DESC;
```

### With Date Filtering

```sql
-- Donations by state within a date range
SELECT 
    state_code,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count
FROM donations
WHERE state_code IS NOT NULL
  AND date >= :start_date
  AND date <= :end_date
GROUP BY state_code
ORDER BY total_amount DESC;
```

### With Politician Filtering

```sql
-- Donations by state for specific politicians
SELECT 
    d.state_code,
    SUM(d.amount) as total_amount,
    COUNT(*) as donation_count
FROM donations d
WHERE d.state_code IS NOT NULL
  AND d.politician_id = ANY(:politician_ids)  -- Array parameter
GROUP BY d.state_code
ORDER BY total_amount DESC;
```

### With Category Filtering

```sql
-- Donations by state for a specific category
SELECT 
    state_code,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count
FROM donations
WHERE state_code IS NOT NULL
  AND donor_category = :category
GROUP BY state_code
ORDER BY total_amount DESC;
```

### Complete Aggregation (with Top Donor Category)

```sql
-- Aggregates donations by state with additional metadata
SELECT 
    d.state_code,
    SUM(d.amount) as total_amount,
    COUNT(*) as donation_count,
    (
        SELECT donor_category
        FROM donations d2
        WHERE d2.state_code = d.state_code
        GROUP BY donor_category
        ORDER BY SUM(amount) DESC
        LIMIT 1
    ) as top_donor_category,
    (
        SELECT SUM(amount)
        FROM donations d2
        WHERE d2.state_code = d.state_code
        GROUP BY donor_category
        ORDER BY SUM(amount) DESC
        LIMIT 1
    ) as top_category_amount
FROM donations d
WHERE d.state_code IS NOT NULL
GROUP BY d.state_code
ORDER BY total_amount DESC;
```

---

## 2. Donations by State and Category (for Multi-layer Maps)

```sql
-- Aggregates donations by state AND category
SELECT 
    state_code,
    donor_category,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count
FROM donations
WHERE state_code IS NOT NULL
GROUP BY state_code, donor_category
ORDER BY state_code, total_amount DESC;
```

---

## 3. Top Donors by State

```sql
-- Top donors for each state
SELECT 
    state_code,
    donor_name,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count
FROM donations
WHERE state_code IS NOT NULL
GROUP BY state_code, donor_name
HAVING SUM(amount) > 10000  -- Filter for significant donors
ORDER BY state_code, total_amount DESC;
```

---

## 4. Donations Timeline (by Date)

### Daily Aggregation

```sql
-- Donations aggregated by date
SELECT 
    date,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count
FROM donations
WHERE date >= :start_date
  AND date <= :end_date
GROUP BY date
ORDER BY date;
```

### Monthly Aggregation

```sql
-- Donations aggregated by month
SELECT 
    DATE_TRUNC('month', date) as month,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count
FROM donations
WHERE date >= :start_date
  AND date <= :end_date
GROUP BY DATE_TRUNC('month', date)
ORDER BY month;
```

### By State and Date

```sql
-- Timeline of donations by state
SELECT 
    date,
    state_code,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count
FROM donations
WHERE state_code IS NOT NULL
  AND date >= :start_date
  AND date <= :end_date
GROUP BY date, state_code
ORDER BY date, state_code;
```

---

## 5. Donations by Politician (for Radial Charts)

### Total by Category for a Politician

```sql
-- Donations aggregated by category for a specific politician
SELECT 
    donor_category,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count,
    AVG(amount) as avg_amount
FROM donations
WHERE politician_id = :politician_id
GROUP BY donor_category
ORDER BY total_amount DESC;
```

### With Date Range

```sql
-- Donations by category for a politician within date range
SELECT 
    donor_category,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count
FROM donations
WHERE politician_id = :politician_id
  AND date >= :start_date
  AND date <= :end_date
GROUP BY donor_category
ORDER BY total_amount DESC;
```

---

## 6. Top Politicians by State

```sql
-- Top politicians receiving donations in each state
SELECT 
    d.state_code,
    p.name as politician_name,
    p.party,
    SUM(d.amount) as total_amount,
    COUNT(*) as donation_count
FROM donations d
JOIN politicians p ON d.politician_id = p.id
WHERE d.state_code IS NOT NULL
GROUP BY d.state_code, p.id, p.name, p.party
ORDER BY d.state_code, total_amount DESC;
```

---

## 7. Citations/Evidence Bundles

### Top Sources for State Aggregations

```sql
-- Get most frequent sources for donations in a state
SELECT 
    s.id,
    s.source_url,
    s.title,
    s.publisher,
    COUNT(*) as citation_count,
    SUM(d.amount) as total_amount
FROM donations d
JOIN sources s ON d.source_id = s.id
WHERE d.state_code = :state_code
GROUP BY s.id, s.source_url, s.title, s.publisher
ORDER BY citation_count DESC
LIMIT 3;  -- Top 3 sources for evidence bundle
```

---

## 8. Performance-Optimized Queries

### Using Materialized Views (Recommended for Production)

```sql
-- Create materialized view for state-level aggregations
CREATE MATERIALIZED VIEW donations_by_state AS
SELECT 
    state_code,
    donor_category,
    DATE_TRUNC('month', date) as month,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count,
    COUNT(DISTINCT politician_id) as politician_count,
    COUNT(DISTINCT donor_name) as donor_count
FROM donations
WHERE state_code IS NOT NULL
GROUP BY state_code, donor_category, DATE_TRUNC('month', date);

-- Create index on materialized view
CREATE INDEX idx_donations_by_state_code ON donations_by_state(state_code);
CREATE INDEX idx_donations_by_state_month ON donations_by_state(month);

-- Refresh materialized view (run periodically)
REFRESH MATERIALIZED VIEW donations_by_state;
```

### Query with Materialized View

```sql
-- Fast query using materialized view
SELECT 
    state_code,
    SUM(total_amount) as total_amount,
    SUM(donation_count) as donation_count
FROM donations_by_state
WHERE month >= :start_month
  AND month <= :end_month
GROUP BY state_code
ORDER BY total_amount DESC;
```

---

## 9. Example API Response Structure

These queries support the following API response format:

```json
{
  "level": "state",
  "values": {
    "CA": {
      "total_amount": 1500000,
      "donation_count": 250,
      "top_donor_category": "Technology",
      "top_category_amount": 800000,
      "citations": [
        {
          "source_id": 123,
          "source_url": "https://...",
          "title": "...",
          "publisher": "..."
        }
      ],
      "top_politicians": [
        {
          "politician_id": 2,
          "name": "Kamala Harris",
          "total_amount": 400000
        }
      ]
    },
    "NY": {
      "total_amount": 1200000,
      "donation_count": 180,
      ...
    }
  },
  "metadata": {
    "date_range": {
      "start": "2022-01-01",
      "end": "2024-12-31"
    },
    "citation_count": 45,
    "total_donations": 1200,
    "total_amount": 5000000
  }
}
```

---

## Notes

- All queries filter out `NULL` state codes to ensure data quality
- Date filtering uses `>=` and `<=` for inclusive ranges
- Consider adding indexes on frequently filtered columns:
  - `state_code` (already indexed)
  - `date` (already indexed)
  - `donor_category` (already indexed)
  - `politician_id` (already indexed)
- For production, use materialized views for better performance
- Cache aggregation results in Redis if needed

