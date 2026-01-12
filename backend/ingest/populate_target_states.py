#!/usr/bin/env python3
"""
Population script for target states: Florida, Georgia, Alabama, Mississippi, Louisiana

This script uses the congress_gov_ingest.py module to fetch and populate
politician data for specific states in a safe, controlled manner.
"""

import os
import sys
import logging
import time
from dotenv import load_dotenv
import re

# Add ingest directory to path
sys.path.insert(0, os.path.dirname(__file__))

from congress_gov_ingest import (
    CongressGovClient, DatabaseManager, IngestionPipeline,
    CONGRESS_GOV_API_KEY, DATABASE_URL, BASE_URL
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('populate_target_states.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Target states
TARGET_STATES = ['FL', 'GA', 'AL', 'MS', 'LA']

def clean_database_url(url):
    """Clean database URL for psycopg2 compatibility"""
    url = url.replace('+asyncpg', '')
    url = re.sub(r'\?.*$', '', url)
    return url

def populate_members(congress=118):
    """Populate members from target states for specified Congress"""
    logger.info(f"=== Starting population of members from {', '.join(TARGET_STATES)} ===")
    logger.info(f"Congress: {congress}")

    # Initialize API client with conservative rate limiting
    api_client = CongressGovClient(CONGRESS_GOV_API_KEY, rate_limit_delay=2.0)

    # Clean database URL
    db_url = clean_database_url(DATABASE_URL)

    with DatabaseManager(db_url) as db:
        pipeline = IngestionPipeline(api_client, db)

        try:
            # Fetch all members first (both chambers)
            logger.info("Fetching all House members...")
            house_members = api_client.get_members('house', congress)

            logger.info("Fetching all Senate members...")
            senate_members = api_client.get_members('senate', congress)

            all_members = house_members + senate_members
            logger.info(f"Total members fetched: {len(all_members)}")

            # Filter for target states
            target_members = []
            for member in all_members:
                state = member.get('state', '')
                # Handle both 2-letter codes and full state names
                if state in TARGET_STATES or state in ['Florida', 'Georgia', 'Alabama', 'Mississippi', 'Louisiana']:
                    target_members.append(member)

            logger.info(f"Found {len(target_members)} members from target states")

            # Count by state
            state_counts = {}
            for member in target_members:
                state = member.get('state', '')
                state_counts[state] = state_counts.get(state, 0) + 1

            logger.info("Distribution by state:")
            for state, count in sorted(state_counts.items()):
                logger.info(f"  {state}: {count} members")

            # Process members in safe batches
            success_count = 0
            error_count = 0
            batch_size = 20  # Conservative batch size

            for i, member in enumerate(target_members):
                member_id = member.get('bioguideId', 'unknown')
                name = f"{member.get('firstName', '')} {member.get('lastName', '')}".strip()

                try:
                    # Ensure connection every batch
                    if i % batch_size == 0:
                        db._ensure_connection()
                        logger.info(f"Processing batch {i // batch_size + 1} (members {i + 1}-{min(i + batch_size, len(target_members))} of {len(target_members)})")

                    # Create source record
                    import json
                    from congress_gov_ingest import Source

                    source = Source(
                        source_url=f"https://www.congress.gov/member/{member.get('firstName', '')}-{member.get('lastName', '')}/{member_id}",
                        publisher="Congress.gov",
                        title=f"{name} - Member Profile",
                        source_type="member",
                        raw_text=json.dumps(member, indent=2)
                    )
                    source_id = db.create_source(source)

                    # Upsert politician
                    politician_id = db.upsert_politician(member, source_id)

                    success_count += 1
                    logger.info(f"  [{success_count}/{len(target_members)}] Processed {name} ({member.get('state')})")

                    # Commit in batches
                    if success_count % batch_size == 0:
                        db.commit()
                        logger.info(f"  Committed batch {success_count // batch_size}")
                        # Add delay between batches to avoid overwhelming the database
                        time.sleep(2)

                except Exception as e:
                    error_count += 1
                    logger.error(f"  Failed to process {name} ({member_id}): {e}")
                    try:
                        db.rollback()
                    except:
                        pass
                    continue

            # Final commit
            try:
                db.commit()
                logger.info("Final commit completed")
            except Exception as e:
                logger.error(f"Final commit failed: {e}")

            logger.info(f"=== Members population complete ===")
            logger.info(f"Success: {success_count}")
            logger.info(f"Errors: {error_count}")
            logger.info(f"Total: {len(target_members)}")

            return success_count, error_count

        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            raise

def populate_bills(congress=118, max_bills_per_chamber=100):
    """Populate bills for Congress 118"""
    logger.info(f"=== Starting population of bills for Congress {congress} ===")
    logger.info(f"Maximum bills per chamber: {max_bills_per_chamber}")

    # Initialize API client
    api_client = CongressGovClient(CONGRESS_GOV_API_KEY, rate_limit_delay=2.0)

    # Clean database URL
    db_url = clean_database_url(DATABASE_URL)

    with DatabaseManager(db_url) as db:
        pipeline = IngestionPipeline(api_client, db)

        try:
            # Calculate pages needed (250 bills per page)
            max_pages = (max_bills_per_chamber // 250) + 1

            # Ingest House bills
            logger.info(f"Ingesting House bills (max {max_pages} pages)...")
            pipeline.ingest_bills(congress, 'house', 'hr', max_pages=max_pages)

            # Add delay between chambers
            time.sleep(3)

            # Ingest Senate bills
            logger.info(f"Ingesting Senate bills (max {max_pages} pages)...")
            pipeline.ingest_bills(congress, 'senate', 's', max_pages=max_pages)

            logger.info(f"=== Bills population complete ===")

        except Exception as e:
            logger.error(f"Bills pipeline failed: {e}", exc_info=True)
            raise

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Populate database with target state politicians')
    parser.add_argument('--congress', type=int, default=118, help='Congress number (default: 118)')
    parser.add_argument('--members-only', action='store_true', help='Only populate members')
    parser.add_argument('--bills-only', action='store_true', help='Only populate bills')
    parser.add_argument('--max-bills', type=int, default=100, help='Max bills per chamber (default: 100)')

    args = parser.parse_args()

    logger.info("="*70)
    logger.info("CivicLens Database Population - Target States")
    logger.info("="*70)
    logger.info(f"Target states: {', '.join(TARGET_STATES)}")
    logger.info(f"Congress: {args.congress}")
    logger.info("="*70)

    try:
        if not args.bills_only:
            logger.info("\n[STEP 1] Populating members...")
            success, errors = populate_members(args.congress)
            logger.info(f"Members population: {success} successful, {errors} errors")

        if not args.members_only:
            logger.info("\n[STEP 2] Populating bills...")
            populate_bills(args.congress, args.max_bills)

        logger.info("\n" + "="*70)
        logger.info("Population complete!")
        logger.info("="*70)

    except Exception as e:
        logger.error(f"Population failed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
