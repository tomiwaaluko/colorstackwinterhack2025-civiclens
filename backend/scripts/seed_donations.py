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

# All 50 US states plus DC for complete geographic coverage
ALL_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

# State names for display
STATE_NAMES = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
}

# State population tiers for realistic donation scaling (higher population = more donations)
STATE_POPULATION_TIERS = {
    # Tier 1: Large states (multiplier 3.0)
    'CA': 3.0, 'TX': 3.0, 'FL': 2.8, 'NY': 2.8, 'PA': 2.0, 'IL': 2.0, 'OH': 2.0, 'GA': 2.0, 'NC': 2.0, 'MI': 1.8,
    # Tier 2: Medium-large states (multiplier 1.5)
    'NJ': 1.5, 'VA': 1.5, 'WA': 1.5, 'AZ': 1.5, 'MA': 1.5, 'TN': 1.4, 'IN': 1.3, 'MO': 1.3, 'MD': 1.3, 'WI': 1.3,
    'CO': 1.3, 'MN': 1.2, 'SC': 1.2, 'AL': 1.1, 'LA': 1.1, 'KY': 1.1, 'OR': 1.1, 'OK': 1.0, 'CT': 1.0, 'UT': 1.0,
    # Tier 3: Medium states (multiplier 0.8-1.0)
    'IA': 0.9, 'NV': 0.9, 'AR': 0.9, 'MS': 0.8, 'KS': 0.8, 'NM': 0.7, 'NE': 0.7, 'ID': 0.6, 'WV': 0.6, 'HI': 0.6,
    'NH': 0.6, 'ME': 0.6, 'RI': 0.5, 'MT': 0.5, 'DE': 0.5, 'SD': 0.4, 'ND': 0.4, 'AK': 0.4, 'VT': 0.3, 'WY': 0.3,
    # DC is special (high political activity despite small size)
    'DC': 2.5
}

# Major donors per category (realistic PAC and organization names)
MAJOR_DONORS = {
    'Healthcare': [
        'Blue Cross Blue Shield PAC', 'American Medical Association PAC', 'Pfizer Inc. PAC',
        'Johnson & Johnson PAC', 'UnitedHealth Group PAC', 'CVS Health PAC',
        'American Hospital Association PAC', 'Kaiser Permanente PAC', 'Anthem Inc. PAC'
    ],
    'Energy': [
        'Exxon Mobil PAC', 'Chevron Corporation PAC', 'ConocoPhillips PAC',
        'American Petroleum Institute PAC', 'Southern Company PAC', 'Duke Energy PAC',
        'NextEra Energy PAC', 'Dominion Energy PAC', 'Clean Energy PAC'
    ],
    'Technology': [
        'Google PAC', 'Microsoft PAC', 'Apple Inc. PAC', 'Meta (Facebook) PAC',
        'Amazon PAC', 'Intel Corporation PAC', 'Cisco Systems PAC', 'Oracle PAC',
        'Salesforce PAC', 'NVIDIA PAC'
    ],
    'Finance': [
        'JPMorgan Chase PAC', 'Bank of America PAC', 'Goldman Sachs PAC',
        'Citigroup PAC', 'Wells Fargo PAC', 'Morgan Stanley PAC',
        'American Bankers Association PAC', 'Credit Union National Association PAC'
    ],
    'Telecommunications': [
        'AT&T PAC', 'Verizon PAC', 'Comcast PAC', 'T-Mobile PAC',
        'Charter Communications PAC', 'NCTA PAC'
    ],
    'Labor': [
        'AFL-CIO PAC', 'SEIU PAC', 'AFSCME PAC', 'NEA PAC',
        'Teamsters PAC', 'IBEW PAC', 'UAW PAC', 'Carpenters Union PAC'
    ],
    'Real Estate': [
        'National Association of Realtors PAC', 'National Association of Home Builders PAC',
        'Mortgage Bankers Association PAC', 'CBRE Group PAC'
    ],
    'Defense': [
        'Lockheed Martin PAC', 'Boeing PAC', 'Raytheon PAC', 'Northrop Grumman PAC',
        'General Dynamics PAC', 'BAE Systems PAC'
    ],
    'Transportation': [
        'United Airlines PAC', 'Delta Air Lines PAC', 'FedEx PAC', 'UPS PAC',
        'Union Pacific PAC', 'BNSF Railway PAC'
    ],
    'Interest Groups': [
        'National Rifle Association PAC', 'AARP PAC', 'Planned Parenthood PAC',
        'NARAL Pro-Choice America PAC', 'Sierra Club PAC', 'NRA-ILA PAC'
    ],
    'Progressive': [
        'ActBlue', 'MoveOn.org PAC', 'Progressive Change Campaign Committee',
        'Emily\'s List', 'Democracy for America PAC'
    ],
    'Manufacturing': [
        'General Electric PAC', 'Caterpillar PAC', 'Honeywell PAC',
        'National Association of Manufacturers PAC', '3M PAC'
    ],
    'Food & Beverage': [
        'Coca-Cola PAC', 'PepsiCo PAC', 'Starbucks PAC', 'McDonald\'s PAC',
        'Tyson Foods PAC', 'Anheuser-Busch PAC'
    ],
    'Entertainment': [
        'Walt Disney Company PAC', 'Comcast/NBCUniversal PAC', 'Netflix PAC',
        'Motion Picture Association PAC', 'Live Nation PAC'
    ],
    'Consumer Goods': [
        'Procter & Gamble PAC', 'Walmart PAC', 'Target PAC', 'Home Depot PAC',
        'Amazon PAC', 'Costco PAC'
    ],
    'Environment': [
        'Sierra Club PAC', 'League of Conservation Voters', 'Natural Resources Defense Council PAC',
        'Environmental Defense Fund PAC', 'Clean Energy PAC'
    ]
}


async def create_demo_sources(session):
    """Create demo source records for donations if they don't exist.

    Sources are based on official FEC (Federal Election Commission) data:
    https://www.fec.gov/data/
    """
    sources = [
        # Official FEC sources (primary data source for campaign finance)
        {
            'url': 'https://www.fec.gov/data/receipts/?data_type=processed&two_year_transaction_period=2024',
            'publisher': 'Federal Election Commission',
            'title': 'FEC Campaign Finance Receipts 2023-2024 Election Cycle',
            'type': 'donation'
        },
        {
            'url': 'https://www.fec.gov/data/receipts/?data_type=processed&two_year_transaction_period=2022',
            'publisher': 'Federal Election Commission',
            'title': 'FEC Campaign Finance Receipts 2021-2022 Election Cycle',
            'type': 'donation'
        },
        # OpenSecrets aggregate data (derived from FEC)
        {
            'url': 'https://www.opensecrets.org/federal-lobbying',
            'publisher': 'OpenSecrets (Center for Responsive Politics)',
            'title': 'OpenSecrets Campaign Finance Analysis',
            'type': 'donation'
        },
        # Demo data notice
        {
            'url': 'https://civiclens.org/data-sources',
            'publisher': 'CivicLens',
            'title': 'CivicLens Demo Data - Based on FEC Patterns',
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


async def generate_all_state_donations(session, politicians, source_id):
    """
    Generate donation data for all 50 US states + DC.

    Creates realistic donation distribution based on:
    - State population (larger states get more donations)
    - Multiple donor categories per state
    - Data spanning 2022-2024
    - Multiple politicians receiving donations from each state

    Data structure follows FEC (Federal Election Commission) patterns.
    Source: https://www.fec.gov/data/
    """

    if not politicians:
        print("   No politicians found - skipping state donation generation")
        return 0

    inserted_count = 0
    years = [2022, 2023, 2024]

    print(f"   Generating donations for {len(ALL_STATES)} states...")

    for state_code in ALL_STATES:
        # Get population multiplier for this state
        pop_multiplier = STATE_POPULATION_TIERS.get(state_code, 0.5)

        # Calculate number of donations for this state (5-30 based on population)
        base_donations = 5
        num_donations = int(base_donations + (pop_multiplier * 10))

        for _ in range(num_donations):
            # Select random politician
            politician = random.choice(politicians)
            politician_id = politician[0]

            # Select random category and donor
            category = random.choice(DONOR_CATEGORIES)
            donors_for_category = MAJOR_DONORS.get(category, ['General PAC', 'Citizens PAC'])
            donor_name = random.choice(donors_for_category)

            # Generate realistic amount (scaled by state population)
            base_amount = random.uniform(5000, 50000)
            amount = round(base_amount * pop_multiplier, 2)

            # Random date within the years
            year = random.choice(years)
            month = random.randint(1, 12)
            day = random.randint(1, 28)  # Safe for all months
            donation_date = date(year, month, day)

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
                        'politician_id': politician_id,
                        'donor_name': donor_name,
                        'donor_category': category,
                        'amount': amount,
                        'date': donation_date,
                        'state_code': state_code,
                        'source_id': source_id
                    }
                )
                inserted_count += 1
            except Exception as e:
                # Continue silently on duplicates
                pass

    return inserted_count


async def seed_donations(session, politicians, source_id):
    """Seed donation data (legacy manual entries for specific politicians)."""

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
                    'politician_id': donation['politician_id'],
                    'donor_name': donation['donor_name'],
                    'donor_category': donation['category'],  # Map 'category' to 'donor_category'
                    'amount': donation['amount'],
                    'date': donation['date'],
                    'state_code': donation['state_code'],
                    'source_id': source_id
                }
            )
            inserted_count += 1
        except Exception as e:
            print(f"[WARN] Could not insert donation {donation['donor_name']}: {e}")
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
                print("[ERROR] politicians table not found!")
                print("   Please run migrations first")
                sys.exit(1)
            
            # Get politicians
            politicians = await get_politicians(session)
            if not politicians:
                print("[ERROR] No politicians found in database!")
                print("   Please run the JSON migration script first: python scripts/migrate_json_to_db.py")
                sys.exit(1)

            print(f"[INFO] Found {len(politicians)} politicians in database")
            for pol in politicians:
                print(f"   - {pol[1]} (ID: {pol[0]}, State: {pol[2]})")
            print()

            # Create demo sources
            print("[INFO] Creating demo source records...")
            source_id = await create_demo_sources(session)
            await session.commit()
            print(f"[OK] Created/verified source (ID: {source_id})")
            print()

            # Generate comprehensive donations for all 50 states + DC
            print("[INFO] Generating donations for all 50 US states + DC...")
            inserted_count = await generate_all_state_donations(session, politicians, source_id)
            await session.commit()
            print(f"[OK] Generated {inserted_count} donation records across all states")
            print()

            # Summary statistics
            print("[STATS] Summary Statistics:")
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
            print(f"\n[ERROR] Error during seeding: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
    
    print("=" * 60)
    print("Seed Complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

