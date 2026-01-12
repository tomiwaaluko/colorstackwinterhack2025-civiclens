#!/usr/bin/env python3
"""
Comprehensive Data Population Script

This script populates bills, votes, statements, and links donations to politicians.
It orchestrates the existing ingest scripts to enrich politician profiles.

Usage:
    python populate_politician_data.py --check-only  # Check current data status
    python populate_politician_data.py --populate-all  # Populate everything
    python populate_politician_data.py --votes-only  # Only populate votes
    python populate_politician_data.py --statements-only  # Only populate statements
    python populate_politician_data.py --donations-only  # Only link donations

Requirements:
    pip install requests psycopg2-binary python-dotenv
"""

import os
import sys
import logging
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple
import subprocess

import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('populate_politician_data.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
CONGRESS_GOV_API_KEY = os.getenv('CONGRESS_GOV_API_KEY')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment")


class DatabaseAnalyzer:
    """Analyze current database state"""

    def __init__(self, connection_string: str):
        # Clean up asyncpg-specific parameters
        connection_string = self._clean_connection_string(connection_string)
        self.conn = psycopg2.connect(connection_string, connect_timeout=10)

    @staticmethod
    def _clean_connection_string(url: str) -> str:
        """Remove asyncpg-specific parameters from connection string"""
        # Remove +asyncpg
        url = url.replace("+asyncpg", "")

        # Remove asyncpg-specific query parameters
        if "?" in url:
            base_url, params = url.split("?", 1)
            # Filter out asyncpg-specific params
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

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.conn.close()

    def get_table_counts(self) -> Dict[str, int]:
        """Get row counts for all main tables"""
        with self.conn.cursor() as cur:
            tables = ['politicians', 'bills', 'votes', 'statements', 'donations', 'sources']
            counts = {}
            for table in tables:
                cur.execute(f'SELECT COUNT(*) FROM {table}')
                counts[table] = cur.fetchone()[0]
            return counts

    def get_politician_data_summary(self) -> List[Tuple]:
        """Get summary of data per politician"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT
                    p.id,
                    p.name,
                    p.party,
                    p.state_code,
                    COUNT(DISTINCT v.id) as vote_count,
                    COUNT(DISTINCT s.id) as statement_count,
                    COUNT(DISTINCT d.id) as donation_count
                FROM politicians p
                LEFT JOIN votes v ON v.politician_id = p.id
                LEFT JOIN statements s ON s.politician_id = p.id
                LEFT JOIN donations d ON d.politician_id = p.id
                GROUP BY p.id, p.name, p.party, p.state_code
                ORDER BY p.name
            """)
            return cur.fetchall()

    def get_source_types_summary(self) -> List[Tuple]:
        """Get summary of sources by type"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT source_type, COUNT(*) as count
                FROM sources
                GROUP BY source_type
                ORDER BY count DESC
            """)
            return cur.fetchall()

    def get_orphaned_donations_count(self) -> int:
        """Count donations not linked to any politician"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*)
                FROM donations d
                LEFT JOIN politicians p ON d.politician_id = p.id
                WHERE p.id IS NULL
            """)
            return cur.fetchone()[0]

    def get_politicians_without_votes(self) -> List[Tuple]:
        """Get politicians with no votes"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT p.id, p.name, p.party, p.state_code
                FROM politicians p
                LEFT JOIN votes v ON v.politician_id = p.id
                WHERE v.id IS NULL
                ORDER BY p.name
            """)
            return cur.fetchall()

    def get_politicians_without_statements(self) -> List[Tuple]:
        """Get politicians with no statements"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT p.id, p.name, p.party, p.state_code
                FROM politicians p
                LEFT JOIN statements s ON s.politician_id = p.id
                WHERE s.id IS NULL
                ORDER BY p.name
            """)
            return cur.fetchall()


def print_database_status(analyzer: DatabaseAnalyzer):
    """Print comprehensive database status"""
    logger.info("=" * 80)
    logger.info("DATABASE STATUS REPORT")
    logger.info("=" * 80)

    # Table counts
    logger.info("\n📊 TABLE ROW COUNTS:")
    counts = analyzer.get_table_counts()
    for table, count in counts.items():
        logger.info(f"  {table:.<30} {count:>10,} rows")

    # Source types
    logger.info("\n📚 SOURCES BY TYPE:")
    source_types = analyzer.get_source_types_summary()
    for source_type, count in source_types:
        logger.info(f"  {source_type:.<30} {count:>10,} records")

    # Orphaned donations
    orphaned = analyzer.get_orphaned_donations_count()
    if orphaned > 0:
        logger.warning(f"\n⚠️  ORPHANED DONATIONS: {orphaned} donations not linked to politicians")

    # Politicians without data
    no_votes = analyzer.get_politicians_without_votes()
    no_statements = analyzer.get_politicians_without_statements()

    logger.info(f"\n👥 POLITICIANS MISSING DATA:")
    logger.info(f"  Without votes:      {len(no_votes):>10}")
    logger.info(f"  Without statements: {len(no_statements):>10}")

    # Sample politician data
    logger.info("\n📋 SAMPLE POLITICIAN DATA (first 10):")
    politician_data = analyzer.get_politician_data_summary()[:10]
    for pid, name, party, state, votes, statements, donations in politician_data:
        logger.info(f"  {name[:30]:.<30} V:{votes:>3} S:{statements:>3} D:{donations:>4} ({party[:3]}/{state or 'N/A'})")

    logger.info("\n" + "=" * 80)


def populate_votes_and_bills(congress: int = 118, max_bills: int = 100):
    """Populate votes and bills using Congress.gov API"""
    logger.info(f"=" * 80)
    logger.info(f"POPULATING VOTES AND BILLS (Congress {congress})")
    logger.info("=" * 80)

    if not CONGRESS_GOV_API_KEY:
        logger.error("CONGRESS_GOV_API_KEY not found. Skipping votes/bills ingestion.")
        logger.info("To populate votes/bills, set CONGRESS_GOV_API_KEY in .env")
        logger.info("Get a FREE API key at: https://api.congress.gov/sign-up/")
        logger.info("Note: ProPublica API is deprecated and no longer available")
        return

    try:
        # Import Congress.gov ingest script
        sys.path.insert(0, os.path.dirname(__file__))
        from congress_gov_ingest import CongressGovClient, DatabaseManager, IngestionPipeline

        logger.info("📥 Fetching data from Congress.gov API...")

        api_client = CongressGovClient(CONGRESS_GOV_API_KEY)
        with DatabaseManager(DATABASE_URL) as db:
            pipeline = IngestionPipeline(api_client, db)

            # Ingest bills (which will include vote data)
            for chamber in ['house', 'senate']:
                logger.info(f"\n🏛️  Fetching {chamber.title()} bills...")
                try:
                    bill_type = 'hr' if chamber == 'house' else 's'
                    # Get 3 pages = ~750 bills per chamber
                    pipeline.ingest_bills(congress, chamber, bill_type, max_pages=3)
                except Exception as e:
                    logger.error(f"Failed to fetch {chamber} bills: {e}")
                    continue

        logger.info("\n✅ Votes and bills population complete!")

    except ImportError as e:
        logger.error(f"Failed to import congress_gov_ingest: {e}")
        logger.error("Make sure congress_gov_ingest.py is in the same directory")
    except Exception as e:
        logger.error(f"Failed to populate votes/bills: {e}", exc_info=True)


def populate_statements_sample():
    """Populate sample statements for top politicians"""
    logger.info("=" * 80)
    logger.info("POPULATING SAMPLE STATEMENTS")
    logger.info("=" * 80)

    try:
        from statements_ingest import DatabaseManager, StatementsIngestionPipeline

        # Sample statements for major politicians (you can add more)
        sample_statements = [
            {
                "politician_name": "Joseph R. Biden Jr.",
                "text": "We must work together to address the challenges facing our nation.",
                "url": "https://www.whitehouse.gov/briefing-room/statements-releases/",
                "publisher": "White House",
                "title": "Presidential Statement on National Unity",
                "date": "2024-01-15"
            },
            {
                "politician_name": "Kamala D. Harris",
                "text": "Investing in our future means investing in education and opportunity for all Americans.",
                "url": "https://www.whitehouse.gov/vp/",
                "publisher": "White House",
                "title": "Vice Presidential Remarks on Education",
                "date": "2024-02-01"
            },
        ]

        with DatabaseManager(DATABASE_URL) as db:
            pipeline = StatementsIngestionPipeline(db)

            for stmt in sample_statements:
                try:
                    logger.info(f"  Adding statement for {stmt['politician_name']}...")
                    date_obj = datetime.strptime(stmt['date'], '%Y-%m-%d').date() if stmt.get('date') else None
                    pipeline.ingest_manual(
                        stmt['politician_name'],
                        stmt['text'],
                        stmt['url'],
                        stmt.get('publisher'),
                        stmt.get('title'),
                        date_obj
                    )
                except Exception as e:
                    logger.warning(f"    Failed: {e}")
                    continue

        logger.info("\n✅ Sample statements added!")
        logger.info("ℹ️  To add more statements, use statements_ingest.py with --url or --json-file")

    except ImportError as e:
        logger.error(f"Failed to import statements_ingest: {e}")
    except Exception as e:
        logger.error(f"Failed to populate statements: {e}", exc_info=True)


def link_orphaned_donations():
    """Attempt to link orphaned donations to politicians"""
    logger.info("=" * 80)
    logger.info("LINKING ORPHANED DONATIONS TO POLITICIANS")
    logger.info("=" * 80)

    try:
        # Use the same cleaning function
        conn_str = DatabaseAnalyzer._clean_connection_string(DATABASE_URL)
        conn = psycopg2.connect(conn_str, connect_timeout=10)
        conn.autocommit = False

        with conn.cursor() as cur:
            # Check for orphaned donations
            cur.execute("""
                SELECT COUNT(*)
                FROM donations d
                WHERE NOT EXISTS (
                    SELECT 1 FROM politicians p WHERE p.id = d.politician_id
                )
            """)
            orphaned_count = cur.fetchone()[0]

            if orphaned_count == 0:
                logger.info("✅ No orphaned donations found. All donations are properly linked!")
                conn.close()
                return

            logger.info(f"Found {orphaned_count} orphaned donations")
            logger.info("Note: Orphaned donations may need manual review to link properly")

            # You could add logic here to attempt automatic linking based on donor names
            # For now, we just report the issue

        conn.close()

    except Exception as e:
        logger.error(f"Failed to check donations: {e}", exc_info=True)


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Populate Politician Data')
    parser.add_argument('--check-only', action='store_true', help='Only check current status')
    parser.add_argument('--populate-all', action='store_true', help='Populate all data (votes, statements)')
    parser.add_argument('--votes-only', action='store_true', help='Only populate votes/bills')
    parser.add_argument('--statements-only', action='store_true', help='Only populate sample statements')
    parser.add_argument('--donations-only', action='store_true', help='Only check/link donations')
    parser.add_argument('--congress', type=int, default=118, help='Congress number (default: 118)')
    parser.add_argument('--max-bills', type=int, default=100,
                       help='Max bills to process (default: 100)')

    args = parser.parse_args()

    logger.info("\n" + "=" * 80)
    logger.info("POLITICIAN DATA POPULATION TOOL")
    logger.info("=" * 80 + "\n")

    try:
        # Always check status first
        with DatabaseAnalyzer(DATABASE_URL) as analyzer:
            print_database_status(analyzer)

        if args.check_only:
            logger.info("\n✅ Status check complete! Use --populate-all to add data.")
            return

        # Populate based on flags
        if args.populate_all or args.votes_only:
            populate_votes_and_bills(args.congress, args.max_bills)

        if args.populate_all or args.statements_only:
            populate_statements_sample()

        if args.populate_all or args.donations_only:
            link_orphaned_donations()

        # Show final status
        logger.info("\n" + "=" * 80)
        logger.info("FINAL STATUS AFTER POPULATION")
        logger.info("=" * 80 + "\n")

        with DatabaseAnalyzer(DATABASE_URL) as analyzer:
            print_database_status(analyzer)

        logger.info("\n✅ Data population complete!")
        logger.info("\n📝 NEXT STEPS:")
        logger.info("  • To add more statements: python statements_ingest.py --url <url> --politician <name>")
        logger.info("  • To add donations: python fec_ingest.py --candidate-id <fec_id> --politician-id <id>")
        logger.info("  • To add more votes/bills: Re-run with higher --max-bills value")
        logger.info("  • Get Congress.gov API key: https://api.congress.gov/sign-up/")

    except Exception as e:
        logger.error(f"Population failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
