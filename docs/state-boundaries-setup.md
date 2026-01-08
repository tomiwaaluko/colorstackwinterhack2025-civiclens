# State Boundaries Setup Guide

This guide explains how to set up US state boundary data for choropleth map visualizations.

## Overview

The frontend needs static GeoJSON/TopoJSON files containing US state boundaries to render choropleth maps. The boundaries are stored client-side, while the backend only returns data values (not GeoJSON shapes).

## File Location

- **Path**: `/frontend/public/data/us-states.json`
- **Format**: GeoJSON (or TopoJSON for smaller size)
- **Property**: Each feature should have `STATE_CODE` with 2-letter USPS codes

## Downloading State Boundaries

### Option 1: Automated Script (Recommended)

```bash
cd frontend
node scripts/download-state-boundaries.js
```

This script:
- Downloads a standard US states GeoJSON file
- Processes it to ensure 2-letter state codes
- Saves to `public/data/us-states.json`

### Option 2: Manual Download

1. **US Census Bureau** (Recommended):
   - Visit: https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html
   - Download: "Cartographic Boundary Files - States"
   - Convert shapefile to GeoJSON using a tool like:
     - QGIS
     - Mapshaper (https://mapshaper.org/)
     - ogr2ogr (GDAL)

2. **Natural Earth Data**:
   - Visit: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/
   - Download: "Admin 1 - States, Provinces"
   - Already in GeoJSON format

3. **Public GeoJSON Repositories**:
   - GitHub: Search for "us-states geojson"
   - Ensure the file uses 2-letter state codes

### Option 3: Using npm Package

```bash
npm install --save-dev us-atlas
```

Then extract GeoJSON:
```javascript
const { feature } = require('topojson-client');
const us = require('us-atlas/us/10m.json');
const states = feature(us, us.objects.states);
// Save states to public/data/us-states.json
```

## State Code Mapping

The GeoJSON file must use 2-letter USPS state codes that match your database:

| State Name | Code |
|------------|------|
| California | CA |
| New York | NY |
| Texas | TX |
| ... | ... |

Each feature in the GeoJSON should have:
```json
{
  "type": "Feature",
  "properties": {
    "STATE_CODE": "CA",
    "NAME": "California"
  },
  "geometry": { ... }
}
```

## Verification

### 1. Check File Exists

```bash
ls -lh frontend/public/data/us-states.json
```

### 2. Verify State Codes

```javascript
// In browser console or Node.js
const data = require('./public/data/us-states.json');
const codes = data.features.map(f => f.properties.STATE_CODE);
console.log('State codes:', codes.sort());
```

### 3. Match with Database

```sql
-- Get state codes from database
SELECT DISTINCT state_code 
FROM politicians 
WHERE state_code IS NOT NULL
ORDER BY state_code;

-- Should match codes in us-states.json
```

### 4. Test Loading in Component

```tsx
useEffect(() => {
  fetch('/data/us-states.json')
    .then(res => res.json())
    .then(data => {
      console.log('Loaded', data.features.length, 'states');
      console.log('Sample:', data.features[0].properties);
    });
}, []);
```

## File Size Optimization

If the GeoJSON file is too large (> 2MB):

1. **Simplify geometries**:
   ```bash
   # Using mapshaper (install via npm)
   npx mapshaper us-states.json -simplify 10% -o us-states-simplified.json
   ```

2. **Use TopoJSON** (smaller, but needs conversion):
   ```bash
   npx topojson -o us-states.topojson us-states.json
   ```

3. **Remove unnecessary properties**:
   ```javascript
   // Keep only STATE_CODE and NAME
   features.forEach(f => {
     f.properties = {
       STATE_CODE: f.properties.STATE_CODE,
       NAME: f.properties.NAME
     };
   });
   ```

## Integration with Leaflet

```tsx
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

export function DonationsMap({ donationData }) {
  const [states, setStates] = useState(null);

  useEffect(() => {
    fetch('/data/us-states.json')
      .then(res => res.json())
      .then(setStates);
  }, []);

  const getColor = (amount) => {
    // Color scale based on donation amount
    if (amount > 1000000) return '#08306b';
    if (amount > 500000) return '#2171b5';
    if (amount > 100000) return '#6baed6';
    if (amount > 50000) return '#c6dbef';
    return '#deebf7';
  };

  const style = (feature) => {
    const code = feature.properties.STATE_CODE;
    const amount = donationData[code]?.total_amount || 0;
    return {
      fillColor: getColor(amount),
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  return (
    <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ height: '600px' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {states && (
        <GeoJSON
          data={states}
          style={style}
          onEachFeature={(feature, layer) => {
            const code = feature.properties.STATE_CODE;
            const data = donationData[code];
            layer.bindPopup(`
              <strong>${feature.properties.NAME}</strong><br/>
              Total: $${data?.total_amount?.toLocaleString() || 0}<br/>
              Count: ${data?.donation_count || 0}
            `);
          }}
        />
      )}
    </MapContainer>
  );
}
```

## Troubleshooting

### File Not Loading

- Check file is in `public/data/` (not `src/`)
- Verify file name matches exactly: `us-states.json`
- Check browser console for 404 errors

### State Codes Don't Match

- Verify GeoJSON uses `STATE_CODE` property
- Check codes are 2-letter (not FIPS codes)
- Run verification script to compare with database

### File Too Large

- Simplify geometries (reduce detail)
- Use TopoJSON format
- Remove unnecessary properties

## Next Steps

After setting up boundaries:
1. Create choropleth map component
2. Connect to backend aggregation endpoint
3. Style based on donation amounts
4. Add interactivity (hover, click, tooltips)

