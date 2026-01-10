# Visualization API Endpoints Documentation

This document describes the visualization aggregation endpoints for interactive visual analytics.

## Overview

All visualization endpoints return **values only** (no GeoJSON shapes). The frontend stores static boundary data and combines it with these values.

**Key Design Principle**: Backend returns data, frontend renders shapes.

---

## Base URL

All endpoints are prefixed with `/api/visualizations`

---

## Endpoints

### 1. GET `/api/visualizations/donations-map`

Get aggregated donation data by state for choropleth map visualization.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `politician_ids` | `int[]` | No | Filter by politician IDs (array) |
| `category` | `string` | No | Filter by donor category (e.g., "Technology", "Healthcare") |
| `start_date` | `date` (ISO8601) | No | Filter donations from this date onwards |
| `end_date` | `date` (ISO8601) | No | Filter donations up to this date |
| `aggregation_level` | `string` | No | Aggregation level (default: "state", only "state" supported) |

#### Example Request

```bash
GET /api/visualizations/donations-map?category=Technology&start_date=2023-01-01&end_date=2024-12-31
```

#### Response Format

```json
{
  "level": "state",
  "values": {
    "CA": {
      "total_amount": 323000.0,
      "donation_count": 8,
      "avg_amount": 40375.0,
      "top_donor_category": "Technology",
      "top_category_amount": 280000.0,
      "citations": [
        {
          "source_id": 1,
          "source_url": "https://demo.civiclens.org/donations/opensecrets-2024",
          "title": "OpenSecrets Campaign Finance Data 2024",
          "publisher": "CivicLens Demo",
          "retrieved_at": "2024-01-01T00:00:00"
        }
      ],
      "top_politicians": [
        {
          "politician_id": 2,
          "name": "Kamala Harris",
          "total_amount": 200000.0
        }
      ],
      "top_donors": [
        {
          "donor_name": "Google PAC",
          "total_amount": 40000.0,
          "donation_count": 1
        }
      ]
    },
    "NY": { ... }
  },
  "metadata": {
    "date_range": {
      "start": "2022-01-01",
      "end": "2024-12-31"
    },
    "citation_count": 45,
    "total_states": 10,
    "filters": {
      "politician_ids": null,
      "category": "Technology",
      "start_date": "2023-01-01",
      "end_date": "2024-12-31"
    }
  }
}
```

#### Response Schema

- `level`: Always "state" for MVP
- `values`: Object keyed by state code (e.g., "CA", "NY")
  - Each state has:
    - `total_amount`: Total donation amount
    - `donation_count`: Number of donations
    - `avg_amount`: Average donation amount
    - `top_donor_category`: Most common donor category
    - `top_category_amount`: Total for top category
    - `citations`: Top 3 sources (evidence bundle)
    - `top_politicians`: Top 3 politicians by donation amount
    - `top_donors`: Top 3 donors by donation amount
- `metadata`: Summary information

---

### 2. GET `/api/visualizations/politician-timeline/{politician_id}`

Get timeline events (votes, donations, statements) for a politician.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `politician_id` | `int` | Yes | ID of the politician |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | `date` (ISO8601) | No | Filter events from this date onwards |
| `end_date` | `date` (ISO8601) | No | Filter events up to this date |
| `event_types` | `string[]` | No | Filter by event types: "vote", "donation", "statement" |

#### Example Request

```bash
GET /api/visualizations/politician-timeline/1?start_date=2023-01-01&event_types=vote&event_types=donation
```

#### Response Format

```json
{
  "events": [
    {
      "id": "vote-123",
      "type": "vote",
      "date": "2024-03-15",
      "title": "HR 1234 - Healthcare Reform Act",
      "outcome": "yes",
      "citations": [
        {
          "source_id": 5,
          "source_url": "https://demo.civiclens.org/votes/joe-biden",
          "title": "Demo data for Joe Biden - vote",
          "publisher": "CivicLens Demo",
          "retrieved_at": "2024-03-15T00:00:00"
        }
      ],
      "citation_count": 1
    },
    {
      "id": "donation-45",
      "type": "donation",
      "date": "2024-01-15",
      "title": "Blue Cross Blue Shield PAC - $25,000 (Healthcare)",
      "outcome": null,
      "citations": [...],
      "citation_count": 1
    },
    {
      "id": "statement-12",
      "type": "statement",
      "date": "2024-02-20",
      "title": "We need to build back better",
      "outcome": null,
      "citations": [...],
      "citation_count": 1
    }
  ],
  "clusters": []
}
```

#### Response Schema

- `events`: Array of timeline events, sorted by date (most recent first)
  - Each event has:
    - `id`: Unique identifier (e.g., "vote-123")
    - `type`: Event type ("vote", "donation", "statement")
    - `date`: Event date (ISO8601 string)
    - `title`: Display title
    - `outcome`: Vote outcome (for votes), null otherwise
    - `citations`: Top 1-3 strongest citations
    - `citation_count`: Total number of citations
- `clusters`: Optional event clusters (for future implementation)

---

### 3. GET `/api/visualizations/network-graph`

Get network graph data (nodes and edges) for relationship visualization.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `politician_ids` | `int[]` | No | Filter to specific politicians |
| `include_indirect` | `boolean` | No | Include indirect donor-bill relationships via category alignment (default: false) |

#### Example Request

```bash
GET /api/visualizations/network-graph?politician_ids=1&politician_ids=2&include_indirect=false
```

#### Response Format

```json
{
  "nodes": [
    {
      "id": "politician-1",
      "label": "Joe Biden",
      "type": "politician",
      "metadata": {
        "politician_id": 1
      }
    },
    {
      "id": "donor-Google PAC",
      "label": "Google PAC",
      "type": "donor",
      "metadata": {
        "category": "Technology"
      }
    },
    {
      "id": "bill-5",
      "label": "HR 1234",
      "type": "bill",
      "metadata": {
        "bill_id": 5,
        "title": "Healthcare Reform Act"
      }
    }
  ],
  "edges": [
    {
      "source": "donor-Google PAC",
      "target": "politician-2",
      "weight": 40000.0,
      "type": "donation",
      "metadata": {
        "category": "Technology",
        "donation_count": 1
      }
    },
    {
      "source": "politician-1",
      "target": "bill-5",
      "weight": 1.0,
      "type": "vote",
      "metadata": {
        "vote_count": 1
      }
    }
  ]
}
```

#### Response Schema

- `nodes`: Array of graph nodes
  - `id`: Unique node identifier
  - `label`: Display label
  - `type`: Node type ("politician", "donor", "bill")
  - `metadata`: Additional node data
- `edges`: Array of graph edges
  - `source`: Source node ID
  - `target`: Target node ID
  - `weight`: Edge weight (donation amount, vote count, etc.)
  - `type`: Edge type ("donation", "vote", "indirect")
  - `metadata`: Additional edge data

**Note**: If `include_indirect=true`, edges of type "indirect" are included. These represent donor-bill relationships inferred from category alignment.

---

### 4. GET `/api/visualizations/politician-radial/{politician_id}`

Get donation data aggregated by category for a politician (for radial/pie chart).

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `politician_id` | `int` | Yes | ID of the politician |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | `date` (ISO8601) | No | Filter donations from this date onwards |
| `end_date` | `date` (ISO8601) | No | Filter donations up to this date |

#### Example Request

```bash
GET /api/visualizations/politician-radial/2?start_date=2023-01-01
```

#### Response Format

```json
{
  "categories": [
    {
      "category": "Technology",
      "total_amount": 75000.0,
      "donation_count": 2,
      "avg_amount": 37500.0,
      "citations": [
        {
          "source_id": 1,
          "source_url": "https://demo.civiclens.org/donations/opensecrets-2023",
          "title": "OpenSecrets Campaign Finance Data 2023",
          "publisher": "CivicLens Demo",
          "retrieved_at": "2023-06-15T00:00:00"
        }
      ]
    },
    {
      "category": "Healthcare",
      "total_amount": 28000.0,
      "donation_count": 1,
      "avg_amount": 28000.0,
      "citations": [...]
    }
  ],
  "total_amount": 103000.0,
  "total_count": 3
}
```

#### Response Schema

- `categories`: Array of donation categories, sorted by total amount (descending)
  - Each category has:
    - `category`: Category name
    - `total_amount`: Total donation amount for this category
    - `donation_count`: Number of donations in this category
    - `avg_amount`: Average donation amount
    - `citations`: Top 1-3 strongest citations
- `total_amount`: Total donation amount across all categories
- `total_count`: Total number of donations across all categories

---

## Error Responses

All endpoints may return standard HTTP error codes:

- **400 Bad Request**: Invalid parameters (e.g., unsupported aggregation_level)
- **404 Not Found**: Politician not found (for timeline/radial endpoints)
- **500 Internal Server Error**: Server error

Example error response:

```json
{
  "detail": "Politician 999 not found"
}
```

---

## Usage Notes

### Performance

- All endpoints use SQL aggregation for performance
- Consider adding materialized views for large datasets
- Consider Redis caching for frequently accessed aggregations

### Filtering

- Multiple filters can be combined (AND logic)
- Empty result sets return empty arrays/objects, not errors
- Date filters are inclusive (>= start_date, <= end_date)

### Citations

- Citations are limited to top 1-3 per aggregation unit
- More citations are available but not included to keep responses manageable
- Frontend can fetch full citation lists if needed

---

## Example Frontend Integration

### Donations Map

```typescript
// Fetch data
const response = await fetch('/api/visualizations/donations-map?category=Technology');
const data = await response.json();

// Load boundaries
const states = await fetch('/data/us-states.json').then(r => r.json());

// Combine data with boundaries
states.features.forEach(feature => {
  const stateCode = feature.properties.STATE_CODE;
  const donationData = data.values[stateCode];
  if (donationData) {
    feature.properties.donationAmount = donationData.total_amount;
    feature.properties.donationCount = donationData.donation_count;
  }
});

// Render with Leaflet
<GeoJSON data={states} style={getStyle} />
```

### Timeline

```typescript
const response = await fetch('/api/visualizations/politician-timeline/1?event_types=vote');
const { events } = await response.json();

// Render with ECharts timeline
const timelineData = events.map(e => ({
  date: e.date,
  type: e.type,
  title: e.title,
  value: e.outcome === 'yes' ? 1 : -1
}));
```

---

## Related Documentation

- Aggregation Query Examples: `/docs/aggregation_examples.md`
- Database Schema: `/docs/schema.md`
- Main Plan: `/guide/interactive_visual_analytics.md`

