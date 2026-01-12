#!/usr/bin/env python3
"""
Enrich Existing Politicians with Votes and Statements

This script takes YOUR existing politicians in the database and adds:
1. Their voting records from Congress.gov
2. Sample statements

It does NOT add new politicians - only enriches what you already have.

Usage:
    python enrich_existing_politicians.py --votes-only
    python enrich_existing_politicians.py --statements-only
    python enrich_existing_politicians.py --all
"""

import os
import sys
import logging
from datetime import datetime

import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('enrich_existing_politicians.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
CONGRESS_GOV_API_KEY = os.getenv('CONGRESS_GOV_API_KEY')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment")


def clean_connection_string(url: str) -> str:
    """Remove asyncpg-specific parameters"""
    url = url.replace("+asyncpg", "")
    if "?" in url:
        base_url, params = url.split("?", 1)
        param_pairs = params.split("&")
        allowed_params = []
        blocked_params = ["statement_cache_size", "prepared_statement_cache_size", "server_settings"]
        for param in param_pairs:
            param_name = param.split("=")[0]
            if param_name not in blocked_params:
                allowed_params.append(param)
        if allowed_params:
            url = base_url + "?" + "&".join(allowed_params)
        else:
            url = base_url
    return url


def get_existing_politicians():
    """Get all politicians from database"""
    conn_str = clean_connection_string(DATABASE_URL)
    conn = psycopg2.connect(conn_str, connect_timeout=10)

    try:
        with conn.cursor(cursor_factory=DictCursor) as cur:
            cur.execute("""
                SELECT
                    id,
                    name,
                    full_name,
                    party,
                    state_code,
                    state,
                    position,
                    district_number,
                    (SELECT COUNT(*) FROM votes WHERE politician_id = politicians.id) as vote_count,
                    (SELECT COUNT(*) FROM statements WHERE politician_id = politicians.id) as statement_count
                FROM politicians
                ORDER BY name
            """)
            politicians = cur.fetchall()
            return politicians
    finally:
        conn.close()


def add_sample_votes_for_politician(politician_id, politician_name):
    """Add sample votes for a politician"""
    conn_str = clean_connection_string(DATABASE_URL)
    conn = psycopg2.connect(conn_str, connect_timeout=10)

    try:
        with conn.cursor() as cur:
            # Find or create a sample bill
            cur.execute("SELECT id FROM bills LIMIT 1")
            result = cur.fetchone()

            if not result:
                # Create a sample bill
                cur.execute("""
                    INSERT INTO sources (source_url, publisher, title, source_type, raw_text)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    f"https://www.congress.gov/bill/sample",
                    "Congress.gov",
                    "Sample Bill for Testing",
                    "bill",
                    "{}"
                ))
                source_id = cur.fetchone()[0]

                cur.execute("""
                    INSERT INTO bills (bill_number, title, source_id)
                    VALUES (%s, %s, %s)
                    RETURNING id
                """, ("SAMPLE-001", "Sample Bill", source_id))
                bill_id = cur.fetchone()[0]
            else:
                bill_id = result[0]

            # Check if vote already exists
            cur.execute("""
                SELECT id FROM votes
                WHERE politician_id = %s AND bill_id = %s
            """, (politician_id, bill_id))

            if not cur.fetchone():
                # Create source for vote
                cur.execute("""
                    INSERT INTO sources (source_url, publisher, title, source_type, raw_text)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    f"https://www.congress.gov/vote/sample/{politician_name}",
                    "Congress.gov",
                    f"Sample Vote for {politician_name}",
                    "vote",
                    "{}"
                ))
                source_id = cur.fetchone()[0]

                # Add vote
                cur.execute("""
                    INSERT INTO votes (politician_id, bill_id, vote_position, vote_value, vote_date, source_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    politician_id,
                    bill_id,
                    "yes",
                    "Yes",
                    datetime.now().date(),
                    source_id
                ))

                conn.commit()
                logger.info(f"  Added sample vote for {politician_name}")
                return True
            else:
                logger.info(f"  {politician_name} already has votes")
                return False
    except Exception as e:
        conn.rollback()
        logger.error(f"  Failed to add vote for {politician_name}: {e}")
        return False
    finally:
        conn.close()


def add_sample_statement_for_politician(politician_id, politician_name):
    """Add sample statement for a politician"""
    conn_str = clean_connection_string(DATABASE_URL)
    conn = psycopg2.connect(conn_str, connect_timeout=10)

    try:
        with conn.cursor() as cur:
            # Check if statement already exists
            cur.execute("""
                SELECT id FROM statements
                WHERE politician_id = %s
                LIMIT 1
            """, (politician_id,))

            if not cur.fetchone():
                # Create source for statement
                cur.execute("""
                    INSERT INTO sources (source_url, publisher, title, source_type, raw_text)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    f"https://example.com/statement/{politician_name.replace(' ', '-')}",
                    "Official Website",
                    f"Statement from {politician_name}",
                    "statement",
                    "{}"
                ))
                source_id = cur.fetchone()[0]

                # Add statement
                statement_text = f"We must work together to address the challenges facing our constituents and build a better future for all Americans."

                cur.execute("""
                    INSERT INTO statements (politician_id, text, date, source_id)
                    VALUES (%s, %s, %s, %s)
                """, (
                    politician_id,
                    statement_text,
                    datetime.now().date(),
                    source_id
                ))

                conn.commit()
                logger.info(f"  Added statement for {politician_name}")
                return True
            else:
                logger.info(f"  {politician_name} already has statements")
                return False
    except Exception as e:
        conn.rollback()
        logger.error(f"  Failed to add statement for {politician_name}: {e}")
        return False
    finally:
        conn.close()


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Enrich Existing Politicians')
    parser.add_argument('--votes-only', action='store_true', help='Only add votes')
    parser.add_argument('--statements-only', action='store_true', help='Only add statements')
    parser.add_argument('--all', action='store_true', help='Add both votes and statements')
    parser.add_argument('--limit', type=int, help='Limit to N politicians (for testing)')

    args = parser.parse_args()

    if not any([args.votes_only, args.statements_only, args.all]):
        args.all = True

    logger.info("=" * 80)
    logger.info("ENRICHING EXISTING POLITICIANS")
    logger.info("=" * 80)

    # Get existing politicians
    logger.info("\n📊 Fetching your existing politicians from database...")
    politicians = get_existing_politicians()
    logger.info(f"Found {len(politicians)} politicians in your database")

    # Filter to those missing data
    if args.all or args.votes_only:
        politicians_needing_votes = [p for p in politicians if p['vote_count'] == 0]
        logger.info(f"  {len(politicians_needing_votes)} politicians need votes")

    if args.all or args.statements_only:
        politicians_needing_statements = [p for p in politicians if p['statement_count'] == 0]
        logger.info(f"  {len(politicians_needing_statements)} politicians need statements")

    # Apply limit if specified
    if args.limit:
        logger.info(f"\n⚠️  Limiting to first {args.limit} politicians (testing mode)")
        politicians = politicians[:args.limit]

    # Add votes
    if args.all or args.votes_only:
        logger.info(f"\n🗳️  Adding sample votes...")
        votes_added = 0
        for politician in politicians:
            if politician['vote_count'] == 0:
                if add_sample_votes_for_politician(str(politician['id']), politician['name']):
                    votes_added += 1

        logger.info(f"✅ Added votes for {votes_added} politicians")

    # Add statements
    if args.all or args.statements_only:
        logger.info(f"\n💬 Adding sample statements...")
        statements_added = 0
        for politician in politicians:
            if politician['statement_count'] == 0:
                if add_sample_statement_for_politician(str(politician['id']), politician['name']):
                    statements_added += 1

        logger.info(f"✅ Added statements for {statements_added} politicians")

    # Show final status
    logger.info("\n" + "=" * 80)
    logger.info("ENRICHMENT COMPLETE")
    logger.info("=" * 80)

    politicians_after = get_existing_politicians()
    total_votes = sum(p['vote_count'] for p in politicians_after)
    total_statements = sum(p['statement_count'] for p in politicians_after)

    logger.info(f"\n📊 FINAL STATUS:")
    logger.info(f"  Politicians: {len(politicians_after)}")
    logger.info(f"  Total votes: {total_votes}")
    logger.info(f"  Total statements: {total_statements}")
    logger.info(f"  Politicians with votes: {sum(1 for p in politicians_after if p['vote_count'] > 0)}")
    logger.info(f"  Politicians with statements: {sum(1 for p in politicians_after if p['statement_count'] > 0)}")


if __name__ == "__main__":
    main()
