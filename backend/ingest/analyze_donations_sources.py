#!/usr/bin/env python3
"""
Analyze Donations and Sources Linkage

This script analyzes the donations and sources tables to determine:
1. Are donations properly linked to politicians?
2. Are there source records that should be linked to donations?
3. Can we automatically link orphaned data?

Usage:
    python analyze_donations_sources.py --analyze  # Just analyze
    python analyze_donations_sources.py --fix      # Attempt to fix linkage
"""

import os
import sys
import logging
from typing import Dict, List, Tuple, Optional

import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('analyze_donations_sources.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment")


class DonationsAnalyzer:
    """Analyze and fix donations/sources linkage"""

    def __init__(self, connection_string: str):
        connection_string = self._clean_connection_string(connection_string)
        self.conn = psycopg2.connect(connection_string, connect_timeout=10)
        self.conn.autocommit = False

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
        if exc_type:
            self.conn.rollback()
        self.conn.close()

    def analyze(self):
        """Comprehensive analysis of donations and sources"""
        logger.info("=" * 80)
        logger.info("DONATIONS AND SOURCES ANALYSIS")
        logger.info("=" * 80)

        with self.conn.cursor(cursor_factory=DictCursor) as cur:
            # 1. Total counts
            cur.execute("SELECT COUNT(*) FROM donations")
            total_donations = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM sources WHERE source_type = 'donation'")
            donation_sources = cur.fetchone()[0]

            logger.info(f"\n📊 BASIC COUNTS:")
            logger.info(f"  Total donations:           {total_donations:>10,}")
            logger.info(f"  Donation sources:          {donation_sources:>10,}")

            # 2. Donations with/without politician links
            cur.execute("""
                SELECT
                    COUNT(*) FILTER (WHERE politician_id IS NOT NULL) as with_politician,
                    COUNT(*) FILTER (WHERE politician_id IS NULL) as without_politician
                FROM donations
            """)
            row = cur.fetchone()
            with_pol = row['with_politician']
            without_pol = row['without_politician']

            logger.info(f"\n🔗 POLITICIAN LINKAGE:")
            logger.info(f"  Donations WITH politician: {with_pol:>10,} ({with_pol/total_donations*100:.1f}%)")
            logger.info(f"  Donations WITHOUT:         {without_pol:>10,} ({without_pol/total_donations*100 if total_donations > 0 else 0:.1f}%)")

            # 3. Check if politician_id references exist
            if without_pol > 0:
                cur.execute("""
                    SELECT DISTINCT politician_id
                    FROM donations
                    WHERE politician_id IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM politicians p WHERE p.id = donations.politician_id
                      )
                    LIMIT 10
                """)
                invalid_refs = cur.fetchall()
                if invalid_refs:
                    logger.warning(f"\n⚠️  INVALID POLITICIAN REFERENCES:")
                    logger.warning(f"  Found {len(invalid_refs)} politician IDs that don't exist")
                    logger.warning(f"  Sample IDs: {[row['politician_id'] for row in invalid_refs]}")

            # 4. Donations by category
            cur.execute("""
                SELECT donor_category, COUNT(*) as count, SUM(amount) as total_amount
                FROM donations
                GROUP BY donor_category
                ORDER BY count DESC
                LIMIT 10
            """)
            logger.info(f"\n💰 TOP DONATION CATEGORIES:")
            for row in cur.fetchall():
                logger.info(f"  {row['donor_category']:.<30} {row['count']:>6,} donations  ${row['total_amount']:>12,.2f}")

            # 5. Politicians with most donations
            cur.execute("""
                SELECT p.name, COUNT(d.id) as donation_count, SUM(d.amount) as total_amount
                FROM donations d
                JOIN politicians p ON d.politician_id = p.id
                GROUP BY p.id, p.name
                ORDER BY donation_count DESC
                LIMIT 10
            """)
            logger.info(f"\n👥 TOP POLITICIANS BY DONATIONS:")
            for row in cur.fetchall():
                logger.info(f"  {row['name'][:35]:.<35} {row['donation_count']:>6,} donations  ${row['total_amount']:>12,.2f}")

            # 6. Source records by type
            cur.execute("""
                SELECT source_type, COUNT(*) as count
                FROM sources
                GROUP BY source_type
                ORDER BY count DESC
            """)
            logger.info(f"\n📚 SOURCE RECORDS BY TYPE:")
            for row in cur.fetchall():
                logger.info(f"  {row['source_type']:.<30} {row['count']:>10,}")

            # 7. Donations with/without source links
            cur.execute("""
                SELECT
                    COUNT(*) FILTER (WHERE source_id IS NOT NULL) as with_source,
                    COUNT(*) FILTER (WHERE source_id IS NULL) as without_source
                FROM donations
            """)
            row = cur.fetchone()
            with_src = row['with_source']
            without_src = row['without_source']

            logger.info(f"\n🔗 SOURCE LINKAGE:")
            logger.info(f"  Donations WITH source:     {with_src:>10,} ({with_src/total_donations*100 if total_donations > 0 else 0:.1f}%)")
            logger.info(f"  Donations WITHOUT source:  {without_src:>10,} ({without_src/total_donations*100 if total_donations > 0 else 0:.1f}%)")

            # 8. Unused sources (sources not referenced by any data)
            cur.execute("""
                SELECT source_type, COUNT(*) as unused_count
                FROM sources s
                WHERE NOT EXISTS (
                    SELECT 1 FROM donations d WHERE d.source_id = s.id
                ) AND NOT EXISTS (
                    SELECT 1 FROM votes v WHERE v.source_id = s.id
                ) AND NOT EXISTS (
                    SELECT 1 FROM statements st WHERE st.source_id = s.id
                ) AND NOT EXISTS (
                    SELECT 1 FROM bills b WHERE b.source_id = s.id
                )
                GROUP BY source_type
                ORDER BY unused_count DESC
            """)
            unused = cur.fetchall()
            if unused:
                logger.info(f"\n📦 UNUSED SOURCE RECORDS (not linked to any data):")
                total_unused = sum(row['unused_count'] for row in unused)
                for row in unused:
                    logger.info(f"  {row['source_type']:.<30} {row['unused_count']:>10,} unused")
                logger.info(f"  {'TOTAL UNUSED':.<30} {total_unused:>10,}")

        logger.info("\n" + "=" * 80)

    def suggest_fixes(self):
        """Suggest fixes for data linkage issues"""
        logger.info("\n💡 SUGGESTED FIXES:")

        with self.conn.cursor(cursor_factory=DictCursor) as cur:
            # Check for orphaned donations
            cur.execute("""
                SELECT COUNT(*)
                FROM donations d
                WHERE politician_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM politicians p WHERE p.id = d.politician_id)
            """)
            orphaned = cur.fetchone()[0]

            if orphaned > 0:
                logger.info(f"\n1️⃣ FIX ORPHANED DONATIONS ({orphaned} records):")
                logger.info("   These donations reference politician IDs that don't exist.")
                logger.info("   Options:")
                logger.info("   a) Delete orphaned records:")
                logger.info("      DELETE FROM donations WHERE politician_id NOT IN (SELECT id FROM politicians);")
                logger.info("   b) Set politician_id to NULL:")
                logger.info("      UPDATE donations SET politician_id = NULL WHERE politician_id NOT IN (SELECT id FROM politicians);")

            # Check for donations without sources
            cur.execute("SELECT COUNT(*) FROM donations WHERE source_id IS NULL")
            no_source = cur.fetchone()[0]

            if no_source > 0:
                logger.info(f"\n2️⃣ ADD SOURCES FOR DONATIONS ({no_source} records):")
                logger.info("   These donations have no source provenance.")
                logger.info("   Solution: Run fec_ingest.py or manually create source records:")
                logger.info("   python fec_ingest.py --all-politicians --cycle 2024")

            # Check for unused sources
            cur.execute("""
                SELECT COUNT(*)
                FROM sources s
                WHERE source_type = 'donation'
                  AND NOT EXISTS (SELECT 1 FROM donations d WHERE d.source_id = s.id)
            """)
            unused_sources = cur.fetchone()[0]

            if unused_sources > 0:
                logger.info(f"\n3️⃣ LINK UNUSED DONATION SOURCES ({unused_sources} records):")
                logger.info("   These source records exist but aren't linked to donations.")
                logger.info("   This usually means the ingest process was incomplete.")
                logger.info("   Solution: Re-run fec_ingest.py for affected politicians")

            # Check if schema has all required columns
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'donations'
                ORDER BY ordinal_position
            """)
            columns = [row['column_name'] for row in cur.fetchall()]

            required_columns = ['id', 'politician_id', 'donor_name', 'donor_category', 'amount', 'date', 'source_id']
            missing_columns = [col for col in required_columns if col not in columns]

            if missing_columns:
                logger.warning(f"\n⚠️ MISSING COLUMNS IN DONATIONS TABLE:")
                logger.warning(f"   Missing: {', '.join(missing_columns)}")
                logger.warning("   Your schema may be outdated. Check migrations.")

        logger.info("\n" + "=" * 80)

    def auto_fix(self):
        """Attempt automatic fixes (with user confirmation)"""
        logger.info("=" * 80)
        logger.info("AUTO-FIX DONATIONS LINKAGE")
        logger.info("=" * 80)

        fixes_applied = 0

        with self.conn.cursor(cursor_factory=DictCursor) as cur:
            # Fix 1: Remove donations with invalid politician references
            cur.execute("""
                DELETE FROM donations
                WHERE politician_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM politicians p WHERE p.id = donations.politician_id)
            """)
            deleted = cur.rowcount
            if deleted > 0:
                logger.info(f"\n✅ Deleted {deleted} donations with invalid politician references")
                fixes_applied += deleted

            # Fix 2: Set politician_id to NULL for invalid references (alternative)
            # (We chose delete above, uncomment this if you prefer to keep the data)
            # cur.execute("""
            #     UPDATE donations
            #     SET politician_id = NULL
            #     WHERE politician_id IS NOT NULL
            #       AND NOT EXISTS (SELECT 1 FROM politicians p WHERE p.id = donations.politician_id)
            # """)

        if fixes_applied > 0:
            self.conn.commit()
            logger.info(f"\n✅ Applied {fixes_applied} fixes successfully!")
        else:
            logger.info("\n✅ No fixes needed - data linkage is correct!")

        logger.info("\n" + "=" * 80)


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Analyze Donations and Sources')
    parser.add_argument('--analyze', action='store_true', help='Analyze current state')
    parser.add_argument('--suggest', action='store_true', help='Suggest fixes')
    parser.add_argument('--fix', action='store_true', help='Automatically fix issues')

    args = parser.parse_args()

    if not any([args.analyze, args.suggest, args.fix]):
        # Default: analyze + suggest
        args.analyze = True
        args.suggest = True

    try:
        with DonationsAnalyzer(DATABASE_URL) as analyzer:
            if args.analyze:
                analyzer.analyze()

            if args.suggest:
                analyzer.suggest_fixes()

            if args.fix:
                response = input("\n⚠️  This will modify your database. Continue? (yes/no): ")
                if response.lower() == 'yes':
                    analyzer.auto_fix()
                    # Re-analyze to show results
                    analyzer.analyze()
                else:
                    logger.info("Aborted.")

    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
