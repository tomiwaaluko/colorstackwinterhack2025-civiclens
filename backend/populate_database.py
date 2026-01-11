"""
Comprehensive Database Population Script

Fetches politician data from multiple sources and populates the Supabase database:
1. Congress.gov API - Federal legislators (Senators & Representatives) [RECOMMENDED]
2. OpenStates API - State legislators
3. Google Civic Information API - For geocoding and district lookup

Note: ProPublica Congress API was discontinued in 2024. This script uses Congress.gov API.

Usage:
    python populate_database.py --federal --limit 50
    python populate_database.py --state NY --limit 20
    python populate_database.py --all

Requirements:
    pip install requests python-dotenv asyncpg sqlalchemy
"""

import asyncio
import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
import requests
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# API Configuration
CONGRESS_GOV_API_KEY = os.getenv('CONGRESS_GOV_API_KEY')
OPENSTATES_API_KEY = os.getenv('OPENSTATES_API_KEY')
GOOGLE_CIVIC_API_KEY = os.getenv('GOOGLE_CIVIC_API_KEY')


class DataPopulator:
    """Main class for populating the database with politician data"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.state_capitals = {}

    async def load_state_capitals(self):
        """Load state capitals for default geolocation"""
        result = await self.db.execute(
            text("SELECT state_code, latitude, longitude FROM state_capitals")
        )
        for row in result.fetchall():
            self.state_capitals[row.state_code] = {
                'latitude': float(row.latitude),
                'longitude': float(row.longitude)
            }
        logger.info(f"Loaded {len(self.state_capitals)} state capitals")

    async def create_source(self, source_url: str, publisher: str, title: str,
                          source_type: str, raw_text: str) -> str:
        """Create a source record and return its UUID"""
        result = await self.db.execute(
            text("""
                INSERT INTO sources (source_url, publisher, title, source_type, raw_text)
                VALUES (:url, :publisher, :title, :type, :raw)
                RETURNING id
            """),
            {
                "url": source_url,
                "publisher": publisher,
                "title": title,
                "type": source_type,
                "raw": raw_text
            }
        )
        await self.db.commit()
        return str(result.scalar())

    async def politician_exists(self, external_id: str, source: str = 'congress.gov') -> bool:
        """Check if politician already exists"""
        result = await self.db.execute(
            text("""
                SELECT COUNT(*) FROM politicians
                WHERE external_id = :ext_id AND external_id_source = :source
            """),
            {"ext_id": external_id, "source": source}
        )
        count = result.scalar()
        return count > 0

    async def insert_politician(self, data: Dict) -> str:
        """Insert a politician record"""
        # Get state capital coordinates if no explicit coordinates provided
        lat, lng = data.get('latitude'), data.get('longitude')
        if not lat and data.get('state') in self.state_capitals:
            capital = self.state_capitals[data['state']]
            lat, lng = capital['latitude'], capital['longitude']

        source_id = await self.create_source(
            source_url=data.get('url', 'https://www.congress.gov'),
            publisher=data.get('publisher', 'Congress.gov'),
            title=f"{data['full_name']} Profile",
            source_type='profile',
            raw_text=json.dumps(data, indent=2)
        )

        result = await self.db.execute(
            text("""
                INSERT INTO politicians (
                    external_id, external_id_source, full_name, party, state,
                    current_office, image_url, latitude, longitude, source_id
                )
                VALUES (:ext_id, :ext_source, :name, :party, :state, :office, :image, :lat, :lng, :source_id)
                RETURNING id
            """),
            {
                "ext_id": data.get('external_id'),
                "ext_source": data.get('external_id_source', 'congress.gov'),
                "name": data['full_name'],
                "party": data.get('party'),
                "state": data.get('state'),
                "office": data.get('current_office'),
                "image": data.get('image_url'),
                "lat": lat,
                "lng": lng,
                "source_id": source_id
            }
        )
        await self.db.commit()
        politician_id = str(result.scalar())
        logger.info(f"✓ Created: {data['full_name']} ({data.get('party')}) - {data.get('state')}")
        return politician_id

    async def fetch_congress_members(self, chamber: str = 'both', limit: int = 50):
        """
        Fetch current members of Congress using Congress.gov API
        chamber: 'senate', 'house', or 'both'
        """
        if not CONGRESS_GOV_API_KEY:
            logger.warning("CONGRESS_GOV_API_KEY not set, skipping Congress data")
            logger.info("Get your free API key at: https://api.congress.gov/sign-up/")
            return

        logger.info(f"Fetching Congress members from Congress.gov API ({chamber})...")

        chambers = ['senate', 'house'] if chamber == 'both' else [chamber]

        count = 0
        for ch in chambers:
            try:
                # Congress.gov API endpoint for members
                # Using the member endpoint without chamber specification
                url = "https://api.congress.gov/v3/member"
                params = {
                    'api_key': CONGRESS_GOV_API_KEY,
                    'limit': limit * 2,  # Get more to filter by chamber
                    'currentMember': 'true'
                }

                response = requests.get(url, params=params, timeout=30)
                response.raise_for_status()
                data = response.json()

                # Filter by chamber
                all_members = data.get('members', [])
                members = [m for m in all_members if ch in m.get('terms', {}).get('item', [{}])[-1].get('chamber', '').lower()]
                if not members:
                    # Fallback: just use all members if filtering doesn't work
                    members = all_members
                logger.info(f"Found {len(members)} {ch} members")

                for member in members[:limit]:
                    if count >= limit:
                        break

                    # Check if already exists
                    ext_id = member.get('bioguideId')
                    if not ext_id:
                        continue

                    if await self.politician_exists(ext_id, 'congress.gov'):
                        logger.info(f"↪ Skipping {member.get('name', 'Unknown')} (already exists)")
                        continue

                    # Parse party affiliation
                    party_code = member.get('partyName', 'Unknown')
                    party_map = {
                        'Democratic': 'Democrat',
                        'Republican': 'Republican',
                        'Independent': 'Independent'
                    }
                    party = party_map.get(party_code, 'Other')

                    politician_data = {
                        'external_id': ext_id,
                        'external_id_source': 'congress.gov',
                        'full_name': member.get('name', 'Unknown'),
                        'party': party,
                        'state': member.get('state'),
                        'current_office': f"U.S. {'Senator' if ch == 'senate' else 'Representative'}",
                        'image_url': member.get('depiction', {}).get('imageUrl'),
                        'url': member.get('url', 'https://www.congress.gov'),
                        'publisher': 'Congress.gov API'
                    }

                    await self.insert_politician(politician_data)
                    count += 1

            except Exception as e:
                logger.error(f"Error fetching {ch} members: {e}")
                continue

        logger.info(f"Imported {count} Congress members")

    async def fetch_state_legislators(self, state_code: str, limit: int = 50):
        """Fetch state legislators from OpenStates API"""
        if not OPENSTATES_API_KEY:
            logger.warning("OPENSTATES_API_KEY not set, skipping state data")
            return

        logger.info(f"Fetching {state_code} legislators from OpenStates...")

        headers = {'X-API-Key': OPENSTATES_API_KEY}
        url = "https://v3.openstates.org/people"

        try:
            # Build jurisdiction ID
            jurisdiction = f"ocd-jurisdiction/country:us/state:{state_code.lower()}/government"

            response = requests.get(
                url,
                headers=headers,
                params={'jurisdiction': jurisdiction, 'per_page': limit},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()

            legislators = data.get('results', [])
            logger.info(f"Found {len(legislators)} {state_code} legislators")

            count = 0
            for person in legislators:
                if count >= limit:
                    break

                try:
                    # Check if already exists
                    if await self.politician_exists(person['id'], 'openstates'):
                        logger.info(f"↪ Skipping {person.get('name', 'Unknown')} (already exists)")
                        continue

                    # Extract office title
                    current_role = person.get('current_role', {})
                    office_title = current_role.get('title', 'State Legislator')

                    # Normalize party to allowed values: Democrat, Republican, Independent, Other
                    raw_party = person.get('party', 'Other')
                    if 'Democrat' in raw_party:
                        party = 'Democrat'
                    elif 'Republican' in raw_party:
                        party = 'Republican'
                    elif 'Independent' in raw_party:
                        party = 'Independent'
                    else:
                        party = 'Other'

                    politician_data = {
                        'external_id': person['id'],
                        'external_id_source': 'openstates',
                        'full_name': person.get('name', 'Unknown'),
                        'party': party,
                        'state': state_code.upper(),
                        'current_office': office_title,
                        'image_url': person.get('image'),
                        'url': f"https://openstates.org/person/{person['id']}/",
                        'publisher': 'OpenStates'
                    }

                    await self.insert_politician(politician_data)
                    count += 1
                except Exception as e:
                    logger.error(f"Error inserting {person.get('name', 'Unknown')}: {e}")
                    await self.db.rollback()
                    continue

            logger.info(f"Imported {count} {state_code} legislators")

        except Exception as e:
            logger.error(f"Error fetching {state_code} legislators: {e}")

    async def populate_sample_data(self):
        """Populate database with diverse sample of politicians"""
        logger.info("=== Starting Database Population ===")

        await self.load_state_capitals()

        # 1. Fetch federal legislators (Senate + House)
        logger.info("\n[1/3] Fetching Federal Legislators...")
        await self.fetch_congress_members(chamber='both', limit=100)

        # 2. Fetch state legislators from key states
        logger.info("\n[2/3] Fetching State Legislators...")
        key_states = ['CA', 'NY', 'TX', 'FL', 'PA']
        for state in key_states:
            await self.fetch_state_legislators(state, limit=20)

        # 3. Summary
        logger.info("\n[3/3] Population Complete!")
        await self.print_summary()

    async def print_summary(self):
        """Print summary of database contents"""
        result = await self.db.execute(text("SELECT COUNT(*) FROM politicians"))
        pol_count = result.scalar()

        result = await self.db.execute(text("SELECT COUNT(*) FROM votes"))
        vote_count = result.scalar()

        result = await self.db.execute(text("SELECT COUNT(*) FROM statements"))
        stmt_count = result.scalar()

        logger.info("\n" + "=" * 70)
        logger.info("DATABASE SUMMARY")
        logger.info("=" * 70)
        logger.info(f"Politicians: {pol_count}")
        logger.info(f"Votes: {vote_count}")
        logger.info(f"Statements: {stmt_count}")
        logger.info("=" * 70)


async def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Populate CivicLens database with politician data')
    parser.add_argument('--federal', action='store_true', help='Fetch federal legislators only')
    parser.add_argument('--state', type=str, help='Fetch legislators for specific state (e.g., NY)')
    parser.add_argument('--all', action='store_true', help='Fetch comprehensive data (default)')
    parser.add_argument('--limit', type=int, default=50, help='Limit per source (default: 50)')

    args = parser.parse_args()

    async with AsyncSessionLocal() as db:
        populator = DataPopulator(db)
        await populator.load_state_capitals()

        if args.federal:
            await populator.fetch_congress_members('both', args.limit)
        elif args.state:
            await populator.fetch_state_legislators(args.state, args.limit)
        else:
            # Default: populate sample data
            await populator.populate_sample_data()

        await populator.print_summary()


if __name__ == "__main__":
    asyncio.run(main())
