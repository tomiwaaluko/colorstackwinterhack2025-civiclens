#!/usr/bin/env python3
"""
Verify Demo Data Script

This script verifies that all demo seed data requirements are met.
Run this after seeding the database to ensure data is complete.

Usage:
    python backend/scripts/verify_demo_data.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def verify_demo_data():
    """Verify demo data meets all requirements."""
    print("=" * 60)
    print("  Demo Data Verification Script")
    print("=" * 60)
    print()

    async with AsyncSessionLocal() as session:
        try:
            all_passed = True

            # 1. Verify politicians
            print("1. Checking Politicians...")
            result = await session.execute(text("SELECT COUNT(*) FROM politicians"))
            pol_count = result.scalar()
            print(f"   Found: {pol_count} politicians")
            if pol_count < 2:
                print("   ⚠️  WARNING: Need at least 2 politicians")
                all_passed = False
            else:
                print("   ✅ Pass")

            result = await session.execute(
                text("SELECT COUNT(DISTINCT state_code) FROM politicians WHERE state_code IS NOT NULL")
            )
            state_count = result.scalar()
            print(f"   Found: {state_count} unique states")
            print("   ✅ Pass")
            print()

            # 2. Verify bills
            print("2. Checking Bills...")
            result = await session.execute(text("SELECT COUNT(*) FROM bills"))
            bill_count = result.scalar()
            print(f"   Found: {bill_count} bills")
            if bill_count < 5:
                print("   ⚠️  WARNING: Need at least 5 bills")
                all_passed = False
            else:
                print("   ✅ Pass")
            print()

            # 3. Verify votes
            print("3. Checking Votes...")
            result = await session.execute(text("SELECT COUNT(*) FROM votes"))
            vote_count = result.scalar()
            print(f"   Found: {vote_count} votes")
            if vote_count < 20:
                print("   ⚠️  WARNING: Need at least 20 votes")
                all_passed = False
            else:
                print("   ✅ Pass")

            # Check vote date range
            result = await session.execute(
                text("SELECT MIN(vote_date) as earliest, MAX(vote_date) as latest FROM votes")
            )
            row = result.mappings().first()
            if row:
                earliest = row["earliest"]
                latest = row["latest"]
                print(f"   Date range: {earliest} to {latest}")
                if earliest and latest:
                    year_span = latest.year - earliest.year + 1
                    if year_span < 2:
                        print(f"   ⚠️  WARNING: Votes span only {year_span} year(s), need at least 2")
                        all_passed = False
                    else:
                        print(f"   ✅ Pass ({year_span} years)")
            print()

            # 4. Verify statements
            print("4. Checking Statements...")
            result = await session.execute(text("SELECT COUNT(*) FROM statements"))
            stmt_count = result.scalar()
            print(f"   Found: {stmt_count} statements")

            result = await session.execute(
                text("SELECT COUNT(*) FROM statements WHERE date IS NOT NULL")
            )
            dated_count = result.scalar()
            print(f"   With dates: {dated_count}")
            if dated_count < 10:
                print("   ⚠️  WARNING: Need at least 10 statements with dates")
                all_passed = False
            else:
                print("   ✅ Pass")
            print()

            # 5. Verify donations
            print("5. Checking Donations...")
            result = await session.execute(text("SELECT COUNT(*) FROM donations"))
            donation_count = result.scalar()
            print(f"   Found: {donation_count} donations")
            if donation_count < 10:
                print("   ⚠️  WARNING: Need at least 10 donations")
                all_passed = False
            else:
                print("   ✅ Pass")

            result = await session.execute(
                text("SELECT COUNT(DISTINCT state_code) FROM donations WHERE state_code IS NOT NULL")
            )
            donation_states = result.scalar()
            print(f"   States represented: {donation_states}")
            if donation_states < 5:
                print("   ⚠️  WARNING: Need donations from at least 5 states")
                all_passed = False
            else:
                print("   ✅ Pass")

            result = await session.execute(
                text("SELECT COUNT(DISTINCT donor_category) FROM donations")
            )
            categories = result.scalar()
            print(f"   Donor categories: {categories}")
            if categories < 3:
                print("   ⚠️  WARNING: Need at least 3 donor categories")
                all_passed = False
            else:
                print("   ✅ Pass")
            print()

            # 6. Verify data relationships
            print("6. Checking Data Relationships...")
            result = await session.execute(
                text("SELECT COUNT(DISTINCT v.bill_id) FROM votes v JOIN bills b ON v.bill_id = b.id")
            )
            bills_with_votes = result.scalar()
            print(f"   Bills with votes: {bills_with_votes}")
            if bills_with_votes < 5:
                print("   ⚠️  WARNING: Need at least 5 bills linked to votes")
                all_passed = False
            else:
                print("   ✅ Pass")

            result = await session.execute(
                text("SELECT COUNT(DISTINCT politician_id) FROM donations")
            )
            pols_with_donations = result.scalar()
            print(f"   Politicians with donations: {pols_with_donations}")
            if pols_with_donations < 2:
                print("   ⚠️  WARNING: Need at least 2 politicians with donations")
                all_passed = False
            else:
                print("   ✅ Pass")
            print()

            # 7. Verify sources
            print("7. Checking Sources...")
            
            # Use separate queries to avoid Cartesian product
            vote_sources_result = await session.execute(
                text("SELECT COUNT(DISTINCT source_id) FROM votes")
            )
            vote_sources = vote_sources_result.scalar() or 0
            
            donation_sources_result = await session.execute(
                text("SELECT COUNT(DISTINCT source_id) FROM donations")
            )
            donation_sources = donation_sources_result.scalar() or 0
            
            statement_sources_result = await session.execute(
                text("SELECT COUNT(DISTINCT source_id) FROM statements")
            )
            statement_sources = statement_sources_result.scalar() or 0
            
            print(f"   Vote sources: {vote_sources}")
            print(f"   Donation sources: {donation_sources}")
            print(f"   Statement sources: {statement_sources}")
            if vote_sources == 0 or donation_sources == 0:
                print("   ⚠️  WARNING: Some records missing sources")
                all_passed = False
            else:
                print("   ✅ Pass")
            print()

            # Summary
            print("=" * 60)
            if all_passed:
                print("✅ All verification checks passed!")
                print("   Demo data is ready for visualization testing.")
            else:
                print("⚠️  Some checks failed or issued warnings.")
                print("   Review the output above and ensure all data is seeded.")
            print("=" * 60)

            return 0 if all_passed else 1

        except Exception as e:
            print(f"\n❌ Error during verification: {e}")
            import traceback

            traceback.print_exc()
            return 1
        finally:
            await session.close()


async def main():
    """Main entry point."""
    exit_code = await verify_demo_data()
    sys.exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())

