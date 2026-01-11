-- Migration: 0003_add_member_source_type.sql
-- Description: Add source_type values: member, profile, press_release, social_media
-- Note: The ANY (ARRAY[...]) syntax is supported by PostgreSQL 9.1+

-- ============================================================================
-- UPDATE SOURCE_TYPE CHECK CONSTRAINT
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_source_type_check;

-- Add the updated constraint with 'member' included
ALTER TABLE sources ADD CONSTRAINT sources_source_type_check 
    CHECK (source_type = ANY (ARRAY['vote'::text, 'bill'::text, 'donation'::text, 'statement'::text, 'member'::text, 'profile'::text, 'press_release'::text, 'social_media'::text]));

-- Note: This adds several common source types:
--   - vote: Roll call votes
--   - bill: Congressional bills
--   - donation: Campaign finance records
--   - statement: Official statements
--   - member: Congressional member profiles (NEW)
--   - profile: Alternative name for member profiles (NEW)
--   - press_release: Official press releases (NEW)
--   - social_media: Social media posts (NEW)
