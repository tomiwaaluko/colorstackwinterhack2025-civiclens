-- Demo Seed Data
-- Purpose: Offline demo with realistic but minimal data
-- Scope: 3 politicians, 2 bills, 15 votes, sample donations/statements

BEGIN;

-- ============================================================================
-- SOURCES (Provenance First!)
-- ============================================================================

-- ProPublica API sources (NOTE: ProPublica Congress API is discontinued, these are for demo only)
-- In production, use OpenStates API: https://openstates.org
INSERT INTO sources (id, source_url, publisher, title, source_type, published_at, retrieved_at, license_notes, raw_text) VALUES
('00000000-0000-0000-0001-000000000001', 'https://v3.openstates.org/people/ocd-person/s000033-example', 'OpenStates', 'Bernie Sanders Legislative Profile', 'profile', '2024-01-15', '2024-01-15', 'OpenStates data under CC BY 4.0', '{"id":"ocd-person/s000033-example","name":"Bernie Sanders","party":"Independent","state":"VT"}'),
('00000000-0000-0000-0001-000000000002', 'https://v3.openstates.org/people/ocd-person/a000148-example', 'OpenStates', 'Alexandria Ocasio-Cortez Legislative Profile', 'profile', '2024-01-15', '2024-01-15', 'OpenStates data under CC BY 4.0', '{"id":"ocd-person/a000148-example","name":"Alexandria Ocasio-Cortez","party":"Democratic","state":"NY"}'),
('00000000-0000-0000-0001-000000000003', 'https://v3.openstates.org/people/ocd-person/m001184-example', 'OpenStates', 'Mitch McConnell Legislative Profile', 'profile', '2024-01-15', '2024-01-15', 'OpenStates data under CC BY 4.0', '{"id":"ocd-person/m001184-example","name":"Mitch McConnell","party":"Republican","state":"KY"}');

-- Bill sources
INSERT INTO sources (id, source_url, publisher, title, source_type, published_at, retrieved_at, license_notes, raw_text) VALUES
('00000000-0000-0000-0002-000000000001', 'https://v3.openstates.org/bills/ocd-bill/hr1-118-example', 'OpenStates', 'H.R.1 - Lower Energy Costs Act', 'bill', '2023-03-30', '2024-01-15', 'OpenStates data under CC BY 4.0', '{"id":"ocd-bill/hr1-118-example","identifier":"H.R. 1","title":"Lower Energy Costs Act","introduced":"2023-01-09"}'),
('00000000-0000-0000-0002-000000000002', 'https://v3.openstates.org/bills/ocd-bill/s686-118-example', 'OpenStates', 'S.686 - RESTRICT Act', 'bill', '2023-03-07', '2024-01-15', 'OpenStates data under CC BY 4.0', '{"id":"ocd-bill/s686-118-example","identifier":"S. 686","title":"RESTRICT Act (TikTok Ban)","introduced":"2023-03-07"}');

-- Vote sources
INSERT INTO sources (id, source_url, publisher, title, source_type, published_at, retrieved_at, license_notes, raw_text) VALUES
('00000000-0000-0000-0003-000000000001', 'https://v3.openstates.org/votes/ocd-vote/hr1-vote-example', 'OpenStates', 'Roll Call Vote on H.R.1', 'vote', '2023-03-30', '2024-01-15', 'OpenStates data under CC BY 4.0', '{"id":"ocd-vote/hr1-example","bill":"hr1-118","date":"2023-03-30","result":"Passed"}'),
('00000000-0000-0000-0003-000000000002', 'https://v3.openstates.org/votes/ocd-vote/s686-vote-example', 'OpenStates', 'Senate Vote on S.686', 'vote', '2023-03-15', '2024-01-15', 'OpenStates data under CC BY 4.0', '{"id":"ocd-vote/s686-example","bill":"s686-118","date":"2023-03-15"}');

-- Donation sources (OpenSecrets)
INSERT INTO sources (id, source_url, publisher, title, source_type, published_at, retrieved_at, license_notes, raw_text) VALUES
('00000000-0000-0000-0004-000000000001', 'https://www.opensecrets.org/members-of-congress/bernie-sanders/summary', 'OpenSecrets', 'Bernie Sanders 2024 Cycle Donations', 'donation', '2024-01-01', '2024-01-15', 'OpenSecrets.org data', '{"cycle":"2024","total":15234567,"small_donor_pct":62}'),
('00000000-0000-0000-0004-000000000002', 'https://www.opensecrets.org/members-of-congress/alexandria-ocasio-cortez/summary', 'OpenSecrets', 'AOC 2024 Cycle Donations', 'donation', '2024-01-01', '2024-01-15', 'OpenSecrets.org data', '{"cycle":"2024","total":8234123,"small_donor_pct":71}'),
('00000000-0000-0000-0004-000000000003', 'https://www.opensecrets.org/members-of-congress/mitch-mcconnell/summary', 'OpenSecrets', 'McConnell 2024 Cycle Donations', 'donation', '2024-01-01', '2024-01-15', 'OpenSecrets.org data', '{"cycle":"2024","total":23456789,"pac_pct":45}');

-- Statement sources
INSERT INTO sources (id, source_url, publisher, title, source_type, published_at, retrieved_at, license_notes, raw_text) VALUES
('00000000-0000-0000-0005-000000000001', 'https://twitter.com/BernieSanders/status/1234567890', 'Twitter', 'Bernie Sanders Tweet on Healthcare', 'social_media', '2024-01-10', '2024-01-11', 'Public social media content', 'Healthcare is a human right, not a privilege. We need Medicare for All.'),
('00000000-0000-0000-0005-000000000002', 'https://ocasio-cortez.house.gov/media/press-releases/rep-ocasio-cortez-statement-green-new-deal', 'House.gov', 'AOC Press Release on Green New Deal', 'press_release', '2024-01-05', '2024-01-06', 'Public domain - official government statement', 'The Green New Deal is about creating millions of good-paying jobs while tackling the climate crisis.'),
('00000000-0000-0000-0005-000000000003', 'https://www.republicanleader.senate.gov/newsroom/press-releases/mcconnell-statement-on-border-security', 'Senate Republicans', 'McConnell Statement on Border Security', 'press_release', '2024-01-08', '2024-01-09', 'Public domain - official government statement', 'Border security must be our top priority. We need to secure our borders before considering any other immigration reforms.');

-- ============================================================================
-- POLITICIANS
-- ============================================================================

INSERT INTO politicians (id, external_id, external_id_source, full_name, party, state, current_office, bio_text, source_id) VALUES
(
    '10000000-0000-0000-0001-000000000001',
    'ocd-person/s000033-example',
    'openstates',
    'Bernard Sanders',
    'Independent',
    'VT',
    'U.S. Senator',
    'Independent Senator from Vermont. Longest-serving independent in U.S. congressional history. Democratic Socialist focused on economic inequality, healthcare reform, and climate change.',
    '00000000-0000-0000-0001-000000000001'
),
(
    '10000000-0000-0000-0001-000000000002',
    'ocd-person/a000148-example',
    'openstates',
    'Alexandria Ocasio-Cortez',
    'Democratic',
    'NY',
    'U.S. Representative',
    'Democratic Representative for New York''s 14th congressional district. Youngest woman ever elected to Congress. Progressive advocate for the Green New Deal and Medicare for All.',
    '00000000-0000-0000-0001-000000000002'
),
(
    '10000000-0000-0000-0001-000000000003',
    'ocd-person/m001184-example',
    'openstates',
    'Mitch McConnell',
    'Republican',
    'KY',
    'U.S. Senator',
    'Republican Senator from Kentucky. Longest-serving Senate Republican Leader in history. Focus on conservative judicial appointments and fiscal policy.',
    '00000000-0000-0000-0001-000000000003'
);

-- ============================================================================
-- OFFICES
-- ============================================================================

INSERT INTO offices (politician_id, office_type, state, district, start_date, end_date, party_at_time, source_id) VALUES
-- Bernie Sanders
('10000000-0000-0000-0001-000000000001', 'senate', 'VT', NULL, '2019-01-03', NULL, 'Independent', '00000000-0000-0000-0001-000000000001'),
-- AOC
('10000000-0000-0000-0001-000000000002', 'house', 'NY', '14', '2023-01-03', NULL, 'Democratic', '00000000-0000-0000-0001-000000000002'),
-- McConnell
('10000000-0000-0000-0001-000000000003', 'senate', 'KY', NULL, '2021-01-03', NULL, 'Republican', '00000000-0000-0000-0001-000000000003');

-- ============================================================================
-- BILLS
-- ============================================================================

INSERT INTO bills (id, external_id, bill_number, title, summary, sponsor_id, introduced_date, congress_number, chamber, status, source_id) VALUES
(
    '20000000-0000-0000-0001-000000000001',
    'hr1-118',
    'H.R. 1',
    'Lower Energy Costs Act',
    'A bill to lower energy costs by increasing American energy production, exports, and critical minerals processing.',
    NULL, -- Sponsor not in our demo set
    '2023-01-09',
    118,
    'house',
    'Passed House',
    '00000000-0000-0000-0002-000000000001'
),
(
    '20000000-0000-0000-0001-000000000002',
    's686-118',
    'S. 686',
    'RESTRICT Act',
    'To authorize the Secretary of Commerce to review and prohibit certain transactions between persons in the United States and foreign adversaries (TikTok ban).',
    NULL,
    '2023-03-07',
    118,
    'senate',
    'Introduced',
    '00000000-0000-0000-0002-000000000002'
);

-- ============================================================================
-- VOTES
-- ============================================================================

-- H.R. 1 votes (House)
INSERT INTO votes (politician_id, bill_id, vote_value, vote_date, roll_call_number, chamber, source_id) VALUES
('10000000-0000-0000-0001-000000000002', '20000000-0000-0000-0001-000000000001', 'nay', '2023-03-30', '123', 'house', '00000000-0000-0000-0003-000000000001');

-- S. 686 votes (Senate)
INSERT INTO votes (politician_id, bill_id, vote_value, vote_date, roll_call_number, chamber, source_id) VALUES
('10000000-0000-0000-0001-000000000001', '20000000-0000-0000-0001-000000000002', 'yea', '2023-03-15', '45', 'senate', '00000000-0000-0000-0003-000000000002'),
('10000000-0000-0000-0001-000000000003', '20000000-0000-0000-0001-000000000002', 'nay', '2023-03-15', '45', 'senate', '00000000-0000-0000-0003-000000000002');

-- ============================================================================
-- DONATIONS
-- ============================================================================

-- Bernie Sanders donations (small donors)
INSERT INTO donations (politician_id, donor_name, donor_type, amount_cents, donation_date, cycle, source_id) VALUES
('10000000-0000-0000-0001-000000000001', 'Individual Contributions (<$200)', 'individual', 943215000, '2024-01-01', '2024', '00000000-0000-0000-0004-000000000001'),
('10000000-0000-0000-0001-000000000001', 'ActBlue', 'pac', 321456700, '2024-01-01', '2024', '00000000-0000-0000-0004-000000000001'),
('10000000-0000-0000-0001-000000000001', 'National Nurses United PAC', 'pac', 258784800, '2024-01-01', '2024', '00000000-0000-0000-0004-000000000001');

-- AOC donations (grassroots)
INSERT INTO donations (politician_id, donor_name, donor_type, amount_cents, donation_date, cycle, source_id) VALUES
('10000000-0000-0000-0001-000000000002', 'Individual Contributions (<$200)', 'individual', 584522570, '2024-01-01', '2024', '00000000-0000-0000-0004-000000000002'),
('10000000-0000-0000-0001-000000000002', 'ActBlue', 'pac', 123890450, '2024-01-01', '2024', '00000000-0000-0000-0004-000000000002'),
('10000000-0000-0000-0001-000000000002', 'End Citizens United', 'pac', 114998080, '2024-01-01', '2024', '00000000-0000-0000-0004-000000000002');

-- McConnell donations (traditional PACs)
INSERT INTO donations (politician_id, donor_name, donor_type, amount_cents, donation_date, cycle, source_id) VALUES
('10000000-0000-0000-0001-000000000003', 'Senate Leadership Fund', 'pac', 1056155010, '2024-01-01', '2024', '00000000-0000-0000-0004-000000000003'),
('10000000-0000-0000-0001-000000000003', 'Blackstone Group', 'organization', 234567890, '2024-01-01', '2024', '00000000-0000-0000-0004-000000000003'),
('10000000-0000-0000-0001-000000000003', 'Koch Industries', 'organization', 178923400, '2024-01-01', '2024', '00000000-0000-0000-0004-000000000003'),
('10000000-0000-0000-0001-000000000003', 'Individual Contributions (>$200)', 'individual', 876543210, '2024-01-01', '2024', '00000000-0000-0000-0004-000000000003');

-- ============================================================================
-- STATEMENTS
-- ============================================================================

INSERT INTO statements (politician_id, statement_text, statement_date, statement_type, context, source_id) VALUES
(
    '10000000-0000-0000-0001-000000000001',
    'Healthcare is a human right, not a privilege. We need Medicare for All.',
    '2024-01-10',
    'tweet',
    'Social media statement on healthcare policy',
    '00000000-0000-0000-0005-000000000001'
),
(
    '10000000-0000-0000-0001-000000000002',
    'The Green New Deal is about creating millions of good-paying jobs while tackling the climate crisis.',
    '2024-01-05',
    'press_release',
    'Official press release on climate legislation',
    '00000000-0000-0000-0005-000000000002'
),
(
    '10000000-0000-0000-0001-000000000003',
    'Border security must be our top priority. We need to secure our borders before considering any other immigration reforms.',
    '2024-01-08',
    'press_release',
    'Official statement on border security policy',
    '00000000-0000-0000-0005-000000000003'
);

-- ============================================================================
-- SOURCE CHUNKS (for embedding demo)
-- ============================================================================

INSERT INTO source_chunks (source_id, chunk_text, chunk_index, metadata) VALUES
(
    '00000000-0000-0000-0005-000000000001',
    'Healthcare is a human right, not a privilege.',
    0,
    '{"type": "claim", "topic": "healthcare"}'
),
(
    '00000000-0000-0000-0005-000000000001',
    'We need Medicare for All.',
    1,
    '{"type": "policy_position", "topic": "healthcare"}'
),
(
    '00000000-0000-0000-0005-000000000002',
    'The Green New Deal is about creating millions of good-paying jobs while tackling the climate crisis.',
    0,
    '{"type": "policy_summary", "topic": "climate"}'
),
(
    '00000000-0000-0000-0005-000000000003',
    'Border security must be our top priority.',
    0,
    '{"type": "priority_statement", "topic": "immigration"}'
);

-- ============================================================================
-- VERIFY DATA INTEGRITY
-- ============================================================================

-- Check that all records have sources
SELECT * FROM verify_provenance();

-- Display summary
SELECT 
    'Politicians' AS table_name, 
    COUNT(*) AS record_count,
    COUNT(DISTINCT source_id) AS unique_sources
FROM politicians
UNION ALL
SELECT 'Offices', COUNT(*), COUNT(DISTINCT source_id) FROM offices
UNION ALL
SELECT 'Bills', COUNT(*), COUNT(DISTINCT source_id) FROM bills
UNION ALL
SELECT 'Votes', COUNT(*), COUNT(DISTINCT source_id) FROM votes
UNION ALL
SELECT 'Donations', COUNT(*), COUNT(DISTINCT source_id) FROM donations
UNION ALL
SELECT 'Statements', COUNT(*), COUNT(DISTINCT source_id) FROM statements
UNION ALL
SELECT 'Source Chunks', COUNT(*), COUNT(DISTINCT source_id) FROM source_chunks;

COMMIT;

-- ============================================================================
-- SAMPLE QUERIES FOR TESTING
-- ============================================================================

-- All current offices
-- SELECT * FROM current_offices;

-- Bernie's voting record
-- SELECT v.*, b.title, b.bill_number 
-- FROM votes v
-- JOIN bills b ON v.bill_id = b.id
-- WHERE v.politician_id = '10000000-0000-0000-0001-000000000001';

-- Top donors by politician
-- SELECT 
--     p.full_name,
--     d.donor_name,
--     d.amount_cents / 100.0 AS amount_dollars,
--     d.donor_type
-- FROM donations d
-- JOIN politicians p ON d.politician_id = p.id
-- ORDER BY p.full_name, d.amount_cents DESC;

-- Recent statements
-- SELECT 
--     p.full_name,
--     s.statement_text,
--     s.statement_date,
--     s.statement_type
-- FROM statements s
-- JOIN politicians p ON s.politician_id = p.id
-- ORDER BY s.statement_date DESC;