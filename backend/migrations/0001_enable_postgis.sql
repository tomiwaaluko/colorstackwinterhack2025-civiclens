-- Migration: Enable PostGIS Extension
-- Description: Enables PostGIS extension for geospatial queries in Supabase
-- This is required for geographic visualizations (choropleth maps, etc.)

-- Enable PostGIS extension
-- Note: In Supabase, PostGIS is usually already enabled, but this ensures it's available
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS installation
-- You can run this query to verify: SELECT PostGIS_version();

-- Note: If you need additional PostGIS extensions, you can add them here:
-- CREATE EXTENSION IF NOT EXISTS postgis_topology;
-- CREATE EXTENSION IF NOT EXISTS postgis_raster;

