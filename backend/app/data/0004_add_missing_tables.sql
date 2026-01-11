-- Migration: 0004_add_missing_tables.sql
-- Description: Add pgvector support for embeddings table
-- This migration enables vector similarity search if pgvector extension is available
-- Requires: PostgreSQL 14+ and pgvector extension (optional but recommended)

-- ============================================================================
-- ENABLE PGVECTOR EXTENSION
-- ============================================================================

-- Try to enable pgvector extension
-- Note: On cloud providers like Supabase, this may need to be enabled via dashboard first
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
    RAISE NOTICE 'pgvector extension enabled successfully';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'pgvector extension not available: %. Embeddings will use JSONB fallback.', SQLERRM;
END $$;

-- ============================================================================
-- ADD VECTOR COLUMN TO EMBEDDINGS TABLE
-- ============================================================================

-- If pgvector is available and embeddings table exists, add vector column
DO $$
DECLARE
    vec_dimension INTEGER := 768;  -- Default dimension for gemini-embedding-001
    has_embedding_col BOOLEAN;
    col_udt_name TEXT;
    col_type_def TEXT;
    has_data BOOLEAN;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        -- Check if embeddings table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'embeddings') THEN
            -- Check if embedding column already exists
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'embeddings' AND column_name = 'embedding'
            ) INTO has_embedding_col;
            
            IF NOT has_embedding_col THEN
                -- Create vector column WITH dimensions (required for indexing)
                -- Using 768 as default (gemini-embedding-001 dimension)
                EXECUTE format('ALTER TABLE embeddings ADD COLUMN embedding vector(%s)', vec_dimension);
                RAISE NOTICE 'Added vector column to embeddings table with dimension % (gemini-embedding-001)', vec_dimension;
            ELSE
                -- Column exists - check if it has dimensions
                -- Check if table has data
                SELECT EXISTS (SELECT 1 FROM embeddings LIMIT 1) INTO has_data;
                
                -- Get column type definition from pg_attribute to check for dimensions
                SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) INTO col_type_def
                FROM pg_attribute a
                JOIN pg_class c ON c.oid = a.attrelid
                WHERE c.relname = 'embeddings' AND a.attname = 'embedding';
                
                IF col_type_def IS NULL THEN
                    -- Fallback to information_schema if pg_attribute query fails
                    SELECT udt_name INTO col_udt_name
                    FROM information_schema.columns
                    WHERE table_name = 'embeddings' AND column_name = 'embedding';
                    col_type_def := col_udt_name;
                END IF;
                
                IF col_type_def = 'vector' OR (col_type_def IS NOT NULL AND col_type_def NOT LIKE 'vector(%') THEN
                    -- Column exists without dimensions
                    IF NOT has_data THEN
                        -- Safe to drop and recreate since no data
                        RAISE NOTICE 'Vector column exists without dimensions. Recreating with dimension %...', vec_dimension;
                        ALTER TABLE embeddings DROP COLUMN embedding;
                        EXECUTE format('ALTER TABLE embeddings ADD COLUMN embedding vector(%s)', vec_dimension);
                        RAISE NOTICE 'Recreated vector column with dimension %', vec_dimension;
                    ELSE
                        -- Has data - cannot safely fix automatically
                        RAISE WARNING 'Vector column exists without dimensions and table has data. Cannot auto-fix.';
                        RAISE NOTICE 'Manual fix required - see instructions below.';
                    END IF;
                ELSIF col_type_def LIKE 'vector(%' THEN
                    RAISE NOTICE 'Vector column already exists with dimensions: %', col_type_def;
                ELSE
                    RAISE NOTICE 'Embedding column exists with type: %', col_type_def;
                END IF;
            END IF;
            
            -- Attempt to create index (will only work if column has dimensions)
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_embeddings_vector') THEN
                BEGIN
                    -- Try to create index - will fail if column has no dimensions
                    CREATE INDEX idx_embeddings_vector ON embeddings 
                        USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
                    RAISE NOTICE 'Created ivfflat index for vector similarity search';
                EXCEPTION
                    WHEN SQLSTATE '22023' THEN
                        -- Column does not have dimensions error
                        RAISE WARNING 'Cannot create vector index: column needs dimensions.';
                        RAISE NOTICE 'To fix manually:';
                        RAISE NOTICE '  1. If embeddings table is empty:';
                        RAISE NOTICE '     ALTER TABLE embeddings DROP COLUMN IF EXISTS embedding;';
                        RAISE NOTICE '     ALTER TABLE embeddings ADD COLUMN embedding vector(768);';
                        RAISE NOTICE '     CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);';
                        RAISE NOTICE '  2. If embeddings table has data, back it up first, then follow step 1.';
                    WHEN OTHERS THEN
                        RAISE NOTICE 'Could not create vector index: %', SQLERRM;
                        RAISE NOTICE 'You may need to fix the embedding column first.';
                END;
            ELSE
                RAISE NOTICE 'Vector index already exists.';
            END IF;
        ELSE
            RAISE NOTICE 'Embeddings table does not exist yet. Vector support will be available after running 0002 migration.';
        END IF;
    ELSE
        RAISE NOTICE 'pgvector extension not available. Using JSONB fallback for embeddings.';
    END IF;
END $$;

-- ============================================================================
-- ADD FK CONSTRAINT TO DONATIONS TABLE (if missing)
-- ============================================================================

-- Add foreign key constraint to donations.politician_id if missing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'donations_politician_id_fkey' 
            AND table_name = 'donations'
        ) THEN
            -- Try to add FK constraint (may fail if data integrity issues exist)
            BEGIN
                ALTER TABLE donations 
                    ADD CONSTRAINT donations_politician_id_fkey 
                    FOREIGN KEY (politician_id) REFERENCES politicians(id) ON DELETE CASCADE;
                RAISE NOTICE 'Added foreign key constraint to donations.politician_id';
            EXCEPTION
                WHEN others THEN
                    RAISE NOTICE 'Could not add FK constraint to donations.politician_id: %. This may be due to existing data that violates the constraint.', SQLERRM;
            END;
        END IF;
    END IF;
END $$;

-- Add foreign key constraint to donations.source_id if missing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'donations_source_id_fkey' 
            AND table_name = 'donations'
        ) THEN
            BEGIN
                ALTER TABLE donations 
                    ADD CONSTRAINT donations_source_id_fkey 
                    FOREIGN KEY (source_id) REFERENCES sources(id);
                RAISE NOTICE 'Added foreign key constraint to donations.source_id';
            EXCEPTION
                WHEN others THEN
                    RAISE NOTICE 'Could not add FK constraint to donations.source_id: %', SQLERRM;
            END;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- ADD FK CONSTRAINT TO VOTES TABLE (if missing)
-- ============================================================================

-- Add foreign key constraint to votes.bill_id if missing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'votes' AND column_name = 'bill_id') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'votes_bill_id_fkey' 
            AND table_name = 'votes'
        ) THEN
            BEGIN
                ALTER TABLE votes 
                    ADD CONSTRAINT votes_bill_id_fkey 
                    FOREIGN KEY (bill_id) REFERENCES bills(id);
                RAISE NOTICE 'Added foreign key constraint to votes.bill_id';
            EXCEPTION
                WHEN others THEN
                    RAISE NOTICE 'Could not add FK constraint to votes.bill_id: %', SQLERRM;
            END;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================

-- Display migration summary
DO $$
DECLARE
    has_pgvector BOOLEAN;
    has_vector_col BOOLEAN;
    has_donations BOOLEAN;
    has_source_chunks BOOLEAN;
    has_embeddings BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') INTO has_pgvector;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'embeddings' AND column_name = 'embedding') INTO has_vector_col;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donations') INTO has_donations;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'source_chunks') INTO has_source_chunks;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'embeddings') INTO has_embeddings;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Migration 0004 Summary ===';
    RAISE NOTICE 'pgvector extension: %', CASE WHEN has_pgvector THEN 'ENABLED' ELSE 'NOT AVAILABLE' END;
    RAISE NOTICE 'Vector column in embeddings: %', CASE WHEN has_vector_col THEN 'YES' ELSE 'NO (using JSONB fallback)' END;
    RAISE NOTICE 'Donations table: %', CASE WHEN has_donations THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE 'Source chunks table: %', CASE WHEN has_source_chunks THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE 'Embeddings table: %', CASE WHEN has_embeddings THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '==============================';
END $$;
