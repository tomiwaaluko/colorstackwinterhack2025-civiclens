-- Migration: 0001_init.sql
-- Description: Minimal schema for MVP (scale up later)
-- Requires: PostgreSQL 14+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core provenance
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT NOT NULL,
    publisher TEXT NOT NULL,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL,
    published_at TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    license_notes TEXT,
    raw_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_sources_url ON sources(source_url);

-- Politicians
CREATE TABLE politicians (
    id SERIAL PRIMARY KEY,
    external_id TEXT,
    external_id_source TEXT,
    full_name TEXT NOT NULL,
    party TEXT,
    state TEXT,
    current_office TEXT,
    image_url TEXT,
    bio_text TEXT,
    source_id UUID NOT NULL REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_politicians_state ON politicians(state);
CREATE INDEX idx_politicians_name ON politicians(full_name);

-- Offices (historical and current positions)
CREATE TABLE offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id SERIAL NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    office_type TEXT NOT NULL,
    state TEXT,
    district TEXT,
    start_date DATE,
    end_date DATE,
    party_at_time TEXT,
    source_id UUID NOT NULL REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_offices_politician ON offices(politician_id);

-- Bills
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT,
    bill_number TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    sponsor_id SERIAL REFERENCES politicians(id),
    introduced_date DATE,
    congress_number INT,
    chamber TEXT,
    status TEXT,
    source_id UUID NOT NULL REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bills_number ON bills(bill_number);
CREATE INDEX idx_bills_sponsor ON bills(sponsor_id);

-- Votes
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id SERIAL NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    bill_title TEXT NOT NULL,
    vote_value TEXT NOT NULL CHECK (vote_value IN ('Yes', 'No', 'Abstain', 'Not Present')),
    vote_date DATE,
    source_id UUID NOT NULL REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_votes_politician ON votes(politician_id);

-- Statements
CREATE TABLE statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id SERIAL NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    statement_text TEXT NOT NULL,
    statement_date DATE,
    source_id UUID NOT NULL REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_statements_politician ON statements(politician_id);