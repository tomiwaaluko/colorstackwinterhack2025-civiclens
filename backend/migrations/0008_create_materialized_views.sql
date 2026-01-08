-- Step 8: Materialized Views / Precomputation
-- This migration creates materialized views for common aggregations
-- to improve performance of visualization endpoints.

-- Materialized View 1: Donations by State and Election Cycle
-- Used for donations map visualization with time filtering
CREATE MATERIALIZED VIEW IF NOT EXISTS donations_by_state_cycle AS
SELECT
    state_code,
    EXTRACT(YEAR FROM date) as election_cycle,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count,
    AVG(amount) as avg_amount,
    COUNT(DISTINCT politician_id) as politician_count,
    COUNT(DISTINCT donor_name) as donor_count
FROM donations
WHERE state_code IS NOT NULL
GROUP BY state_code, EXTRACT(YEAR FROM date);

-- Indexes on donations_by_state_cycle
CREATE INDEX IF NOT EXISTS idx_donations_by_state_cycle_state 
    ON donations_by_state_cycle(state_code);
CREATE INDEX IF NOT EXISTS idx_donations_by_state_cycle_cycle 
    ON donations_by_state_cycle(election_cycle);
CREATE INDEX IF NOT EXISTS idx_donations_by_state_cycle_state_cycle 
    ON donations_by_state_cycle(state_code, election_cycle);

-- Materialized View 2: Top Donors by Region (State + Category)
-- Used for donations map and network graph visualizations
CREATE MATERIALIZED VIEW IF NOT EXISTS top_donors_by_region AS
SELECT
    state_code,
    donor_category,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count,
    COUNT(DISTINCT politician_id) as politician_count,
    COUNT(DISTINCT donor_name) as donor_count,
    AVG(amount) as avg_amount
FROM donations
WHERE state_code IS NOT NULL
GROUP BY state_code, donor_category;

-- Indexes on top_donors_by_region
CREATE INDEX IF NOT EXISTS idx_top_donors_by_region_state 
    ON top_donors_by_region(state_code);
CREATE INDEX IF NOT EXISTS idx_top_donors_by_region_category 
    ON top_donors_by_region(donor_category);
CREATE INDEX IF NOT EXISTS idx_top_donors_by_region_state_category 
    ON top_donors_by_region(state_code, donor_category);
CREATE INDEX IF NOT EXISTS idx_top_donors_by_region_amount 
    ON top_donors_by_region(total_amount DESC);

-- Materialized View 3: Graph Edges by Politician and Category
-- Used for network graph visualization
CREATE MATERIALIZED VIEW IF NOT EXISTS graph_edges_by_politician AS
SELECT
    politician_id,
    donor_category,
    COUNT(*) as edge_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    COUNT(DISTINCT donor_name) as donor_count
FROM donations
WHERE politician_id IS NOT NULL
GROUP BY politician_id, donor_category;

-- Indexes on graph_edges_by_politician
CREATE INDEX IF NOT EXISTS idx_graph_edges_by_politician_politician 
    ON graph_edges_by_politician(politician_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_by_politician_category 
    ON graph_edges_by_politician(donor_category);
CREATE INDEX IF NOT EXISTS idx_graph_edges_by_politician_amount 
    ON graph_edges_by_politician(total_amount DESC);

-- Materialized View 4: Donations by Politician and Category (for Radial Charts)
-- Used for radial chart visualization
CREATE MATERIALIZED VIEW IF NOT EXISTS donations_by_politician_category AS
SELECT
    politician_id,
    donor_category,
    SUM(amount) as total_amount,
    COUNT(*) as donation_count,
    AVG(amount) as avg_amount,
    MIN(date) as first_donation_date,
    MAX(date) as last_donation_date
FROM donations
WHERE politician_id IS NOT NULL
GROUP BY politician_id, donor_category;

-- Indexes on donations_by_politician_category
CREATE INDEX IF NOT EXISTS idx_donations_by_politician_category_politician 
    ON donations_by_politician_category(politician_id);
CREATE INDEX IF NOT EXISTS idx_donations_by_politician_category_category 
    ON donations_by_politician_category(donor_category);
CREATE INDEX IF NOT EXISTS idx_donations_by_politician_category_amount 
    ON donations_by_politician_category(total_amount DESC);

-- Materialized View 5: Top Politicians by State
-- Used for donations map tooltips and details
CREATE MATERIALIZED VIEW IF NOT EXISTS top_politicians_by_state AS
SELECT
    d.state_code,
    p.id as politician_id,
    p.name as politician_name,
    p.party,
    SUM(d.amount) as total_amount,
    COUNT(*) as donation_count,
    AVG(d.amount) as avg_amount
FROM donations d
JOIN politicians p ON d.politician_id = p.id
WHERE d.state_code IS NOT NULL
GROUP BY d.state_code, p.id, p.name, p.party;

-- Indexes on top_politicians_by_state
CREATE INDEX IF NOT EXISTS idx_top_politicians_by_state_state 
    ON top_politicians_by_state(state_code);
CREATE INDEX IF NOT EXISTS idx_top_politicians_by_state_amount 
    ON top_politicians_by_state(total_amount DESC);
CREATE INDEX IF NOT EXISTS idx_top_politicians_by_state_politician 
    ON top_politicians_by_state(politician_id);

-- Materialized View 6: Timeline Events Summary
-- Used for timeline visualization aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_events_summary AS
SELECT
    politician_id,
    DATE_TRUNC('month', vote_date) as event_month,
    'vote' as event_type,
    COUNT(*) as event_count
FROM votes
WHERE politician_id IS NOT NULL AND vote_date IS NOT NULL
GROUP BY politician_id, DATE_TRUNC('month', vote_date)

UNION ALL

SELECT
    politician_id,
    DATE_TRUNC('month', date) as event_month,
    'donation' as event_type,
    COUNT(*) as event_count
FROM donations
WHERE politician_id IS NOT NULL AND date IS NOT NULL
GROUP BY politician_id, DATE_TRUNC('month', date)

UNION ALL

SELECT
    politician_id,
    DATE_TRUNC('month', date) as event_month,
    'statement' as event_type,
    COUNT(*) as event_count
FROM statements
WHERE politician_id IS NOT NULL AND date IS NOT NULL
GROUP BY politician_id, DATE_TRUNC('month', date);

-- Indexes on timeline_events_summary
CREATE INDEX IF NOT EXISTS idx_timeline_events_summary_politician 
    ON timeline_events_summary(politician_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_summary_month 
    ON timeline_events_summary(event_month);
CREATE INDEX IF NOT EXISTS idx_timeline_events_summary_type 
    ON timeline_events_summary(event_type);
CREATE INDEX IF NOT EXISTS idx_timeline_events_summary_politician_month 
    ON timeline_events_summary(politician_id, event_month);

-- Comments for documentation
COMMENT ON MATERIALIZED VIEW donations_by_state_cycle IS 
    'Aggregates donations by state and election cycle for map visualizations';
COMMENT ON MATERIALIZED VIEW top_donors_by_region IS 
    'Aggregates top donors by state and category for map and network visualizations';
COMMENT ON MATERIALIZED VIEW graph_edges_by_politician IS 
    'Precomputed edges for network graph visualization by politician and category';
COMMENT ON MATERIALIZED VIEW donations_by_politician_category IS 
    'Aggregates donations by politician and category for radial chart visualizations';
COMMENT ON MATERIALIZED VIEW top_politicians_by_state IS 
    'Top politicians receiving donations by state for map tooltips';
COMMENT ON MATERIALIZED VIEW timeline_events_summary IS 
    'Summary of timeline events (votes, donations, statements) by politician and month';

