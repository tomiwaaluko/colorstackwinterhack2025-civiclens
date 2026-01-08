#!/usr/bin/env python3
"""
Donation Data Seed Script
Seeds the database with demo donation data for visualization testing.

This script:
1. Creates demo source records for donations
2. Seeds donation data across multiple states, categories, and years
3. Links donations to existing politicians
4. Ensures all donations have geographic information (state_code)
"""

import asyncio
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
import random

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

# Donor categories
DONOR_CATEGORIES = [
    'Healthcare', 'Energy', 'Technology', 'Finance', 'Telecommunications',
    'Labor', 'Real Estate', 'Interest Groups', 'Aerospace', 'Defense',
    'Manufacturing', 'Entertainment', 'Transportation', 'Consumer Goods',
    'Food & Beverage', 'Progressive', 'Environment'
]

# State codes for diverse geographic distribution
STATES = [
    'CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI',
    'DE', 'WA', 'DC', 'KY', 'VA', 'MA', 'MD', 'NJ', 'AZ', 'CO'
]


async def create_demo_sources(session):
    """Create demo source records for donations if they don't exist."""
    sources = [
        {
            'url': 'https://demo.civiclens.org/donations/opensecrets-2024',
            'publisher': 'CivicLens Demo',
            'title': 'OpenSecrets Campaign Finance Data 2024',
            'type': 'donation'
        },
        {
            'url': 'https://demo.civiclens.org/donations/opensecrets-2023',
            'publisher': 'CivicLens Demo',
            'title': 'OpenSecrets Campaign Finance Data 2023',
            'type': 'donation'
        },
        {
            'url': 'https://demo.civiclens.org/donations/opensecrets-2022',
            'publisher': 'CivicLens Demo',
            'title': 'OpenSecrets Campaign Finance Data 2022',
            'type': 'donation'
        }
    ]
    
    for source in sources:
        await session.execute(
            text("""
                INSERT INTO sources (source_url, publisher, title, source_type, retrieved_at)
                VALUES (:url, :publisher, :title, :type, CURRENT_TIMESTAMP)
                ON CONFLICT DO NOTHING
            """),
            source
        )
    
    # Get source ID for donations
    result = await session.execute(
        text("SELECT id FROM sources WHERE source_type = 'donation' LIMIT 1")
    )
    source_id = result.scalar()
    return source_id


async def get_politicians(session):
    """Get all politicians from the database."""
    result = await session.execute(
        text("""
            SELECT id, name, state_code, "position"
            FROM politicians
            ORDER BY id
        """)
    )
    return result.fetchall()


async def seed_donations(session, politicians, source_id):
    """Seed donation data."""
    
    # Demo donation data - structured to meet requirements:
    # - Donations across 5-10+ states
    # - Multiple categories per politician
    # - Donations spanning multiple years
    # - At least 2-3 politicians with donation data
    
    donations = [
        # Joe Biden (ID: 1, Delaware)
        {
            'politician_id': 1, 'donor_name': 'Blue Cross Blue Shield PAC',
            'category': 'Healthcare', 'amount': 25000.00, 'date': date(2024, 1, 15), 'state_code': 'DE'
        },
        {
            'politician_id': 1, 'donor_name': 'Exxon Mobil PAC',
            'category': 'Energy', 'amount': 15000.00, 'date': date(2024, 2, 20), 'state_code': 'TX'
        },
        {
            'politician_id': 1, 'donor_name': 'Microsoft PAC',
            'category': 'Technology', 'amount': 30000.00, 'date': date(2024, 3, 10), 'state_code': 'WA'
        },
        {
            'politician_id': 1, 'donor_name': 'AFL-CIO PAC',
            'category': 'Labor', 'amount': 50000.00, 'date': date(2024, 4, 5), 'state_code': 'DC'
        },
        {
            'politician_id': 1, 'donor_name': 'AT&T PAC',
            'category': 'Telecommunications', 'amount': 20000.00, 'date': date(2024, 5, 12), 'state_code': 'TX'
        },
        {
            'politician_id': 1, 'donor_name': 'United Airlines PAC',
            'category': 'Transportation', 'amount': 28000.00, 'date': date(2024, 2, 25), 'state_code': 'IL'
        },
        
        # Kamala Harris (ID: 2, California)
        {
            'politician_id': 2, 'donor_name': 'Google PAC',
            'category': 'Technology', 'amount': 40000.00, 'date': date(2023, 6, 15), 'state_code': 'CA'
        },
        {
            'politician_id': 2, 'donor_name': 'Apple Inc. PAC',
            'category': 'Technology', 'amount': 35000.00, 'date': date(2023, 7, 20), 'state_code': 'CA'
        },
        {
            'politician_id': 2, 'donor_name': 'Kaiser Permanente PAC',
            'category': 'Healthcare', 'amount': 28000.00, 'date': date(2023, 8, 10), 'state_code': 'CA'
        },
        {
            'politician_id': 2, 'donor_name': 'Tesla Inc.',
            'category': 'Energy', 'amount': 25000.00, 'date': date(2024, 1, 25), 'state_code': 'CA'
        },
        {
            'politician_id': 2, 'donor_name': 'National Association of Realtors PAC',
            'category': 'Real Estate', 'amount': 30000.00, 'date': date(2024, 2, 14), 'state_code': 'DC'
        },
        {
            'politician_id': 2, 'donor_name': 'Starbucks PAC',
            'category': 'Food & Beverage', 'amount': 20000.00, 'date': date(2023, 12, 10), 'state_code': 'WA'
        },
        {
            'politician_id': 2, 'donor_name': 'Comcast PAC',
            'category': 'Telecommunications', 'amount': 45000.00, 'date': date(2023, 10, 15), 'state_code': 'PA'
        },
        
        # Mitch McConnell (ID: 3, Kentucky)
        {
            'politician_id': 3, 'donor_name': 'Coal Industry PAC',
            'category': 'Energy', 'amount': 75000.00, 'date': date(2022, 9, 10), 'state_code': 'KY'
        },
        {
            'politician_id': 3, 'donor_name': 'JPMorgan Chase PAC',
            'category': 'Finance', 'amount': 50000.00, 'date': date(2022, 10, 15), 'state_code': 'NY'
        },
        {
            'politician_id': 3, 'donor_name': 'Citigroup PAC',
            'category': 'Finance', 'amount': 45000.00, 'date': date(2023, 3, 20), 'state_code': 'NY'
        },
        {
            'politician_id': 3, 'donor_name': 'American Medical Association PAC',
            'category': 'Healthcare', 'amount': 30000.00, 'date': date(2023, 5, 12), 'state_code': 'IL'
        },
        {
            'politician_id': 3, 'donor_name': 'National Rifle Association PAC',
            'category': 'Interest Groups', 'amount': 60000.00, 'date': date(2024, 6, 8), 'state_code': 'VA'
        },
        {
            'politician_id': 3, 'donor_name': 'General Electric PAC',
            'category': 'Manufacturing', 'amount': 35000.00, 'date': date(2023, 4, 20), 'state_code': 'MA'
        },
        {
            'politician_id': 3, 'donor_name': 'Procter & Gamble PAC',
            'category': 'Consumer Goods', 'amount': 32000.00, 'date': date(2023, 7, 22), 'state_code': 'OH'
        },
        
        # Nancy Pelosi (ID: 4, California 12th)
        {
            'politician_id': 4, 'donor_name': 'Meta (Facebook) PAC',
            'category': 'Technology', 'amount': 55000.00, 'date': date(2023, 4, 18), 'state_code': 'CA'
        },
        {
            'politician_id': 4, 'donor_name': 'Goldman Sachs PAC',
            'category': 'Finance', 'amount': 45000.00, 'date': date(2023, 5, 22), 'state_code': 'NY'
        },
        {
            'politician_id': 4, 'donor_name': 'Verizon PAC',
            'category': 'Telecommunications', 'amount': 35000.00, 'date': date(2023, 9, 15), 'state_code': 'VA'
        },
        {
            'politician_id': 4, 'donor_name': 'American Hospital Association PAC',
            'category': 'Healthcare', 'amount': 40000.00, 'date': date(2024, 3, 10), 'state_code': 'DC'
        },
        {
            'politician_id': 4, 'donor_name': 'Amazon PAC',
            'category': 'Technology', 'amount': 60000.00, 'date': date(2024, 4, 20), 'state_code': 'WA'
        },
        {
            'politician_id': 4, 'donor_name': 'Walt Disney Company PAC',
            'category': 'Entertainment', 'amount': 40000.00, 'date': date(2023, 6, 18), 'state_code': 'FL'
        },
        {
            'politician_id': 4, 'donor_name': 'Coca-Cola PAC',
            'category': 'Food & Beverage', 'amount': 35000.00, 'date': date(2024, 3, 15), 'state_code': 'GA'
        },
        
        # Kevin McCarthy (ID: 5, California 20th)
        {
            'politician_id': 5, 'donor_name': 'Chevron PAC',
            'category': 'Energy', 'amount': 70000.00, 'date': date(2022, 11, 5), 'state_code': 'CA'
        },
        {
            'politician_id': 5, 'donor_name': 'Wells Fargo PAC',
            'category': 'Finance', 'amount': 50000.00, 'date': date(2023, 1, 18), 'state_code': 'CA'
        },
        {
            'politician_id': 5, 'donor_name': 'American Bankers Association PAC',
            'category': 'Finance', 'amount': 45000.00, 'date': date(2023, 6, 12), 'state_code': 'DC'
        },
        {
            'politician_id': 5, 'donor_name': 'Pharmaceutical Research PAC',
            'category': 'Healthcare', 'amount': 38000.00, 'date': date(2023, 8, 25), 'state_code': 'DC'
        },
        {
            'politician_id': 5, 'donor_name': 'National Association of Home Builders PAC',
            'category': 'Construction', 'amount': 32000.00, 'date': date(2024, 2, 28), 'state_code': 'DC'
        },
        {
            'politician_id': 5, 'donor_name': 'Lockheed Martin PAC',
            'category': 'Defense', 'amount': 55000.00, 'date': date(2022, 12, 5), 'state_code': 'MD'
        },
        {
            'politician_id': 5, 'donor_name': 'Bank of America PAC',
            'category': 'Finance', 'amount': 50000.00, 'date': date(2023, 5, 18), 'state_code': 'NC'
        },
        
        # Alexandria Ocasio-Cortez (ID: 6, New York 14th)
        {
            'politician_id': 6, 'donor_name': 'ActBlue',
            'category': 'Progressive', 'amount': 25000.00, 'date': date(2023, 7, 10), 'state_code': 'MA'
        },
        {
            'politician_id': 6, 'donor_name': 'MoveOn.org PAC',
            'category': 'Progressive', 'amount': 15000.00, 'date': date(2023, 9, 20), 'state_code': 'NY'
        },
        {
            'politician_id': 6, 'donor_name': 'Sierra Club PAC',
            'category': 'Environment', 'amount': 20000.00, 'date': date(2024, 1, 15), 'state_code': 'CA'
        },
        {
            'politician_id': 6, 'donor_name': 'NARAL Pro-Choice America PAC',
            'category': 'Interest Groups', 'amount': 18000.00, 'date': date(2024, 3, 8), 'state_code': 'DC'
        },
        {
            'politician_id': 6, 'donor_name': 'Progressive Change Campaign Committee',
            'category': 'Progressive', 'amount': 22000.00, 'date': date(2024, 5, 22), 'state_code': 'MA'
        },
        {
            'politician_id': 6, 'donor_name': 'Planned Parenthood PAC',
            'category': 'Interest Groups', 'amount': 30000.00, 'date': date(2024, 4, 12), 'state_code': 'NY'
        },
    ]
    
    inserted_count = 0
    
    for donation in donations:
        try:
            await session.execute(
                text("""
                    INSERT INTO donations (
                        politician_id, donor_name, donor_category, amount, date, state_code, source_id
                    ) VALUES (
                        :politician_id, :donor_name, :donor_category, :amount, :date, :state_code, :source_id
                    )
                """),
                {
                    **donation,
                    'source_id': source_id
                }
            )
            inserted_count += 1
        except Exception as e:
            print(f"⚠️  Warning: Could not insert donation {donation['donor_name']}: {e}")
            # Continue with other donations
    
    return inserted_count


async def main():
    """Main seed function."""
    print("=" * 60)
    print("Donation Data Seed Script")
    print("=" * 60)
    print()
    
    async with AsyncSessionLocal() as session:
        try:
            # Check if politicians table exists
            result = await session.execute(
                text("""
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'politicians'
                """)
            )
            if result.scalar() == 0:
                print("❌ ERROR: politicians table not found!")
                print("   Please run migrations first")
                sys.exit(1)
            
            # Get politicians
            politicians = await get_politicians(session)
            if not politicians:
                print("❌ ERROR: No politicians found in database!")
                print("   Please run the JSON migration script first: python scripts/migrate_json_to_db.py")
                sys.exit(1)
            
            print(f"📊 Found {len(politicians)} politicians in database")
            for pol in politicians:
                print(f"   - {pol[1]} (ID: {pol[0]}, State: {pol[2]})")
            print()
            
            # Create demo sources
            print("📝 Creating demo source records...")
            source_id = await create_demo_sources(session)
            await session.commit()
            print(f"✅ Created/verified source (ID: {source_id})")
            print()
            
            # Seed donations
            print("💰 Seeding donation data...")
            inserted_count = await seed_donations(session, politicians, source_id)
            await session.commit()
            print(f"✅ Inserted {inserted_count} donation records")
            print()
            
            # Summary statistics
            print("📊 Summary Statistics:")
            result = await session.execute(
                text("""
                    SELECT 
                        COUNT(*) as total_donations,
                        COUNT(DISTINCT politician_id) as politicians_with_donations,
                        COUNT(DISTINCT state_code) as states_covered,
                        COUNT(DISTINCT donor_category) as categories,
                        MIN(date) as earliest_date,
                        MAX(date) as latest_date,
                        SUM(amount) as total_amount
                    FROM donations
                """)
            )
            stats = result.fetchone()
            print(f"   Total donations: {stats[0]}")
            print(f"   Politicians with donations: {stats[1]}")
            print(f"   States covered: {stats[2]}")
            print(f"   Donor categories: {stats[3]}")
            print(f"   Date range: {stats[4]} to {stats[5]}")
            print(f"   Total amount: ${stats[6]:,.2f}")
            print()
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error during seeding: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
    
    print("=" * 60)
    print("Seed Complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

