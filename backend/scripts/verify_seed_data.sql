-- Quick verification queries for seed data
-- Run these in Supabase to verify the seed worked

-- Check politicians were inserted
SELECT COUNT(*) as politician_count FROM politicians;
SELECT id, name, state_code FROM politicians ORDER BY id;

-- Check donations were inserted
SELECT COUNT(*) as donation_count FROM donations;
SELECT COUNT(DISTINCT state_code) as states_covered FROM donations WHERE state_code IS NOT NULL;
SELECT COUNT(DISTINCT donor_category) as categories FROM donations;
SELECT MIN(date) as earliest_date, MAX(date) as latest_date FROM donations;

-- Check donations by politician
SELECT 
    p.name,
    COUNT(d.id) as donation_count,
    SUM(d.amount) as total_amount
FROM politicians p
LEFT JOIN donations d ON p.id = d.politician_id
GROUP BY p.id, p.name
ORDER BY p.id;

-- Check donations by state
SELECT 
    state_code,
    COUNT(*) as donation_count,
    SUM(amount) as total_amount
FROM donations
WHERE state_code IS NOT NULL
GROUP BY state_code
ORDER BY total_amount DESC
LIMIT 10;

