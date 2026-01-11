# CivicLens Database Population & Geolocation Guide

## Overview

This guide explains how to populate the CivicLens database with politician data and enable geolocation features for map-based queries.

## What I've Set Up

### 1. Geolocation Support
I've created a migration ([0005_add_geolocation.sql](app/data/0005_add_geolocation.sql)) that adds:

**New Columns to `politicians` table:**
- `latitude` & `longitude` - Simple coordinate storage (indexed for fast queries)
- `office_address`, `office_city`, `office_state`, `office_zip`, `office_phone` - Office location details
- `geom` - PostGIS geometry column for advanced spatial queries (if PostGIS is enabled)

**New `state_capitals` table:**
- Contains all 50 US state capitals with coordinates
- Used as default locations for politicians when specific addresses aren't available
- Politicians are automatically assigned to their state capital coordinates

**Spatial Query Functions:**
```sql
-- Find politicians within radius of a point (in miles)
SELECT * FROM find_politicians_near_point(40.7128, -74.0060, 50);

-- Find politicians in a bounding box (for map viewport)
SELECT * FROM find_politicians_in_bbox(40.0, -75.0, 41.0, -73.0);

-- Get all politicians for a state
SELECT * FROM find_politicians_by_state('NY');
```

### 2. Database Population Script
Created [populate_database.py](populate_database.py) that fetches data from:
**Congress.gov API**
- **OpenStates API** - State legislators for all 50 states
- **Google Civic Information API** (optional) - For geocoding addresses

## 🚀 How to Populate the Database

### Step 1: Get API Keys

You'll need API keys from these services (all FREE):

1. **Congress.gov API** (for federal legislators - RECOMMENDED)
   - Sign up at: https://api.congress.gov/sign-up/
   - Get your API key instantly via email
   - This is the official API from the Library of Congress

   **Note:** ProPublica's Congress API was discontinued in 2024. Use Congress.gov API instead.

2. **OpenStates API** (for state legislators)
   - Sign up at: https://openstates.org/accounts/signup/
   - Get your API key from: https://openstates.org/accounts/profile/

3. **Google Civic Information API** (optional, for geocoding)
   - Go to: https://console.cloud.google.com
   - Enable "Google Civic Information API"
   - Create credentials and get API key

### Step 2: Add API Keys to .env

Edit your [.env](.env) file and add:

```bash
# API Keys for Data Population
CONGRESS_GOV_API_KEY=your_congress_gov_key_here
OPENSTATES_API_KEY=your_openstates_key_here
GOOGLE_CIVIC_API_KEY=your_google_key_here  # Optional
```

### Step 3: Apply the Geolocation Migration

The migration adds geolocation support to your database:

```bash
cd backend

# Option 1: Run via Supabase dashboard
# Copy the contents of app/data/0005_add_geolocation.sql
# Paste into Supabase SQL Editor and execute

# Option 2: Run via command line (if you have direct database access)
psql $DATABASE_URL < app/data/0005_add_geolocation.sql
```

### Step 4: Run the Population Script

```bash
cd backend

# Install dependencies (if not already installed)
.venv/bin/pip install requests python-dotenv

# Populate with sample data (federal + key states)
.venv/bin/python populate_database.py

# OR populate specific datasources:

# Federal legislators only (Senators + Representatives)
.venv/bin/python populate_database.py --federal --limit 100

# Specific state legislators (e.g., New York)
.venv/bin/python populate_database.py --state NY --limit 50

# Multiple states
.venv/bin/python populate_database.py --state CA --limit 50
.venv/bin/python populate_database.py --state TX --limit 50
.venv/bin/python populate_database.py --state FL --limit 50
```

### Expected Output:

```
=== Starting Database Population ===
Loaded 51 state capitals

[1/3] Fetching Federal Legislators...
Fetching Congress members from ProPublica API (both)...
Found 100 senate members
✓ Created: Bernard Sanders (Independent) - VT
✓ Created: Elizabeth Warren (Democrat) - MA
...
Imported 100 Congress members

[2/3] Fetching State Legislators...
Fetching CA legislators from OpenStates...
Found 120 CA legislators
✓ Created: Gavin Newsom (Democrat) - CA
...

[3/3] Population Complete!

======================================================================
DATABASE SUMMARY
======================================================================
Politicians: 250
Votes: 3
Statements: 3
======================================================================
```

## 📍 Using Geolocation Features

### In Your API Endpoints

You can now query politicians by location. Here are examples you can add to your API:

**1. Find politicians near a point:**
```python
# In app/api/map.py (create this file)
@router.get("/politicians/near")
async def get_politicians_near(
    lat: float,
    lng: float,
    radius_miles: float = 50,
    db: AsyncSession = Depends(get_db)
):
    """Find politicians within radius of a point"""
    result = await db.execute(
        text("SELECT * FROM find_politicians_near_point(:lat, :lng, :radius)"),
        {"lat": lat, "lng": lng, "radius": radius_miles}
    )
    return [dict(row) for row in result.fetchall()]
```

**2. Find politicians in map viewport:**
```python
@router.get("/politicians/in-bounds")
async def get_politicians_in_bounds(
    min_lat: float,
    min_lng: float,
    max_lat: float,
    max_lng: float,
    db: AsyncSession = Depends(get_db)
):
    """Find politicians in a bounding box for map display"""
    result = await db.execute(
        text("""
            SELECT * FROM find_politicians_in_bbox(
                :min_lat, :min_lng, :max_lat, :max_lng
            )
        """),
        {
            "min_lat": min_lat,
            "min_lng": min_lng,
            "max_lat": max_lat,
            "max_lng": max_lng
        }
    )
    return [dict(row) for row in result.fetchall()]
```

**3. Get politicians by state:**
```python
@router.get("/politicians/by-state/{state_code}")
async def get_politicians_by_state(
    state_code: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all politicians for a specific state"""
    result = await db.execute(
        text("SELECT * FROM find_politicians_by_state(:state)"),
        {"state": state_code.upper()}
    )
    return [dict(row) for row in result.fetchall()]
```

### Frontend Map Integration

Your frontend can now:

1. **Display politicians as markers on a map**
   - Use `latitude` and `longitude` fields
   - Fetch politicians in viewport using `/politicians/in-bounds` endpoint

2. **Show politician popups with details**
   - Name, party, office, image
   - Click to view full profile

3. **Filter by location**
   - "Find representatives near me" feature
   - Use browser geolocation API + `/politicians/near` endpoint

## 📊 Data Sources & Coverage

### Federal Legislators
- **Source**: ProPublica Congress API
- **Coverage**: All 100 US Senators + 435 US Representatives
- **Data Includes**: Name, party, state, office, voting records
- **Updated**: Current 118th Congress

### State Legislators
- **Source**: OpenStates API
- **Coverage**: All 50 states + DC
- **Total**: ~7,400 state legislators
- **Data Includes**: Name, party, state, district, chamber, bills, votes

### Geolocation
- **Default**: State capitals (automatic)
- **Enhanced**: Office addresses (requires additional geocoding)
- **Precision**: City-level by default, street-level if addresses provided

## 🔄 Keeping Data Fresh

### Automated Updates (Future Enhancement)

You can set up a cron job to update data daily:

```bash
# Add to crontab
0 2 * * * cd /path/to/backend && .venv/bin/python populate_database.py --federal --limit 600
```

### Manual Updates

Re-run the population script anytime:
```bash
.venv/bin/python populate_database.py
```

The script automatically skips duplicates, so it's safe to run multiple times.

## 🗺️ Map Display Recommendations

### For Frontend Implementation:

1. **Use Mapbox GL JS or Leaflet**
   - Both support marker clustering for many politicians
   - Can style markers by party (red/blue/purple)

2. **Fetch Strategy**
   - Initial load: Get politicians in current viewport
   - On map pan/zoom: Fetch new politicians in new viewport
   - Cache results to avoid redundant requests

3. **Example Fetch Logic**:
```javascript
// When map moves
map.on('moveend', async () => {
    const bounds = map.getBounds();
    const politicians = await fetch(
        `/politicians/in-bounds?` +
        `min_lat=${bounds.getSouth()}&` +
        `min_lng=${bounds.getWest()}&` +
        `max_lat=${bounds.getNorth()}&` +
        `max_lng=${bounds.getEast()}`
    ).then(r => r.json());

    // Add markers to map
    politicians.forEach(pol => {
        L.marker([pol.latitude, pol.longitude])
            .bindPopup(`<b>${pol.politician_name}</b><br>${pol.party} - ${pol.office}`)
            .addTo(map);
    });
});
```

## 🐛 Troubleshooting

### Migration Errors
If you get PostGIS errors during migration, that's okay! The basic `latitude`/`longitude` columns will still work. PostGIS is optional for advanced queries.

### API Rate Limits
- ProPublica: 5,000 requests/day
- OpenStates: 5,000 requests/day (free tier)
- Spread out requests if hitting limits

### No Politicians Showing on Map
1. Check if migration ran: `SELECT latitude FROM politicians LIMIT 1;`
2. Verify data was populated: `SELECT COUNT(*) FROM politicians;`
3. Check if coordinates are set: `SELECT COUNT(*) FROM politicians WHERE latitude IS NOT NULL;`

### Prepared Statement Errors
These are expected with Supabase's pgbouncer. The application still works correctly - these are warnings about connection pooling, not actual errors.

## 📚 Next Steps

1. **Populate the database** with the script above
2. **Test the geolocation queries** in your API
3. **Build map UI** in your frontend
4. **Add more data sources**:
   - FEC API for campaign finance
   - ProPublica for voting records
   - Twitter API for statements

## 🎯 Quick Start Summary

```bash
# 1. Get API keys and add to .env
PROPUBLICA_API_KEY=xxx
OPENSTATES_API_KEY=xxx

# 2. Apply migration (via Supabase dashboard or psql)
# Copy/paste app/data/0005_add_geolocation.sql

# 3. Populate database
cd backend
.venv/bin/python populate_database.py

# 4. Test in API
curl "http://localhost:8000/politicians"

# 5. You should see politicians with latitude/longitude!
```

---

**Created by:** Claude Code Assistant
**Date:** 2026-01-11
**Database Version:** PostgreSQL 14+ with optional PostGIS
