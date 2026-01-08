#!/usr/bin/env python3
"""
Geographic Data Normalization Script
Normalizes existing politician records to use standardized state codes and district numbers.

This script:
1. Updates politicians with NULL or invalid state_code values
2. Parses state_or_district-like strings if they exist in other fields
3. Validates all state codes against the state_codes reference table
4. Reports any records that couldn't be normalized
"""

import asyncio
import os
import re
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

# State name to code mapping (comprehensive)
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
    "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC", "DC": "DC"
}

# Reverse mapping for validation
CODE_TO_STATE = {v: k for k, v in STATE_NAME_TO_CODE.items()}


def parse_state_district(state_or_district: str) -> tuple[str | None, int | None]:
    """
    Parse state_or_district string into (state_code, district_number).
    
    Examples:
        "Delaware" -> ("DE", None)
        "California 12th" -> ("CA", 12)
        "New York 14th" -> ("NY", 14)
        "CA" -> ("CA", None)
        "CA-12" -> ("CA", 12)
    """
    if not state_or_district:
        return None, None
    
    # If it's already a 2-letter code, return it
    state_or_district = state_or_district.strip()
    if len(state_or_district) == 2 and state_or_district.upper() in CODE_TO_STATE:
        return state_or_district.upper(), None
    
    # Try to extract district number (handles "12th", "12", "CA-12", etc.)
    district_match = re.search(r'[- ](\d+)(?:st|nd|rd|th)?', state_or_district)
    district_number = int(district_match.group(1)) if district_match else None
    
    # Remove district number and clean up
    state_name = re.sub(r'[- ]\d+(?:st|nd|rd|th)?', '', state_or_district).strip()
    
    # Convert state name to code
    state_code = STATE_NAME_TO_CODE.get(state_name)
    if not state_code and state_name.upper() in CODE_TO_STATE:
        state_code = state_name.upper()
    
    return state_code, district_number


async def normalize_politicians():
    """Normalize all politician records with geographic data."""
    async with AsyncSessionLocal() as session:
        try:
            # Get all politicians
            result = await session.execute(
                text("""
                    SELECT id, name, state_code, district_number, "position"
                    FROM politicians
                    ORDER BY id
                """)
            )
            politicians = result.fetchall()
            
            print(f"📊 Found {len(politicians)} politicians to normalize")
            print()
            
            updated_count = 0
            skipped_count = 0
            error_count = 0
            
            for pol in politicians:
                pol_id, name, current_state_code, current_district, position = pol
                
                # Skip if already has valid state code
                if current_state_code:
                    # Validate it exists in state_codes table
                    validation = await session.execute(
                        text("SELECT COUNT(*) FROM state_codes WHERE code = :code"),
                        {"code": current_state_code}
                    )
                    if validation.scalar() > 0:
                        print(f"✓ {name}: Already has valid state_code ({current_state_code})")
                        skipped_count += 1
                        continue
                    else:
                        print(f"⚠ {name}: Invalid state_code ({current_state_code}), will try to fix")
                
                # Try to infer from position if it's a federal office
                state_code = None
                district_number = None
                
                # Attempt 1: Parse from current state_code/district if they exist but are invalid
                if current_state_code:
                    parsed_code, parsed_district = parse_state_district(current_state_code)
                    if parsed_code:
                        state_code = parsed_code
                        district_number = parsed_district or current_district
                
                # Attempt 2: Try to extract state from position string (e.g., "Senator from California")
                if not state_code and position:
                    # Match patterns like "Senator from STATE" or "Representative from STATE"
                    position_match = re.search(r'(?:Senator|Representative|Governor)\s+(?:from|of)\s+([A-Za-z\s]+)', position, re.IGNORECASE)
                    if position_match:
                        state_name = position_match.group(1).strip()
                        state_code = STATE_NAME_TO_CODE.get(state_name)
                    
                    # Also try to find a district number in position (e.g., "Representative, 12th District")
                    if not district_number:
                        district_match = re.search(r'(\d+)(?:st|nd|rd|th)?\s*District', position, re.IGNORECASE)
                        if district_match:
                            district_number = int(district_match.group(1))
                
                # Attempt 3: For federal positions without state, mark as needing review
                if not state_code and position:
                    # President and Vice President are federal without state
                    if position.lower() in ('president', 'vice president'):
                        print(f"✓ {name}: Federal position ({position}) - no state_code needed")
                        skipped_count += 1
                        continue
                
                # If all inference attempts failed, mark for manual review
                if not state_code:
                    # Check if we have any other data to infer from
                    # This is a placeholder - in real scenario, you might have
                    # additional data sources to cross-reference
                    print(f"⚠ {name}: Could not determine state_code automatically")
                    print(f"   Current: state_code={current_state_code}, district={current_district}")
                    print(f"   Position: {position}")
                    print(f"   → Manual review needed")
                    error_count += 1
                    continue
                
                # Update the record
                await session.execute(
                    text("""
                        UPDATE politicians
                        SET state_code = :state_code,
                            district_number = :district_number,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = :id
                    """),
                    {
                        "id": pol_id,
                        "state_code": state_code,
                        "district_number": district_number
                    }
                )
                
                print(f"✓ {name}: Updated to state_code={state_code}, district={district_number}")
                updated_count += 1
            
            await session.commit()
            
            print()
            print("=" * 60)
            print("Normalization Summary")
            print("=" * 60)
            print(f"✅ Updated: {updated_count}")
            print(f"⏭  Skipped (already valid): {skipped_count}")
            print(f"⚠️  Needs manual review: {error_count}")
            print()
            
            if error_count > 0:
                print("NOTE: Some records need manual review.")
                print("      You may need to update them manually or provide additional data sources.")
                print()
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error during normalization: {str(e)}")
            raise


async def validate_all_state_codes():
    """Validate all state codes in the database against the reference table."""
    async with AsyncSessionLocal() as session:
        try:
            # Check politicians
            result = await session.execute(
                text("""
                    SELECT p.id, p.name, p.state_code
                    FROM politicians p
                    WHERE p.state_code IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM state_codes sc WHERE sc.code = p.state_code
                      )
                """)
            )
            invalid_politicians = result.fetchall()
            
            # Check donations
            result = await session.execute(
                text("""
                    SELECT COUNT(DISTINCT d.state_code) as invalid_count
                    FROM donations d
                    WHERE d.state_code IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM state_codes sc WHERE sc.code = d.state_code
                      )
                """)
            )
            invalid_donations_count = result.scalar()
            
            print("=" * 60)
            print("State Code Validation")
            print("=" * 60)
            
            if invalid_politicians:
                print(f"\n⚠️  Found {len(invalid_politicians)} politicians with invalid state codes:")
                for pol in invalid_politicians:
                    print(f"   - {pol[1]} (ID: {pol[0]}, state_code: {pol[2]})")
            else:
                print("\n✅ All politician state codes are valid")
            
            if invalid_donations_count > 0:
                print(f"\n⚠️  Found {invalid_donations_count} donations with invalid state codes")
            else:
                print("\n✅ All donation state codes are valid")
            
            print()
            
        except Exception as e:
            print(f"\n❌ Error during validation: {str(e)}")
            raise


async def main():
    """Main normalization function."""
    print("=" * 60)
    print("Geographic Data Normalization")
    print("=" * 60)
    print()
    
    # Check if state_codes table exists
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'state_codes'
            """)
        )
        if result.scalar() == 0:
            print("❌ ERROR: state_codes table not found!")
            print("   Please run migrations/0003_geographic_standardization.sql first")
            sys.exit(1)
    
    # Validate existing data first
    await validate_all_state_codes()
    
    print()
    # Normalize politicians
    await normalize_politicians()
    
    print()
    # Validate again after normalization
    await validate_all_state_codes()
    
    print("=" * 60)
    print("Normalization Complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

