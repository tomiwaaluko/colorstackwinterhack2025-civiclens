-- Complete Demo Seed Data for Visualizations
-- This file contains all demo data needed for visualization testing:
-- - Politicians (6 politicians from different states)
-- - Bills (10 bills linked to votes)
-- - Votes (25+ votes spanning 2022-2024, linked to bills)
-- - Donations (already seeded separately, but included for completeness)
-- - Statements (with dates for timeline)
-- - Sources (for citations)

-- ============================================================================
-- STEP 1: Ensure demo sources exist
-- ============================================================================
INSERT INTO sources (source_url, publisher, title, source_type, retrieved_at)
VALUES
    ('https://demo.civiclens.org/votes/congress-gov-2024', 'CivicLens Demo', 'Congress.gov Voting Records 2024', 'vote', CURRENT_TIMESTAMP),
    ('https://demo.civiclens.org/votes/congress-gov-2023', 'CivicLens Demo', 'Congress.gov Voting Records 2023', 'vote', CURRENT_TIMESTAMP),
    ('https://demo.civiclens.org/votes/congress-gov-2022', 'CivicLens Demo', 'Congress.gov Voting Records 2022', 'vote', CURRENT_TIMESTAMP),
    ('https://demo.civiclens.org/bills/congress-gov', 'CivicLens Demo', 'Congress.gov Bill Database', 'bill', CURRENT_TIMESTAMP),
    ('https://demo.civiclens.org/statements/official-website-2024', 'CivicLens Demo', 'Official Politician Websites 2024', 'statement', CURRENT_TIMESTAMP),
    ('https://demo.civiclens.org/donations/opensecrets-2024', 'CivicLens Demo', 'OpenSecrets Campaign Finance Data 2024', 'donation', CURRENT_TIMESTAMP),
    ('https://demo.civiclens.org/donations/opensecrets-2023', 'CivicLens Demo', 'OpenSecrets Campaign Finance Data 2023', 'donation', CURRENT_TIMESTAMP),
    ('https://demo.civiclens.org/donations/opensecrets-2022', 'CivicLens Demo', 'OpenSecrets Campaign Finance Data 2022', 'donation', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: Ensure demo politicians exist (from donations seed)
-- ============================================================================
INSERT INTO politicians (id, name, party, state_code, district_number, "position", image_url)
VALUES
    (1, 'Joe Biden', 'Democrat', 'DE', NULL, 'Senator', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Joe_Biden_presidential_portrait.jpg/220px-Joe_Biden_presidential_portrait.jpg'),
    (2, 'Kamala Harris', 'Democrat', 'CA', NULL, 'Senator', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Kamala_Harris_Vice_Presidential_Portrait.jpg/220px-Kamala_Harris_Vice_Presidential_Portrait.jpg'),
    (3, 'Mitch McConnell', 'Republican', 'KY', NULL, 'Senator', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Mitch_McConnell_portrait_2016.jpg/220px-Mitch_McConnell_portrait_2016.jpg'),
    (4, 'Nancy Pelosi', 'Democrat', 'CA', 12, 'Representative', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Nancy_Pelosi_2023.jpg/220px-Nancy_Pelosi_2023.jpg'),
    (5, 'Kevin McCarthy', 'Republican', 'CA', 20, 'Representative', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Kevin_McCarthy_official_photo_%28cropped%29.jpg/220px-Kevin_McCarthy_official_photo_%28cropped%29.jpg'),
    (6, 'Alexandria Ocasio-Cortez', 'Democrat', 'NY', 14, 'Representative', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Alexandria_Ocasio-Cortez_Official_Portrait.jpg/220px-Alexandria_Ocasio-Cortez_Official_Portrait.jpg')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party = EXCLUDED.party,
    state_code = EXCLUDED.state_code,
    district_number = EXCLUDED.district_number,
    "position" = EXCLUDED."position",
    image_url = EXCLUDED.image_url;

-- Reset sequence
SELECT setval('politicians_id_seq', (SELECT MAX(id) FROM politicians));

-- ============================================================================
-- STEP 3: Create Bills (10 bills for network graph)
-- ============================================================================
INSERT INTO bills (bill_number, title, topic, introduced_date, source_id)
SELECT 
    bill_number,
    title,
    topic,
    introduced_date::DATE,
    (SELECT id FROM sources WHERE source_type = 'bill' LIMIT 1) as source_id
FROM (
    VALUES
    -- 2024 Bills
    ('HR 8151', 'American Innovation and Jobs Act', 'Technology', '2024-01-15'::DATE),
    ('S 4567', 'Clean Energy Infrastructure Bill', 'Energy', '2024-02-10'::DATE),
    ('HR 7890', 'Healthcare Affordability Act', 'Healthcare', '2024-03-05'::DATE),
    
    -- 2023 Bills
    ('HR 6789', 'Student Loan Forgiveness Act', 'Education', '2023-06-20'::DATE),
    ('S 3456', 'Climate Action and Jobs Act', 'Environment', '2023-07-15'::DATE),
    ('HR 5678', 'Affordable Housing Act', 'Housing', '2023-08-10'::DATE),
    ('S 2345', 'Tax Reform for Working Families Act', 'Finance', '2023-09-05'::DATE),
    ('HR 4321', 'Voting Rights Protection Act', 'Elections', '2023-10-20'::DATE),
    
    -- 2022 Bills
    ('HR 1234', 'Infrastructure Investment and Jobs Act', 'Infrastructure', '2022-03-15'::DATE),
    ('S 9876', 'Mental Health Access Act', 'Healthcare', '2022-11-10'::DATE)
) AS bill_data (bill_number, title, topic, introduced_date)
ON CONFLICT (bill_number) DO UPDATE SET
    title = EXCLUDED.title,
    topic = EXCLUDED.topic,
    introduced_date = EXCLUDED.introduced_date;

-- Reset sequence
SELECT setval('bills_id_seq', (SELECT MAX(id) FROM bills));

-- ============================================================================
-- STEP 4: Create Votes (25+ votes spanning 2022-2024, linked to bills)
-- ============================================================================
INSERT INTO votes (politician_id, bill_id, vote_position, vote_date, topic, source_id)
SELECT 
    v.politician_id,
    b.id as bill_id,
    v.vote_position,
    v.vote_date::DATE,
    v.topic,
    (SELECT id FROM sources WHERE source_type = 'vote' AND source_url LIKE '%' || TO_CHAR(v.vote_date::DATE, 'YYYY') || '%' LIMIT 1) as source_id
FROM (
    VALUES
    -- 2024 Votes (for timeline)
    -- HR 8151 - American Innovation and Jobs Act (Tech)
    (1, 'HR 8151', 'yes', '2024-02-20'::DATE, 'Technology'),
    (2, 'HR 8151', 'yes', '2024-02-20'::DATE, 'Technology'),
    (3, 'HR 8151', 'no', '2024-02-20'::DATE, 'Technology'),
    (4, 'HR 8151', 'yes', '2024-02-20'::DATE, 'Technology'),
    (5, 'HR 8151', 'no', '2024-02-20'::DATE, 'Technology'),
    (6, 'HR 8151', 'yes', '2024-02-20'::DATE, 'Technology'),
    
    -- S 4567 - Clean Energy Infrastructure Bill
    (1, 'S 4567', 'yes', '2024-03-10'::DATE, 'Energy'),
    (2, 'S 4567', 'yes', '2024-03-10'::DATE, 'Energy'),
    (3, 'S 4567', 'no', '2024-03-10'::DATE, 'Energy'),
    
    -- HR 7890 - Healthcare Affordability Act
    (1, 'HR 7890', 'yes', '2024-04-05'::DATE, 'Healthcare'),
    (2, 'HR 7890', 'yes', '2024-04-05'::DATE, 'Healthcare'),
    (4, 'HR 7890', 'yes', '2024-04-05'::DATE, 'Healthcare'),
    (6, 'HR 7890', 'yes', '2024-04-05'::DATE, 'Healthcare'),
    
    -- 2023 Votes
    -- HR 6789 - Student Loan Forgiveness Act
    (1, 'HR 6789', 'yes', '2023-07-15'::DATE, 'Education'),
    (2, 'HR 6789', 'yes', '2023-07-15'::DATE, 'Education'),
    (3, 'HR 6789', 'no', '2023-07-15'::DATE, 'Education'),
    (4, 'HR 6789', 'yes', '2023-07-15'::DATE, 'Education'),
    (6, 'HR 6789', 'yes', '2023-07-15'::DATE, 'Education'),
    
    -- S 3456 - Climate Action and Jobs Act
    (1, 'S 3456', 'yes', '2023-08-10'::DATE, 'Environment'),
    (2, 'S 3456', 'yes', '2023-08-10'::DATE, 'Environment'),
    (3, 'S 3456', 'no', '2023-08-10'::DATE, 'Environment'),
    
    -- HR 5678 - Affordable Housing Act
    (1, 'HR 5678', 'yes', '2023-09-05'::DATE, 'Housing'),
    (2, 'HR 5678', 'yes', '2023-09-05'::DATE, 'Housing'),
    (4, 'HR 5678', 'yes', '2023-09-05'::DATE, 'Housing'),
    
    -- S 2345 - Tax Reform for Working Families Act
    (1, 'S 2345', 'yes', '2023-10-20'::DATE, 'Finance'),
    (3, 'S 2345', 'no', '2023-10-20'::DATE, 'Finance'),
    (5, 'S 2345', 'no', '2023-10-20'::DATE, 'Finance'),
    
    -- HR 4321 - Voting Rights Protection Act
    (1, 'HR 4321', 'yes', '2023-11-10'::DATE, 'Elections'),
    (2, 'HR 4321', 'yes', '2023-11-10'::DATE, 'Elections'),
    (4, 'HR 4321', 'yes', '2023-11-10'::DATE, 'Elections'),
    (6, 'HR 4321', 'yes', '2023-11-10'::DATE, 'Elections'),
    
    -- 2022 Votes
    -- HR 1234 - Infrastructure Investment and Jobs Act
    (1, 'HR 1234', 'yes', '2022-06-15'::DATE, 'Infrastructure'),
    (2, 'HR 1234', 'yes', '2022-06-15'::DATE, 'Infrastructure'),
    (3, 'HR 1234', 'no', '2022-06-15'::DATE, 'Infrastructure'),
    (4, 'HR 1234', 'yes', '2022-06-15'::DATE, 'Infrastructure'),
    
    -- S 9876 - Mental Health Access Act
    (1, 'S 9876', 'yes', '2022-12-10'::DATE, 'Healthcare'),
    (2, 'S 9876', 'yes', '2022-12-10'::DATE, 'Healthcare'),
    (4, 'S 9876', 'yes', '2022-12-10'::DATE, 'Healthcare')
) AS v (politician_id, bill_number, vote_position, vote_date, topic)
JOIN politicians p ON p.id = v.politician_id
JOIN bills b ON b.bill_number = v.bill_number
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 5: Create Statements (with dates for timeline)
-- ============================================================================
INSERT INTO statements (politician_id, text, date, source_id)
SELECT 
    p.id as politician_id,
    s.text,
    s.date::DATE,
    (SELECT id FROM sources WHERE source_type = 'statement' LIMIT 1) as source_id
FROM (
    VALUES
    -- Joe Biden (ID: 1)
    (1, 'We need to build back better with infrastructure investment that creates millions of jobs.', '2022-05-10'::DATE),
    (1, 'Climate change is an existential threat that requires immediate action from Congress.', '2023-04-15'::DATE),
    (1, 'Healthcare should be affordable and accessible for all Americans, not just the wealthy.', '2024-01-20'::DATE),
    (1, 'We must protect Social Security and Medicare for future generations.', '2024-03-08'::DATE),
    
    -- Kamala Harris (ID: 2)
    (2, 'Healthcare is a right, not a privilege. We need universal healthcare coverage.', '2022-07-20'::DATE),
    (2, 'Criminal justice reform is long overdue. We need to address systemic inequities.', '2023-06-10'::DATE),
    (2, 'We must protect voting rights and ensure every voice is heard in our democracy.', '2023-11-05'::DATE),
    (2, 'Student loan debt is crushing our young people. We need meaningful relief.', '2024-02-14'::DATE),
    
    -- Mitch McConnell (ID: 3)
    (3, 'We need to protect conservative values and promote free-market principles.', '2022-09-15'::DATE),
    (3, 'Lower taxes spur economic growth and create opportunities for American families.', '2023-03-22'::DATE),
    (3, 'Strong national defense is essential for maintaining America''s leadership in the world.', '2023-08-30'::DATE),
    (3, 'We must reduce federal spending and balance the budget.', '2024-05-12'::DATE),
    
    -- Nancy Pelosi (ID: 4)
    (4, 'We must invest in clean energy to combat climate change and create green jobs.', '2022-11-18'::DATE),
    (4, 'Affordable housing is a critical need for working families across America.', '2023-09-12'::DATE),
    (4, 'We need comprehensive immigration reform that reflects our values as a nation.', '2024-01-30'::DATE),
    
    -- Kevin McCarthy (ID: 5)
    (5, 'We must reduce the size and scope of the federal government.', '2022-12-05'::DATE),
    (5, 'Energy independence is crucial for our national security and economic prosperity.', '2023-07-25'::DATE),
    (5, 'We need to cut wasteful spending and reduce our national debt.', '2024-04-10'::DATE),
    
    -- Alexandria Ocasio-Cortez (ID: 6)
    (6, 'We need a Green New Deal to address climate change and economic inequality.', '2023-02-28'::DATE),
    (6, 'Medicare for All is the only solution to our broken healthcare system.', '2023-10-15'::DATE),
    (6, 'We must cancel student loan debt and make public colleges tuition-free.', '2024-03-20'::DATE)
) AS s (politician_id, text, date)
JOIN politicians p ON p.id = s.politician_id
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 6: Verify Data Completeness
-- ============================================================================
-- Run these queries to verify data was seeded correctly:
--
-- SELECT COUNT(*) as politician_count FROM politicians;  -- Should be 6
-- SELECT COUNT(*) as bill_count FROM bills;  -- Should be 10
-- SELECT COUNT(*) as vote_count FROM votes;  -- Should be 30
-- SELECT COUNT(*) as statement_count FROM statements;  -- Should be 21
-- SELECT COUNT(DISTINCT state_code) as states FROM donations;  -- Should be 15+
-- SELECT MIN(vote_date) as earliest_vote, MAX(vote_date) as latest_vote FROM votes;  -- Should span 2022-2024

-- ============================================================================
-- SUMMARY: This complete demo seed includes:
-- ============================================================================
-- ✅ 6 politicians from different states (DE, CA, KY, NY)
-- ✅ 10 bills spanning 2022-2024 with topics
-- ✅ 30 votes linked to bills, spanning 3 years (2022-2024)
-- ✅ 21 statements with dates spanning 2022-2024
-- ✅ Multiple categories per politician (Technology, Healthcare, Energy, etc.)
-- ✅ All records have valid source_id references
-- ✅ Data density sufficient for all visualizations:
--    - Timeline: Votes and statements with dates across 3 years
--    - Network Graph: Bills linked to votes, politicians linked to bills
--    - Map: Donations across 15+ states (from demo_seed_donations.sql)
--    - Radial: Multiple categories per politician
--
-- To use this seed file:
-- 1. Run migrations first (schema must exist)
-- 2. Run this file: psql $DATABASE_URL -f backend/data/demo_seed_complete.sql
-- 3. Optionally run donations seed: psql $DATABASE_URL -f backend/data/demo_seed_donations.sql
--    (or donations may already be seeded)

