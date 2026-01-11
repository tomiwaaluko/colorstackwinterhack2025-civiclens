# Map Boundary Data

This directory contains static geographic boundary data for map visualizations.

## Files

- `us-states.json` - US state boundaries in GeoJSON format with 2-letter state codes

## State Code Format

All features in the GeoJSON file use the `STATE_CODE` property with 2-letter USPS codes:
- `CA` for California
- `NY` for New York
- `TX` for Texas
- etc.

This matches the `state_code` field in the database.

## Usage

### In React/Next.js:

```tsx
import { useEffect, useState } from 'react';

function MapComponent() {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    fetch('/data/us-states.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Error loading boundaries:', err));
  }, []);

  // Use with Leaflet
  return geoData ? <GeoJSON data={geoData} /> : null;
}
```

### With Leaflet:

```tsx
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function ChoroplethMap({ donationData }) {
  const [states, setStates] = useState(null);

  useEffect(() => {
    fetch('/data/us-states.json')
      .then(res => res.json())
      .then(setStates);
  }, []);

  const getStyle = (feature) => {
    const stateCode = feature.properties.STATE_CODE;
    const donationAmount = donationData[stateCode]?.total_amount || 0;
    
    return {
      fillColor: getColor(donationAmount),
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  return (
    <MapContainer center={[39.8283, -98.5795]} zoom={4}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {states && (
        <GeoJSON
          data={states}
          style={getStyle}
          onEachFeature={(feature, layer) => {
            const stateCode = feature.properties.STATE_CODE;
            layer.bindPopup(`${stateCode}: $${donationData[stateCode]?.total_amount || 0}`);
          }}
        />
      )}
    </MapContainer>
  );
}
```

## Downloading/Updating Data

To download or update the state boundaries:

```bash
cd frontend
node scripts/download-state-boundaries.js
```

Or manually download from:
- US Census Bureau: https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html
- Natural Earth: https://www.naturalearthdata.com/

## File Size

- Target: < 2MB for GeoJSON
- Current: Check file size after download
- If too large, consider using TopoJSON (smaller) or simplified geometries

## Verification

To verify state codes match your database:

```sql
-- Check state codes in database
SELECT DISTINCT state_code FROM politicians WHERE state_code IS NOT NULL;

-- Should match STATE_CODE values in us-states.json
```

