"""
Test script to verify Supabase database connection and query data.

Run this script to test:
1. Database connectivity
2. Ability to query tables
3. Data retrieval from politicians, votes, bills, statements, donations tables
"""

import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal, DATABASE_URL


async def test_connection():
    """Test database connection and basic queries"""
    print("=" * 70)
    print("SUPABASE DATABASE CONNECTION TEST")
    print("=" * 70)
    print(f"\nDatabase URL: {DATABASE_URL[:50]}...")

    async with AsyncSessionLocal() as session:
        try:
            # Test 1: Basic connection
            print("\n[TEST 1] Testing database connection...")
            result = await session.execute(text("SELECT 1"))
            print("✓ Database connection successful!")

            # Test 2: Check if tables exist
            print("\n[TEST 2] Checking if tables exist...")
            tables = ['politicians', 'votes', 'bills', 'statements', 'donations', 'sources']
            for table in tables:
                result = await session.execute(
                    text(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = :table_name)"),
                    {"table_name": table}
                )
                exists = result.scalar()
                status = "✓" if exists else "✗"
                print(f"{status} Table '{table}' {'exists' if exists else 'does not exist'}")

            # Test 3: Count records in each table
            print("\n[TEST 3] Counting records in each table...")
            for table in tables:
                try:
                    result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    print(f"  {table}: {count} records")
                except Exception as e:
                    print(f"  {table}: Error - {str(e)}")

            # Test 4: Get sample politician data
            print("\n[TEST 4] Retrieving sample politician data...")
            result = await session.execute(
                text("SELECT id, full_name, party, state, current_office FROM politicians LIMIT 5")
            )
            politicians = result.fetchall()

            if politicians:
                print(f"✓ Found {len(politicians)} politicians:")
                for pol in politicians:
                    print(f"  - {pol.full_name} ({pol.party}) - {pol.state or 'National'} - {pol.current_office or 'N/A'}")
                    print(f"    ID: {pol.id}")
            else:
                print("⚠ No politicians found in database")

            # Test 5: Test votes query
            print("\n[TEST 5] Testing votes query...")
            result = await session.execute(
                text("""
                    SELECT v.id, p.full_name, b.title, v.vote_position
                    FROM votes v
                    JOIN politicians p ON v.politician_id = p.id
                    LEFT JOIN bills b ON v.bill_id = b.id
                    LIMIT 5
                """)
            )
            votes = result.fetchall()

            if votes:
                print(f"✓ Found {len(votes)} votes:")
                for vote in votes:
                    bill_title = vote.title or "Unknown Bill"
                    print(f"  - {vote.full_name} voted {vote.vote_position or 'Unknown'} on '{bill_title[:50]}'")
            else:
                print("⚠ No votes found in database")

            # Test 6: Test statements query
            print("\n[TEST 6] Testing statements query...")
            result = await session.execute(
                text("""
                    SELECT s.statement_text, p.full_name, s.statement_date
                    FROM statements s
                    JOIN politicians p ON s.politician_id = p.id
                    ORDER BY s.statement_date DESC NULLS LAST
                    LIMIT 3
                """)
            )
            statements = result.fetchall()

            if statements:
                print(f"✓ Found {len(statements)} statements:")
                for stmt in statements:
                    statement_preview = stmt.statement_text[:80] + "..." if len(stmt.statement_text) > 80 else stmt.statement_text
                    print(f"  - {stmt.full_name}: \"{statement_preview}\"")
            else:
                print("⚠ No statements found in database")

            # Test 7: Test donations query
            print("\n[TEST 7] Testing donations query...")
            result = await session.execute(
                text("""
                    SELECT d.donor_name, d.amount, p.full_name, d.donation_date
                    FROM donations d
                    JOIN politicians p ON d.politician_id = p.id
                    ORDER BY d.amount DESC NULLS LAST
                    LIMIT 5
                """)
            )
            donations = result.fetchall()

            if donations:
                print(f"✓ Found {len(donations)} donations:")
                for don in donations:
                    amount = f"${don.amount:,.2f}" if don.amount else "Unknown amount"
                    print(f"  - {don.donor_name} → {don.full_name}: {amount}")
            else:
                print("⚠ No donations found in database")

            print("\n" + "=" * 70)
            print("CONNECTION TEST COMPLETED SUCCESSFULLY!")
            print("=" * 70)

        except Exception as e:
            print(f"\n✗ Error during testing: {e}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            print("\n" + "=" * 70)
            print("CONNECTION TEST FAILED")
            print("=" * 70)


if __name__ == "__main__":
    asyncio.run(test_connection())
