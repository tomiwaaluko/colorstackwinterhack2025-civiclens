-- Migration: Check and Fix Existing Schema
-- Description: Adds missing columns if tables exist with old schema
-- Run this BEFORE the main schema migration if you want to preserve existing data

-- Check if politicians table exists and add missing columns
DO $$
BEGIN
    -- Fix politicians table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'politicians') THEN
        -- Add state_code if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'politicians' AND column_name = 'state_code') THEN
            ALTER TABLE politicians ADD COLUMN state_code CHAR(2);
            RAISE NOTICE 'Added state_code column to politicians table';
        END IF;
        
        -- Add district_number if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'politicians' AND column_name = 'district_number') THEN
            ALTER TABLE politicians ADD COLUMN district_number INTEGER 
                CHECK (district_number IS NULL OR (district_number >= 1 AND district_number <= 53));
            RAISE NOTICE 'Added district_number column to politicians table';
        END IF;
        
        -- Add position if missing (important: position is a reserved word, must quote)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'politicians' AND column_name = 'position') THEN
            ALTER TABLE politicians ADD COLUMN "position" TEXT;
            RAISE NOTICE 'Added position column to politicians table';
        END IF;
        
        -- Add bio if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'politicians' AND column_name = 'bio') THEN
            ALTER TABLE politicians ADD COLUMN bio TEXT;
            RAISE NOTICE 'Added bio column to politicians table';
        END IF;
        
        -- Add created_at/updated_at if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'politicians' AND column_name = 'created_at') THEN
            ALTER TABLE politicians ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            -- Make it NOT NULL after adding default values to existing rows
            UPDATE politicians SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
            ALTER TABLE politicians ALTER COLUMN created_at SET NOT NULL;
            RAISE NOTICE 'Added created_at column to politicians table';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'politicians' AND column_name = 'updated_at') THEN
            ALTER TABLE politicians ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            -- Make it NOT NULL after adding default values to existing rows
            UPDATE politicians SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;
            ALTER TABLE politicians ALTER COLUMN updated_at SET NOT NULL;
            RAISE NOTICE 'Added updated_at column to politicians table';
        END IF;
    END IF;
    
    -- Fix donations table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'donations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'donations' AND column_name = 'state_code') THEN
            ALTER TABLE donations ADD COLUMN state_code CHAR(2);
            RAISE NOTICE 'Added state_code column to donations table';
        END IF;
    END IF;
    
    -- Create indexes after columns are added
    CREATE INDEX IF NOT EXISTS idx_politicians_state_code ON politicians(state_code);
    CREATE INDEX IF NOT EXISTS idx_politicians_position ON politicians("position");
    CREATE INDEX IF NOT EXISTS idx_donations_state_code ON donations(state_code);
    
    RAISE NOTICE 'Schema fix completed';
END $$;

