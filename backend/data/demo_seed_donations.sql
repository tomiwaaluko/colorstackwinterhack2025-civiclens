-- Demo Donation Seed Data
-- This file contains donation data for visualization testing
-- Includes donations across multiple states, categories, and years

-- ============================================================================
-- STEP 1: Create demo politicians (required before donations)
-- ============================================================================
-- Insert politicians first (donations reference politician_id)
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

-- Reset the sequence to avoid ID conflicts for future inserts
SELECT setval('politicians_id_seq', (SELECT MAX(id) FROM politicians));

-- ============================================================================
-- STEP 2: Create demo sources for donations
-- ============================================================================
INSERT INTO sources (source_url, publisher, title, source_type, retrieved_at)
VALUES
    ('https://demo.civiclens.org/donations/opensecrets-2024', 'CivicLens Demo', 'OpenSecrets Campaign Finance Data 2024', 'donation', CURRENT_TIMESTAMP),
    ('https://demo.civiclens.org/donations/opensecrets-2023', 'CivicLens Demo', 'OpenSecrets Campaign Finance Data 2023', 'donation', CURRENT_TIMESTAMP),
    ('https://demo.civiclens.org/donations/opensecrets-2022', 'CivicLens Demo', 'OpenSecrets Campaign Finance Data 2022', 'donation', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Get source IDs (assuming they exist or were just created)
-- In practice, you'd get these from the database after insertion
-- For now, we'll use a subquery to get the first source

-- Demo Donation Data
-- Assumes politicians with IDs 1-6 exist (from politicians.json)
-- Joe Biden (ID: 1, DE), Kamala Harris (ID: 2, CA), Mitch McConnell (ID: 3, KY),
-- Nancy Pelosi (ID: 4, CA-12), Kevin McCarthy (ID: 5, CA-20), AOC (ID: 6, NY-14)

INSERT INTO donations (politician_id, donor_name, donor_category, amount, date, state_code, source_id)
SELECT 
    politician_id,
    donor_name,
    donor_category,
    amount,
    date::DATE,
    state_code,
    (SELECT id FROM sources WHERE source_type = 'donation' LIMIT 1) as source_id
FROM (
    VALUES
    -- Joe Biden (ID: 1, Delaware) - Healthcare, Energy donations
    (1, 'Blue Cross Blue Shield PAC', 'Healthcare', 25000.00, '2024-01-15'::DATE, 'DE', NULL),
    (1, 'Exxon Mobil PAC', 'Energy', 15000.00, '2024-02-20'::DATE, 'TX', NULL),
    (1, 'Microsoft PAC', 'Technology', 30000.00, '2024-03-10'::DATE, 'WA', NULL),
    (1, 'AFL-CIO PAC', 'Labor', 50000.00, '2024-04-05'::DATE, 'DC', NULL),
    (1, 'AT&T PAC', 'Telecommunications', 20000.00, '2024-05-12'::DATE, 'TX', NULL),
    
    -- Kamala Harris (ID: 2, California) - Tech, Healthcare donations
    (2, 'Google PAC', 'Technology', 40000.00, '2023-06-15'::DATE, 'CA', NULL),
    (2, 'Apple Inc. PAC', 'Technology', 35000.00, '2023-07-20'::DATE, 'CA', NULL),
    (2, 'Kaiser Permanente PAC', 'Healthcare', 28000.00, '2023-08-10'::DATE, 'CA', NULL),
    (2, 'Tesla Inc.', 'Energy', 25000.00, '2024-01-25'::DATE, 'CA', NULL),
    (2, 'National Association of Realtors PAC', 'Real Estate', 30000.00, '2024-02-14'::DATE, 'DC', NULL),
    
    -- Mitch McConnell (ID: 3, Kentucky) - Energy, Finance donations
    (3, 'Coal Industry PAC', 'Energy', 75000.00, '2022-09-10'::DATE, 'KY', NULL),
    (3, 'JPMorgan Chase PAC', 'Finance', 50000.00, '2022-10-15'::DATE, 'NY', NULL),
    (3, 'Citigroup PAC', 'Finance', 45000.00, '2023-03-20'::DATE, 'NY', NULL),
    (3, 'American Medical Association PAC', 'Healthcare', 30000.00, '2023-05-12'::DATE, 'IL', NULL),
    (3, 'National Rifle Association PAC', 'Interest Groups', 60000.00, '2024-06-08'::DATE, 'VA', NULL),
    
    -- Nancy Pelosi (ID: 4, California 12th) - Tech, Finance donations
    (4, 'Meta (Facebook) PAC', 'Technology', 55000.00, '2023-04-18'::DATE, 'CA', NULL),
    (4, 'Goldman Sachs PAC', 'Finance', 45000.00, '2023-05-22'::DATE, 'NY', NULL),
    (4, 'Verizon PAC', 'Telecommunications', 35000.00, '2023-09-15'::DATE, 'VA', NULL),
    (4, 'American Hospital Association PAC', 'Healthcare', 40000.00, '2024-03-10'::DATE, 'DC', NULL),
    (4, 'Amazon PAC', 'Technology', 60000.00, '2024-04-20'::DATE, 'WA', NULL),
    
    -- Kevin McCarthy (ID: 5, California 20th) - Energy, Finance donations
    (5, 'Chevron PAC', 'Energy', 70000.00, '2022-11-05'::DATE, 'CA', NULL),
    (5, 'Wells Fargo PAC', 'Finance', 50000.00, '2023-01-18'::DATE, 'CA', NULL),
    (5, 'American Bankers Association PAC', 'Finance', 45000.00, '2023-06-12'::DATE, 'DC', NULL),
    (5, 'Pharmaceutical Research PAC', 'Healthcare', 38000.00, '2023-08-25'::DATE, 'DC', NULL),
    (5, 'National Association of Home Builders PAC', 'Construction', 32000.00, '2024-02-28'::DATE, 'DC', NULL),
    
    -- Alexandria Ocasio-Cortez (ID: 6, New York 14th) - Progressive, Tech donations
    (6, 'ActBlue', 'Progressive', 25000.00, '2023-07-10'::DATE, 'MA', NULL),
    (6, 'MoveOn.org PAC', 'Progressive', 15000.00, '2023-09-20'::DATE, 'NY', NULL),
    (6, 'Sierra Club PAC', 'Environment', 20000.00, '2024-01-15'::DATE, 'CA', NULL),
    (6, 'NARAL Pro-Choice America PAC', 'Interest Groups', 18000.00, '2024-03-08'::DATE, 'DC', NULL),
    (6, 'Progressive Change Campaign Committee', 'Progressive', 22000.00, '2024-05-22'::DATE, 'MA', NULL)
) AS demo_data (politician_id, donor_name, donor_category, amount, date, state_code, source_id)
ON CONFLICT DO NOTHING;

-- Add donations across more states to meet requirement of 5-10 states
-- Additional donations from various states
INSERT INTO donations (politician_id, donor_name, donor_category, amount, date, state_code, source_id)
SELECT 
    politician_id,
    donor_name,
    donor_category,
    amount,
    date::DATE,
    state_code,
    (SELECT id FROM sources WHERE source_type = 'donation' LIMIT 1) as source_id
FROM (
    VALUES
    -- More donations to reach 5-10 states requirement
    (1, 'Boeing PAC', 'Aerospace', 25000.00, '2023-11-15'::DATE, 'WA', NULL),
    (2, 'Starbucks PAC', 'Food & Beverage', 20000.00, '2023-12-10'::DATE, 'WA', NULL),
    (3, 'General Electric PAC', 'Manufacturing', 35000.00, '2023-04-20'::DATE, 'MA', NULL),
    (4, 'Walt Disney Company PAC', 'Entertainment', 40000.00, '2023-06-18'::DATE, 'FL', NULL),
    (5, 'Lockheed Martin PAC', 'Defense', 55000.00, '2022-12-05'::DATE, 'MD', NULL),
    (6, 'Planned Parenthood PAC', 'Interest Groups', 30000.00, '2024-04-12'::DATE, 'NY', NULL),
    
    -- Additional states (IL, PA, OH, GA, NC)
    (1, 'United Airlines PAC', 'Transportation', 28000.00, '2024-02-25'::DATE, 'IL', NULL),
    (2, 'Comcast PAC', 'Telecommunications', 45000.00, '2023-10-15'::DATE, 'PA', NULL),
    (3, 'Procter & Gamble PAC', 'Consumer Goods', 32000.00, '2023-07-22'::DATE, 'OH', NULL),
    (4, 'Coca-Cola PAC', 'Food & Beverage', 35000.00, '2024-03-15'::DATE, 'GA', NULL),
    (5, 'Bank of America PAC', 'Finance', 50000.00, '2023-05-18'::DATE, 'NC', NULL)
) AS additional_data (politician_id, donor_name, donor_category, amount, date, state_code, source_id)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Summary: This seed data includes:
-- ============================================================================
-- - 6 politicians (IDs 1-6) with state codes and positions
-- - Donations to all 6 politicians
-- - Donations across 15+ states (DE, CA, TX, WA, DC, KY, NY, IL, VA, MA, FL, MD, PA, OH, GA, NC)
-- - Multiple donor categories (Healthcare, Energy, Technology, Finance, Labor, etc.)
-- - Donations spanning 2022-2024 (3 years)
-- - All donations have state_code for map aggregation
-- - All donations linked to politician_id and source_id

