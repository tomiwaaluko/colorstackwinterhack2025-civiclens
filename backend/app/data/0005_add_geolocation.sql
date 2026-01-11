-- Migration: 0005_add_geolocation.sql
-- Description: Add geolocation support for politicians and enable PostGIS for map queries
-- Requires: PostgreSQL 14+ with PostGIS extension

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- ADD GEOLOCATION COLUMNS TO POLITICIANS TABLE
-- ============================================================================

-- Add office address fields
ALTER TABLE politicians
ADD COLUMN IF NOT EXISTS office_address TEXT,
ADD COLUMN IF NOT EXISTS office_city TEXT,
ADD COLUMN IF NOT EXISTS office_state TEXT,
ADD COLUMN IF NOT EXISTS office_zip TEXT,
ADD COLUMN IF NOT EXISTS office_phone TEXT;

-- Add latitude/longitude for simple geo queries (indexed for fast lookups)
ALTER TABLE politicians
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- Add PostGIS geometry column for advanced spatial queries
ALTER TABLE politicians
ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Create spatial index on geometry column for fast geo queries
CREATE INDEX IF NOT EXISTS idx_politicians_geom ON politicians USING GIST(geom);

-- Create indexes on lat/lng for simple queries
CREATE INDEX IF NOT EXISTS idx_politicians_latitude ON politicians(latitude);
CREATE INDEX IF NOT EXISTS idx_politicians_longitude ON politicians(longitude);

-- ============================================================================
-- TRIGGER TO SYNC LAT/LNG WITH GEOMETRY COLUMN
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_politician_geolocation()
RETURNS TRIGGER AS $$
BEGIN
    -- If lat/lng are set, update the geometry column
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;

    -- If geometry is set but lat/lng are not, extract them
    IF NEW.geom IS NOT NULL AND (NEW.latitude IS NULL OR NEW.longitude IS NULL) THEN
        NEW.latitude := ST_Y(NEW.geom);
        NEW.longitude := ST_X(NEW.geom);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_politician_geolocation_trigger
    BEFORE INSERT OR UPDATE OF latitude, longitude, geom ON politicians
    FOR EACH ROW
    EXECUTE FUNCTION sync_politician_geolocation();

-- ============================================================================
-- HELPER FUNCTIONS FOR GEOLOCATION QUERIES
-- ============================================================================

-- Function to find politicians within a radius (in miles)
CREATE OR REPLACE FUNCTION find_politicians_near_point(
    lat NUMERIC,
    lng NUMERIC,
    radius_miles NUMERIC DEFAULT 50
)
RETURNS TABLE(
    politician_id UUID,
    politician_name TEXT,
    party TEXT,
    office TEXT,
    state TEXT,
    distance_miles NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.full_name,
        p.party,
        p.current_office,
        p.state,
        ROUND((ST_Distance(
            p.geom::geography,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        ) / 1609.34)::NUMERIC, 2) AS distance_miles
    FROM politicians p
    WHERE p.geom IS NOT NULL
      AND ST_DWithin(
          p.geom::geography,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          radius_miles * 1609.34  -- Convert miles to meters
      )
    ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql;

-- Function to find politicians in a bounding box (for map viewport queries)
CREATE OR REPLACE FUNCTION find_politicians_in_bbox(
    min_lat NUMERIC,
    min_lng NUMERIC,
    max_lat NUMERIC,
    max_lng NUMERIC
)
RETURNS TABLE(
    politician_id UUID,
    politician_name TEXT,
    party TEXT,
    office TEXT,
    state TEXT,
    latitude NUMERIC,
    longitude NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.full_name,
        p.party,
        p.current_office,
        p.state,
        p.latitude,
        p.longitude
    FROM politicians p
    WHERE p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      AND p.latitude BETWEEN min_lat AND max_lat
      AND p.longitude BETWEEN min_lng AND max_lng;
END;
$$ LANGUAGE plpgsql;

-- Function to get politicians by state
CREATE OR REPLACE FUNCTION find_politicians_by_state(state_code TEXT)
RETURNS TABLE(
    politician_id UUID,
    politician_name TEXT,
    party TEXT,
    office TEXT,
    district TEXT,
    latitude NUMERIC,
    longitude NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.full_name,
        p.party,
        p.current_office,
        p.state,
        p.latitude,
        p.longitude
    FROM politicians p
    WHERE UPPER(p.state) = UPPER(state_code)
       OR UPPER(p.state_code) = UPPER(state_code)
    ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STATE CAPITALS TABLE (for default politician locations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS state_capitals (
    state_code TEXT PRIMARY KEY,
    state_name TEXT NOT NULL,
    capital_city TEXT NOT NULL,
    latitude NUMERIC(10, 8) NOT NULL,
    longitude NUMERIC(11, 8) NOT NULL,
    geom geometry(Point, 4326)
);

-- Insert US state capitals with coordinates
INSERT INTO state_capitals (state_code, state_name, capital_city, latitude, longitude, geom) VALUES
('AL', 'Alabama', 'Montgomery', 32.377716, -86.300568, ST_SetSRID(ST_MakePoint(-86.300568, 32.377716), 4326)),
('AK', 'Alaska', 'Juneau', 58.301598, -134.420212, ST_SetSRID(ST_MakePoint(-134.420212, 58.301598), 4326)),
('AZ', 'Arizona', 'Phoenix', 33.448376, -112.073844, ST_SetSRID(ST_MakePoint(-112.073844, 33.448376), 4326)),
('AR', 'Arkansas', 'Little Rock', 34.746613, -92.288986, ST_SetSRID(ST_MakePoint(-92.288986, 34.746613), 4326)),
('CA', 'California', 'Sacramento', 38.576668, -121.493629, ST_SetSRID(ST_MakePoint(-121.493629, 38.576668), 4326)),
('CO', 'Colorado', 'Denver', 39.739227, -104.984856, ST_SetSRID(ST_MakePoint(-104.984856, 39.739227), 4326)),
('CT', 'Connecticut', 'Hartford', 41.764046, -72.682198, ST_SetSRID(ST_MakePoint(-72.682198, 41.764046), 4326)),
('DE', 'Delaware', 'Dover', 39.157307, -75.519722, ST_SetSRID(ST_MakePoint(-75.519722, 39.157307), 4326)),
('FL', 'Florida', 'Tallahassee', 30.438118, -84.281296, ST_SetSRID(ST_MakePoint(-84.281296, 30.438118), 4326)),
('GA', 'Georgia', 'Atlanta', 33.749027, -84.388229, ST_SetSRID(ST_MakePoint(-84.388229, 33.749027), 4326)),
('HI', 'Hawaii', 'Honolulu', 21.307442, -157.857376, ST_SetSRID(ST_MakePoint(-157.857376, 21.307442), 4326)),
('ID', 'Idaho', 'Boise', 43.617775, -116.216614, ST_SetSRID(ST_MakePoint(-116.216614, 43.617775), 4326)),
('IL', 'Illinois', 'Springfield', 39.798363, -89.654961, ST_SetSRID(ST_MakePoint(-89.654961, 39.798363), 4326)),
('IN', 'Indiana', 'Indianapolis', 39.790942, -86.147685, ST_SetSRID(ST_MakePoint(-86.147685, 39.790942), 4326)),
('IA', 'Iowa', 'Des Moines', 41.591087, -93.603729, ST_SetSRID(ST_MakePoint(-93.603729, 41.591087), 4326)),
('KS', 'Kansas', 'Topeka', 39.048110, -95.677956, ST_SetSRID(ST_MakePoint(-95.677956, 39.048110), 4326)),
('KY', 'Kentucky', 'Frankfort', 38.186722, -84.875374, ST_SetSRID(ST_MakePoint(-84.875374, 38.186722), 4326)),
('LA', 'Louisiana', 'Baton Rouge', 30.457069, -91.187393, ST_SetSRID(ST_MakePoint(-91.187393, 30.457069), 4326)),
('ME', 'Maine', 'Augusta', 44.307167, -69.781693, ST_SetSRID(ST_MakePoint(-69.781693, 44.307167), 4326)),
('MD', 'Maryland', 'Annapolis', 38.978764, -76.490936, ST_SetSRID(ST_MakePoint(-76.490936, 38.978764), 4326)),
('MA', 'Massachusetts', 'Boston', 42.358894, -71.056742, ST_SetSRID(ST_MakePoint(-71.056742, 42.358894), 4326)),
('MI', 'Michigan', 'Lansing', 42.733635, -84.555535, ST_SetSRID(ST_MakePoint(-84.555535, 42.733635), 4326)),
('MN', 'Minnesota', 'Saint Paul', 44.955097, -93.102222, ST_SetSRID(ST_MakePoint(-93.102222, 44.955097), 4326)),
('MS', 'Mississippi', 'Jackson', 32.303848, -90.182106, ST_SetSRID(ST_MakePoint(-90.182106, 32.303848), 4326)),
('MO', 'Missouri', 'Jefferson City', 38.579201, -92.172935, ST_SetSRID(ST_MakePoint(-92.172935, 38.579201), 4326)),
('MT', 'Montana', 'Helena', 46.595805, -112.027031, ST_SetSRID(ST_MakePoint(-112.027031, 46.595805), 4326)),
('NE', 'Nebraska', 'Lincoln', 40.809868, -96.675345, ST_SetSRID(ST_MakePoint(-96.675345, 40.809868), 4326)),
('NV', 'Nevada', 'Carson City', 39.163914, -119.766999, ST_SetSRID(ST_MakePoint(-119.766999, 39.163914), 4326)),
('NH', 'New Hampshire', 'Concord', 43.206898, -71.537994, ST_SetSRID(ST_MakePoint(-71.537994, 43.206898), 4326)),
('NJ', 'New Jersey', 'Trenton', 40.217875, -74.759404, ST_SetSRID(ST_MakePoint(-74.759404, 40.217875), 4326)),
('NM', 'New Mexico', 'Santa Fe', 35.682240, -105.939728, ST_SetSRID(ST_MakePoint(-105.939728, 35.682240), 4326)),
('NY', 'New York', 'Albany', 42.659829, -73.781339, ST_SetSRID(ST_MakePoint(-73.781339, 42.659829), 4326)),
('NC', 'North Carolina', 'Raleigh', 35.782169, -78.644257, ST_SetSRID(ST_MakePoint(-78.644257, 35.782169), 4326)),
('ND', 'North Dakota', 'Bismarck', 46.813343, -100.779004, ST_SetSRID(ST_MakePoint(-100.779004, 46.813343), 4326)),
('OH', 'Ohio', 'Columbus', 39.961346, -82.999069, ST_SetSRID(ST_MakePoint(-82.999069, 39.961346), 4326)),
('OK', 'Oklahoma', 'Oklahoma City', 35.492207, -97.503342, ST_SetSRID(ST_MakePoint(-97.503342, 35.492207), 4326)),
('OR', 'Oregon', 'Salem', 44.938461, -123.030403, ST_SetSRID(ST_MakePoint(-123.030403, 44.938461), 4326)),
('PA', 'Pennsylvania', 'Harrisburg', 40.264378, -76.883598, ST_SetSRID(ST_MakePoint(-76.883598, 40.264378), 4326)),
('RI', 'Rhode Island', 'Providence', 41.830914, -71.414963, ST_SetSRID(ST_MakePoint(-71.414963, 41.830914), 4326)),
('SC', 'South Carolina', 'Columbia', 34.000343, -81.032387, ST_SetSRID(ST_MakePoint(-81.032387, 34.000343), 4326)),
('SD', 'South Dakota', 'Pierre', 44.367031, -100.346405, ST_SetSRID(ST_MakePoint(-100.346405, 44.367031), 4326)),
('TN', 'Tennessee', 'Nashville', 36.165, -86.784, ST_SetSRID(ST_MakePoint(-86.784, 36.165), 4326)),
('TX', 'Texas', 'Austin', 30.27467, -97.740349, ST_SetSRID(ST_MakePoint(-97.740349, 30.27467), 4326)),
('UT', 'Utah', 'Salt Lake City', 40.777477, -111.888237, ST_SetSRID(ST_MakePoint(-111.888237, 40.777477), 4326)),
('VT', 'Vermont', 'Montpelier', 44.262619, -72.580536, ST_SetSRID(ST_MakePoint(-72.580536, 44.262619), 4326)),
('VA', 'Virginia', 'Richmond', 37.538857, -77.433640, ST_SetSRID(ST_MakePoint(-77.433640, 37.538857), 4326)),
('WA', 'Washington', 'Olympia', 47.035805, -122.905014, ST_SetSRID(ST_MakePoint(-122.905014, 47.035805), 4326)),
('WV', 'West Virginia', 'Charleston', 38.336246, -81.612328, ST_SetSRID(ST_MakePoint(-81.612328, 38.336246), 4326)),
('WI', 'Wisconsin', 'Madison', 43.074684, -89.384445, ST_SetSRID(ST_MakePoint(-89.384445, 43.074684), 4326)),
('WY', 'Wyoming', 'Cheyenne', 41.140259, -104.820236, ST_SetSRID(ST_MakePoint(-104.820236, 41.140259), 4326)),
('DC', 'District of Columbia', 'Washington', 38.907192, -77.036873, ST_SetSRID(ST_MakePoint(-77.036873, 38.907192), 4326))
ON CONFLICT (state_code) DO NOTHING;

-- ============================================================================
-- UPDATE EXISTING POLITICIANS WITH DEFAULT GEOLOCATION
-- ============================================================================

-- Set geolocation to state capital for politicians without coordinates
UPDATE politicians p
SET
    latitude = sc.latitude,
    longitude = sc.longitude,
    geom = sc.geom
FROM state_capitals sc
WHERE p.geom IS NULL
  AND (UPPER(p.state) = sc.state_code OR UPPER(p.state_code) = sc.state_code);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN politicians.office_address IS 'Street address of politician office';
COMMENT ON COLUMN politicians.latitude IS 'Latitude coordinate (WGS84)';
COMMENT ON COLUMN politicians.longitude IS 'Longitude coordinate (WGS84)';
COMMENT ON COLUMN politicians.geom IS 'PostGIS geometry point for spatial queries';

COMMENT ON FUNCTION find_politicians_near_point IS 'Find politicians within radius of a point (lat, lng, miles)';
COMMENT ON FUNCTION find_politicians_in_bbox IS 'Find politicians in a bounding box for map viewport queries';
COMMENT ON FUNCTION find_politicians_by_state IS 'Get all politicians for a specific state';

COMMENT ON TABLE state_capitals IS 'US state capitals with coordinates for default politician locations';
