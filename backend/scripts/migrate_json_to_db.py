#!/usr/bin/env python3
"""
Migration script to migrate data from JSON files to PostgreSQL database.
This script normalizes state/district fields and creates proper source references.
"""

import asyncio
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

# State name to code mapping
STATE_NAME_TO_CODE = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
    "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
    "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC"
}


def parse_state_district(state_or_district: str) -> tuple[str | None, int | None]:
    """
    Parse state_or_district string into (state_code, district_number).
    
    Examples:
        "Delaware" -> ("DE", None)
        "California 12th" -> ("CA", 12)
        "New York 14th" -> ("NY", 14)
    """
    if not state_or_district:
        return None, None
    
    # Try to extract district number
    match = re.search(r'(\d+)(?:st|nd|rd|th)?', state_or_district)
    district_number = int(match.group(1)) if match else None
    
    # Remove district number and strip
    state_name = re.sub(r'\s*\d+(?:st|nd|rd|th)?', '', state_or_district).strip()
    
    # Convert state name to code
    state_code = STATE_NAME_TO_CODE.get(state_name)
    
    return state_code, district_number


async def create_demo_source(session, source_type: str, politician_name: str = None) -> int:
    """Create a demo source record and return its ID."""
    if politician_name:
        title = f"Demo data for {politician_name} - {source_type}"
        url = f"https://demo.civiclens.org/{source_type}/{politician_name.lower().replace(' ', '-')}"
    else:
        title = f"Demo data - {source_type}"
        url = f"https://demo.civiclens.org/{source_type}/demo"
    
    result = await session.execute(
        text("""
            INSERT INTO sources (source_url, publisher, title, source_type, retrieved_at)
            VALUES (:url, :publisher, :title, :type, :retrieved_at)
            RETURNING id
        """),
        {
            "url": url,
            "publisher": "CivicLens Demo Data",
            "title": title,
            "type": source_type,
            "retrieved_at": datetime.utcnow()
        }
    )
    return result.scalar()


async def migrate_politicians():
    """Migrate politicians from JSON to database."""
    json_path = Path(__file__).parent.parent / "app" / "data" / "politicians.json"
    
    if not json_path.exists():
        print(f"❌ JSON file not found: {json_path}")
        return
    
    with open(json_path, 'r') as f:
        politicians_data = json.load(f)
    
    print(f"📊 Found {len(politicians_data)} politicians to migrate")
    print()
    
    async with AsyncSessionLocal() as session:
        try:
            politician_id_map = {}  # Map old JSON ID to new DB ID
            
            for pol_data in politicians_data:
                # Parse state/district
                state_code, district_number = parse_state_district(
                    pol_data.get("state_or_district", "")
                )
                
                print(f"Migrating: {pol_data['name']} ({state_code}, district: {district_number})")
                
                # Insert politician (note: position is a reserved word, must quote)
                result = await session.execute(
                    text("""
                        INSERT INTO politicians (
                            id, name, party, state_code, district_number, 
                            "position", image_url
                        ) VALUES (
                            :id, :name, :party, :state_code, :district_number,
                            :position, :image_url
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            party = EXCLUDED.party,
                            state_code = EXCLUDED.state_code,
                            district_number = EXCLUDED.district_number,
                            "position" = EXCLUDED."position",
                            image_url = EXCLUDED.image_url
                        RETURNING id
                    """),
                    {
                        "id": pol_data["id"],
                        "name": pol_data["name"],
                        "party": pol_data["party"],
                        "state_code": state_code,
                        "district_number": district_number,
                        "position": pol_data["position"],
                        "image_url": pol_data.get("image_url")
                    }
                )
                new_id = result.scalar()
                politician_id_map[pol_data["id"]] = new_id
                
                # Create sources for demo data
                vote_source_id = await create_demo_source(session, "vote", pol_data["name"])
                statement_source_id = await create_demo_source(session, "statement", pol_data["name"])
                
                # Migrate statements (from politician_details.statements)
                if "politician_details" in pol_data and "statements" in pol_data["politician_details"]:
                    for stmt_text in pol_data["politician_details"]["statements"]:
                        await session.execute(
                            text("""
                                INSERT INTO statements (
                                    politician_id, text, date, source_id
                                ) VALUES (
                                    :politician_id, :text, :date, :source_id
                                )
                            """),
                            {
                                "politician_id": new_id,
                                "text": stmt_text,
                                "date": datetime.utcnow().date(),
                                "source_id": statement_source_id
                            }
                        )
                
                # Migrate votes (from politician_details.votes)
                if "politician_details" in pol_data and "votes" in pol_data["politician_details"]:
                    votes_list = pol_data["politician_details"]["votes"]
                    # Expecting format: ["Bill Name", "Yes"/"No"]
                    for i in range(0, len(votes_list) - 1, 2):
                        bill_name = votes_list[i]
                        vote_position = votes_list[i + 1].lower() if i + 1 < len(votes_list) else "yes"
                        
                        # Create or get bill
                        bill_result = await session.execute(
                            text("""
                                INSERT INTO bills (bill_number, title, introduced_date, source_id)
                                VALUES (:number, :title, :date, :source_id)
                                ON CONFLICT (bill_number) DO UPDATE SET title = EXCLUDED.title
                                RETURNING id
                            """),
                            {
                                "number": f"DEMO-{bill_name.replace(' ', '-')}",
                                "title": bill_name,
                                "date": datetime.utcnow().date(),
                                "source_id": await create_demo_source(session, "bill", bill_name)
                            }
                        )
                        bill_id = bill_result.scalar()
                        
                        # Create vote
                        await session.execute(
                            text("""
                                INSERT INTO votes (
                                    politician_id, bill_id, vote_position, 
                                    vote_date, source_id
                                ) VALUES (
                                    :politician_id, :bill_id, :vote_position,
                                    :vote_date, :source_id
                                )
                            """),
                            {
                                "politician_id": new_id,
                                "bill_id": bill_id,
                                "vote_position": vote_position,
                                "vote_date": datetime.utcnow().date(),
                                "source_id": vote_source_id
                            }
                        )
            
            await session.commit()
            print()
            print(f"✅ Successfully migrated {len(politicians_data)} politicians")
            print(f"   Created politician ID mapping: {politician_id_map}")
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error during migration: {str(e)}")
            raise


async def main():
    """Main migration function."""
    print("=" * 60)
    print("JSON to Database Migration")
    print("=" * 60)
    print()
    
    # Check if tables exist
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'politicians'")
        )
        if result.scalar() == 0:
            print("❌ ERROR: Database tables not found!")
            print("   Please run migrations/0002_create_schema.sql first")
            sys.exit(1)
    
    await migrate_politicians()
    
    print()
    print("=" * 60)
    print("Migration Complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

