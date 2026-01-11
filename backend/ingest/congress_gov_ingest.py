#!/usr/bin/env python3
"""
Congress.gov API Ingestion Pipeline

Fetches members, bills, and votes from Congress.gov API v3 and stores with full provenance.

Requirements:
    pip install requests psycopg2-binary python-dotenv

Environment variables (.env):
    CONGRESS_GOV_API_KEY=your_key_here
    DATABASE_URL=postgresql://user:pass@localhost/dbname

API Documentation:
    https://api.congress.gov/
    https://github.com/LibraryOfCongress/api.congress.gov
"""

import os
import sys
import json
import logging
from datetime import datetime, date
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import time

import requests
import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('congress_gov_ingest.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

# Configuration
CONGRESS_GOV_API_KEY = os.getenv('CONGRESS_GOV_API_KEY')
DATABASE_URL = os.getenv('DATABASE_URL')
BASE_URL = "https://api.congress.gov/v3"

# State name to 2-letter code mapping (including territories)
STATE_NAME_TO_CODE = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY',
    # Territories and districts
    'American Samoa': 'AS', 'District of Columbia': 'DC', 'Guam': 'GU',
    'Northern Mariana Islands': 'MP', 'Puerto Rico': 'PR', 'Virgin Islands': 'VI',
    'U.S. Virgin Islands': 'VI'
}
if not CONGRESS_GOV_API_KEY:
    raise ValueError("CONGRESS_GOV_API_KEY not found in environment")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment")

@dataclass
class Source:
    """Source record for provenance"""
    source_url: str
    publisher: str
    title: str
    source_type: str
    raw_text: str
    published_at: Optional[datetime] = None
    license_notes: str = "Congress.gov API - Public domain data"


def get_ordinal_suffix(n: int) -> str:
    """Get ordinal suffix (st, nd, rd, th) for a number"""
    if 11 <= n % 100 <= 13:
        return "th"
    if n % 10 == 1:
        return "st"
    if n % 10 == 2:
        return "nd"
    if n % 10 == 3:
        return "rd"
    return "th"


def format_congress_ordinal(congress: int) -> str:
    """Format congress number with proper ordinal suffix"""
    return f"{congress}{get_ordinal_suffix(congress)}"


class CongressGovClient:
    """Client for Congress.gov API v3"""
    
    def __init__(self, api_key: str, rate_limit_delay: float = 1.0):
        self.api_key = api_key
        self.rate_limit_delay = rate_limit_delay
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'User-Agent': 'CivicLens/1.0'
        })
        self.request_count = 0
        self.daily_limit = 1000
        
    def _request(self, endpoint: str, params: Optional[Dict] = None, retries: int = 3) -> Dict:
        """Make API request with retry logic and rate limiting"""
        url = f"{BASE_URL}/{endpoint}"
        
        # Add format parameter
        if params is None:
            params = {}
        params.setdefault('format', 'json')
        
        for attempt in range(retries):
            try:
                # Check daily limit
                if self.request_count >= self.daily_limit:
                    logger.error(f"Daily API limit reached ({self.daily_limit} requests)")
                    raise RuntimeError("Daily API limit exceeded")
                
                response = self.session.get(url, params=params, timeout=30)
                
                if response.status_code == 429:
                    wait_time = 2 ** attempt
                    logger.warning(f"Rate limited. Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                
                if response.status_code == 401:
                    logger.error("Invalid API key")
                    raise ValueError("Invalid CONGRESS_GOV_API_KEY")
                
                if response.status_code != 200:
                    logger.error(f"API returned {response.status_code}: {response.text[:500]}")
                
                response.raise_for_status()
                data = response.json()
                
                # Increment request counter
                self.request_count += 1
                
                # Rate limiting
                time.sleep(self.rate_limit_delay)
                
                return data
                
            except requests.exceptions.HTTPError as http_err:
                if http_err.response and 400 <= http_err.response.status_code < 500:
                    logger.error(f"Client error {http_err.response.status_code}: {http_err}. Not retrying.")
                    raise
                if attempt == retries - 1:
                    raise
                wait_time = 2 ** attempt
                logger.warning(f"Server error (attempt {attempt + 1}/{retries}): {http_err}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as transient_err:
                if attempt == retries - 1:
                    raise
                wait_time = 2 ** attempt
                logger.warning(f"Transient error (attempt {attempt + 1}/{retries}): {transient_err}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            except requests.exceptions.RequestException as e:
                if attempt == retries - 1:
                    raise
                wait_time = 2 ** attempt
                logger.warning(f"Request failed (attempt {attempt + 1}/{retries}): {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
        
        raise RuntimeError("Failed to fetch data after retries")
    
    def get_members(self, chamber: str = 'both', congress: int = 118) -> List[Dict]:
        """
        Get members of Congress
        
        Args:
            chamber: 'house', 'senate', or 'both'
            congress: Congress number (e.g., 118 for 2023-2024)
        """
        if chamber == 'both':
            members = []
            members.extend(self.get_members('house', congress))
            members.extend(self.get_members('senate', congress))
            return members
        
        endpoint = f"member"
        params = {
            'chamber': chamber,
            'congress': congress,
            'limit': 250  # Max per page
        }
        
        logger.info(f"Fetching {chamber} members for Congress {congress}")
        all_members = []
        offset = 0
        
        while True:
            params['offset'] = offset
            data = self._request(endpoint, params=params)
            members = data.get('members', [])
            
            if not members:
                break
            
            all_members.extend(members)
            
            # Check if there are more pages
            pagination = data.get('pagination', {})
            if not pagination.get('next'):
                break
            
            offset += len(members)
        
        logger.info(f"Retrieved {len(all_members)} {chamber} members")
        return all_members
    
    def get_member_details(self, member_id: int, congress: int = 118) -> Dict:
        """Get detailed info for a specific member"""
        logger.info(f"Fetching details for member {member_id}")
        endpoint = f"member/{member_id}"
        params = {'congress': congress}
        data = self._request(endpoint, params=params)
        return data.get('member', {})
    
    def get_bills(self, congress: int = 118, chamber: str = 'house', 
                  bill_type: str = 'hr', offset: int = 0, limit: int = 250) -> Dict:
        """
        Get bills for a Congress
        
        Args:
            congress: Congress number
            chamber: 'house' or 'senate'
            bill_type: 'hr' (House), 's' (Senate), 'hjres', 'sjres', 'hconres', 'sconres', 'hres', 'sres'
            offset: Offset for pagination
            limit: Items per page (max 250)
        """
        endpoint = f"bill/{congress}/{bill_type}"
        params = {
            'offset': offset,
            'limit': limit
        }
        logger.info(f"Fetching {bill_type} bills for Congress {congress}, offset {offset}")
        return self._request(endpoint, params=params)
    
    def get_bill_details(self, congress: int, bill_type: str, bill_number: int) -> Dict:
        """Get detailed info for a specific bill"""
        logger.info(f"Fetching details for bill {bill_type} {bill_number}")
        endpoint = f"bill/{congress}/{bill_type}/{bill_number}"
        data = self._request(endpoint)
        return data.get('bill', {})
    
    def get_votes(self, congress: int = 118, chamber: str = 'house', 
                  offset: int = 0, limit: int = 250) -> Dict:
        """Get roll call votes for a chamber"""
        endpoint = f"vote/{congress}/{chamber}"
        params = {
            'offset': offset,
            'limit': limit
        }
        logger.info(f"Fetching votes for {chamber}, Congress {congress}, offset {offset}")
        return self._request(endpoint, params=params)
    
    def get_vote_details(self, congress: int, chamber: str, session: int, roll_call: int) -> Dict:
        """Get detailed roll call vote"""
        logger.info(f"Fetching roll call vote {roll_call} for {chamber}")
        endpoint = f"vote/{congress}/{chamber}/{session}/{roll_call}"
        data = self._request(endpoint)
        return data.get('vote', {})


class DatabaseManager:
    """Database connection and operations manager"""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        if "+asyncpg" in self.connection_string:
            self.connection_string = self.connection_string.replace("+asyncpg", "")
        
        self.conn = None
        self._connect()
        
        # Allowed source_types (after 0003 migration)
        self.allowed_source_types = self._get_allowed_source_types()
    
    def _connect(self):
        """Establish database connection"""
        try:
            if self.conn:
                try:
                    self.conn.close()
                except:
                    pass
            
            self.conn = psycopg2.connect(self.connection_string, connect_timeout=30)
            self.conn.autocommit = False
            logger.info("Database connection established")
            
        except psycopg2.OperationalError as e:
            error_msg = str(e)
            if "could not translate host name" in error_msg.lower():
                logger.error(f"DNS resolution failed for database host. Error: {e}")
                logger.error("Troubleshooting:")
                logger.error("  1. Check your internet connection")
                logger.error("  2. Verify the DATABASE_URL hostname is correct")
                logger.error("  3. Check if your Supabase project is active (not paused)")
            raise
    
    def _ensure_connection(self):
        """Ensure connection is alive, reconnect if needed"""
        try:
            if self.conn is None or self.conn.closed:
                logger.warning("Connection lost, reconnecting...")
                self._connect()
                return
            
            # Test connection with simple query
            with self.conn.cursor() as cur:
                cur.execute("SELECT 1")
        except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
            logger.warning(f"Connection test failed ({e}), reconnecting...")
            self._connect()
    
    def _get_allowed_source_types(self) -> set:
        """Return allowed source_type values (after 0003 migration)"""
        # These are the types allowed after running 0003_add_member_source_type.sql
        # If you haven't run the migration, run: python backend/run_migration.py
        return {'bill', 'vote', 'member', 'donation', 'statement', 'profile', 'press_release', 'social_media'}
    
    def get_valid_source_type(self, preferred: str) -> str:
        """Get a valid source_type, mapping if needed"""
        # Mapping from our preferred types to potential alternatives
        # Includes common fallbacks to types that might exist in the DB
        type_mappings = {
            'profile': ['profile', 'member', 'statement'],  # statement as last resort
            'member': ['member', 'profile', 'statement'],   # statement as last resort
            'bill': ['bill', 'legislation'],
            'vote': ['vote', 'roll_call'],
        }
        
        # If preferred is allowed, use it
        if preferred in self.allowed_source_types:
            return preferred
        
        # Try alternatives
        alternatives = type_mappings.get(preferred, [])
        for alt in alternatives:
            if alt in self.allowed_source_types:
                logger.info(f"Mapping source_type '{preferred}' to '{alt}' (preferred not in allowed types)")
                return alt
        
        # Last resort: use first allowed type that's commonly used
        priority_fallbacks = ['statement', 'bill', 'vote', 'donation']
        for fallback in priority_fallbacks:
            if fallback in self.allowed_source_types:
                logger.warning(f"No valid mapping for '{preferred}', using fallback '{fallback}'")
                return fallback
        
        # Absolute last resort: use any allowed type
        if self.allowed_source_types:
            fallback = next(iter(self.allowed_source_types))
            logger.warning(f"No valid mapping for '{preferred}', using arbitrary '{fallback}'")
            return fallback
        
        return preferred  # Hope for the best
        
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.conn.rollback()
            logger.error("Transaction rolled back due to error")
        else:
            self.conn.commit()
            logger.info("Transaction committed")
        self.conn.close()
    
    def commit(self):
        """Commit current transaction"""
        self.conn.commit()
    
    def rollback(self):
        """Rollback current transaction"""
        self.conn.rollback()
    
    def create_source(self, source: Source) -> str:
        """Insert a source record and return its UUID as string"""
        with self.conn.cursor() as cur:
            # Check if source already exists
            cur.execute("""
                SELECT id FROM sources 
                WHERE source_url = %s
            """, (source.source_url,))
            existing = cur.fetchone()
            if existing:
                logger.debug(f"Source already exists: {source.source_url}")
                return str(existing[0])
            
            # Get valid source_type
            valid_source_type = self.get_valid_source_type(source.source_type)
            
            cur.execute("""
                INSERT INTO sources (source_url, publisher, title, source_type, published_at, 
                                   retrieved_at, license_notes, raw_text)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s, %s)
                RETURNING id
            """, (
                source.source_url,
                source.publisher,
                source.title,
                valid_source_type,
                source.published_at,
                source.license_notes,
                source.raw_text
            ))
            source_id = cur.fetchone()[0]
            logger.debug(f"Created source {source_id} for {source.title}")
            return str(source_id)
    
    def find_politician_by_name(self, name: str, state_code: str = None, party: str = None) -> Optional[str]:
        """Find politician by name (with optional state/party matching). Returns UUID as string."""
        with self.conn.cursor() as cur:
            if state_code and party:
                cur.execute("""
                    SELECT id FROM politicians 
                    WHERE (name = %s OR full_name = %s) AND (state_code = %s OR state = %s) AND party = %s
                    LIMIT 1
                """, (name, name, state_code, state_code, party))
            elif state_code:
                cur.execute("""
                    SELECT id FROM politicians 
                    WHERE (name = %s OR full_name = %s) AND (state_code = %s OR state = %s)
                    LIMIT 1
                """, (name, name, state_code, state_code))
            else:
                cur.execute("""
                    SELECT id FROM politicians 
                    WHERE name = %s OR full_name = %s
                    LIMIT 1
                """, (name, name))
            result = cur.fetchone()
            return str(result[0]) if result else None
    
    def upsert_politician(self, member_data: Dict, source_id: str) -> str:
        """Insert or update politician record. Returns politician UUID as string."""
        with self.conn.cursor() as cur:
            # Extract data from Congress.gov format
            # Try different name fields that Congress.gov API might use
            first_name = member_data.get('firstName', '')
            last_name = member_data.get('lastName', '')
            
            if first_name and last_name:
                name = f"{first_name} {last_name}".strip()
            elif member_data.get('name'):
                # Some APIs return combined name
                name = member_data.get('name', '')
            elif member_data.get('directOrderName'):
                # Congress.gov sometimes uses directOrderName (First Last)
                name = member_data.get('directOrderName', '')
            elif member_data.get('invertedOrderName'):
                # Or invertedOrderName (Last, First) - need to flip it
                inverted = member_data.get('invertedOrderName', '')
                if ', ' in inverted:
                    parts = inverted.split(', ')
                    name = f"{parts[1]} {parts[0]}" if len(parts) >= 2 else inverted
                else:
                    name = inverted
            else:
                logger.warning(f"No name found for member: {member_data.get('bioguideId', 'unknown')}")
                name = f"Unknown-{member_data.get('bioguideId', 'NA')}"
            
            raw_state = member_data.get('state', '')
            party_name = member_data.get('partyName', '')
            
            # Convert full state name to 2-letter code if needed
            if raw_state in STATE_NAME_TO_CODE:
                state_code = STATE_NAME_TO_CODE[raw_state]
            elif len(raw_state) == 2:
                state_code = raw_state.upper()
            else:
                # Unknown state, log warning and use first 2 chars uppercase
                logger.warning(f"Unknown state '{raw_state}' for {name}, using first 2 chars")
                state_code = raw_state[:2].upper() if raw_state else None
            
            # Normalize party to full name to match database check constraint
            if 'Democratic' in party_name or 'Democrat' in party_name:
                party = 'Democrat'
            elif 'Republican' in party_name:
                party = 'Republican'
            elif 'Independent' in party_name:
                party = 'Independent'
            else:
                party = 'Independent'  # Default to Independent for others
            
            # Determine position and district
            chamber = member_data.get('chamber', '').lower() if member_data.get('chamber') else ''
            district_number = member_data.get('district')
            if chamber == 'house' or chamber == 'house of representatives':
                position = 'Representative'
                # Keep district_number as-is for Representatives
            elif chamber == 'senate':
                position = 'Senator'
                district_number = None  # Senators don't have districts
            else:
                # Try to infer from other fields
                terms = member_data.get('terms', {}).get('item', [])
                if terms:
                    latest_chamber = terms[-1].get('chamber', '').lower() if terms else ''
                    if 'house' in latest_chamber:
                        position = 'Representative'
                        # Keep district_number as-is for Representatives
                    elif 'senate' in latest_chamber:
                        position = 'Senator'
                        district_number = None  # Senators don't have districts
                    else:
                        position = 'Representative'  # Default to Rep if unknown
                        # Keep district_number if provided, otherwise None is fine
                else:
                    position = 'Representative'  # Default
                    # No terms data and unknown chamber, set district to None only if not provided
                    if district_number is None:
                        district_number = None  # Already None, explicit for clarity
            
            # Check if exists
            existing_id = self.find_politician_by_name(name, state_code, party)
            
            if existing_id:
                # Update
                cur.execute("""
                    UPDATE politicians 
                    SET name = %s, party = %s, state_code = %s, 
                        district_number = %s, "position" = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id
                """, (name, party, state_code, district_number, position, existing_id))
                logger.info(f"Updated politician {name} ({existing_id})")
                return str(existing_id)
            else:
                # Insert with source_id (required by schema)
                cur.execute("""
                    INSERT INTO politicians (name, party, state_code, district_number, "position", source_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (name, party, state_code, district_number, position, source_id))
                politician_id = cur.fetchone()[0]
                logger.info(f"Created politician {name} -> {politician_id}")
                return str(politician_id)
    
    def get_bill_by_number(self, bill_number: str) -> Optional[str]:
        """Get bill ID (UUID) by bill number"""
        with self.conn.cursor() as cur:
            cur.execute("SELECT id FROM bills WHERE bill_number = %s", (bill_number,))
            result = cur.fetchone()
            return str(result[0]) if result else None
    
    def insert_bill(self, bill_data: Dict, source_id: str, sponsor_id: Optional[str] = None) -> Optional[str]:
        """Insert bill record. Returns bill ID (UUID) or raises ValueError if bill_number is missing."""
        with self.conn.cursor() as cur:
            # Format bill number (e.g., "HR 1234" or "S. 567")
            bill_type = bill_data.get('type', '').upper()
            bill_number_raw = bill_data.get('number', '')
            bill_number = f"{bill_type} {bill_number_raw}" if bill_number_raw else None
            
            if not bill_number:
                logger.warning(f"Bill missing number: {bill_data.get('title', 'Unknown')}")
                raise ValueError(f"Bill missing required bill_number: {bill_data.get('title', 'Unknown')}")
            
            # Check if exists
            existing_id = self.get_bill_by_number(bill_number)
            if existing_id:
                logger.debug(f"Bill {bill_number} already exists")
                return existing_id
            
            title = bill_data.get('title', '')
            introduced_date = bill_data.get('introducedDate')
            if introduced_date:
                try:
                    # Parse ISO date format
                    introduced_date = datetime.fromisoformat(introduced_date.replace('Z', '+00:00')).date()
                except (ValueError, TypeError):
                    introduced_date = None
            
            # Extract topic from subjects if available (simplified like ProPublica)
            topics = bill_data.get('subjects', [])
            topic = topics[0] if topics else None
            
            # Use simplified insert matching the actual database schema
            cur.execute("""
                INSERT INTO bills (bill_number, title, topic, introduced_date, source_id)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (bill_number, title, topic, introduced_date, source_id))
            bill_id = cur.fetchone()[0]
            logger.info(f"Created bill {bill_number} -> {bill_id}")
            return str(bill_id)
    
    def insert_vote(self, vote_data: Dict, politician_id: str, bill_id: str, 
                   source_id: str, roll_call_number: Optional[int] = None):
        """Insert vote record"""
        with self.conn.cursor() as cur:
            # Map Congress.gov vote to our schema
            position = vote_data.get('vote', '').lower()
            if position not in ['yes', 'no', 'abstain', 'not_voting']:
                if position in ['yea', 'y', 'yes']:
                    position = 'yes'
                elif position in ['nay', 'n', 'no']:
                    position = 'no'
                elif position in ['present', 'abstain']:
                    position = 'abstain'
                else:
                    position = 'not_voting'
            
            vote_date = vote_data.get('date')
            if vote_date:
                try:
                    vote_date = datetime.fromisoformat(vote_date.replace('Z', '+00:00')).date()
                except (ValueError, TypeError):
                    vote_date = None
            
            # Check if vote already exists
            cur.execute("""
                SELECT id FROM votes 
                WHERE politician_id = %s AND bill_id = %s 
                  AND (vote_date IS NOT DISTINCT FROM %s)
                  AND (roll_call_number IS NOT DISTINCT FROM %s)
            """, (politician_id, bill_id, vote_date, roll_call_number))
            
            if cur.fetchone():
                logger.debug(f"Vote already exists for politician {politician_id} on bill {bill_id}, roll_call {roll_call_number}")
                return
            
            # Map position to vote_value format for backward compatibility
            vote_value_map = {
                'yes': 'Yes',
                'no': 'No',
                'abstain': 'Abstain',
                'not_voting': 'Not Present'
            }
            vote_value = vote_value_map.get(position, 'Not Present')
            
            cur.execute("""
                INSERT INTO votes (politician_id, bill_id, vote_position, vote_value, vote_date, 
                                 roll_call_number, source_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (politician_id, bill_id, position, vote_value, vote_date, roll_call_number, source_id))
            logger.debug(f"Created vote for politician {politician_id} on bill {bill_id}, roll_call {roll_call_number}: {position}")


class IngestionPipeline:
    """Main ingestion orchestrator"""
    
    def __init__(self, api_client: CongressGovClient, db_manager: DatabaseManager):
        self.api = api_client
        self.db = db_manager
        
    def ingest_members(self, chamber: str = 'both', congress: int = 118):
        """Ingest members (politicians) for a chamber"""
        logger.info(f"=== Starting members ingestion for {chamber}, Congress {congress} ===")
        
        members = self.api.get_members(chamber, congress)
        logger.info(f"Found {len(members)} members")
        
        success_count = 0
        error_count = 0
        batch_size = 50  # Commit every N members
        
        for i, member in enumerate(members):
            member_id = member.get('bioguideId', '')
            try:
                # Ensure connection is alive (check every batch)
                if i % batch_size == 0:
                    self.db._ensure_connection()
                
                # Create source record
                source = Source(
                    source_url=f"https://www.congress.gov/member/{member.get('firstName', '')}-{member.get('lastName', '')}/{member_id}",
                    publisher="Congress.gov",
                    title=f"{member.get('firstName', '')} {member.get('lastName', '')} - Member Profile",
                    source_type="member",
                    raw_text=json.dumps(member, indent=2)
                )
                source_id = self.db.create_source(source)
                
                # Upsert politician
                politician_id = self.db.upsert_politician(member, source_id)
                
                success_count += 1
                
                # Commit in batches to avoid large transactions
                if success_count % batch_size == 0:
                    self.db.commit()
                    logger.info(f"Progress: {success_count}/{len(members)} members ingested")
                
            except (psycopg2.OperationalError, psycopg2.InterfaceError) as conn_err:
                # Connection error - try to reconnect and retry this member
                error_count += 1
                logger.error(f"Connection error for member {member_id}: {conn_err}")
                try:
                    self.db._ensure_connection()
                except Exception as reconnect_err:
                    logger.error(f"Reconnection failed: {reconnect_err}")
                    break  # Stop if we can't reconnect
                continue
                
            except Exception as e:
                error_count += 1
                logger.error(f"Failed to ingest member {member_id}: {e}")
                # Rollback current transaction and start fresh
                try:
                    self.db.rollback()
                except:
                    pass
                continue
        
        # Final commit
        try:
            self.db.commit()
        except Exception as e:
            logger.error(f"Final commit failed: {e}")
        
        logger.info(f"=== Members ingestion complete ({success_count} succeeded, {error_count} failed) ===")
    
    def ingest_bills(self, congress: int = 118, chamber: str = 'house', 
                     bill_type: str = 'hr', max_pages: int = 3):
        """Ingest bills with pagination"""
        logger.info(f"=== Starting bills ingestion for {chamber}, Congress {congress} ===")
        
        offset = 0
        page = 0
        limit = 250
        success_count = 0
        error_count = 0
        
        while page < max_pages:
            try:
                # Ensure connection before each page
                self.db._ensure_connection()
                
                data = self.api.get_bills(congress, chamber, bill_type, offset, limit)
                bills = data.get('bills', [])
                
                if not bills:
                    logger.info("No more bills to fetch")
                    break
                
                logger.info(f"Processing page {page + 1} with {len(bills)} bills")
                
                for bill in bills:
                    bill_number = bill.get('number', '')
                    try:
                        # Create source record
                        bill_type_code = bill.get('type', '').upper()
                        source = Source(
                            source_url=f"https://www.congress.gov/bill/{format_congress_ordinal(congress)}-congress/{chamber}-bill/{bill_type_code.lower()}{bill_number}",
                            publisher="Congress.gov",
                            title=f"Bill {bill_type_code} {bill_number}: {bill.get('title', '')}",
                            source_type="bill",
                            raw_text=json.dumps(bill, indent=2),
                            published_at=datetime.fromisoformat(bill.get('introducedDate', '').replace('Z', '+00:00')) if bill.get('introducedDate') else None
                        )
                        source_id = self.db.create_source(source)
                        
                        # Try to find sponsor
                        sponsor_id = None
                        sponsors = bill.get('sponsors', [])
                        if sponsors:
                            sponsor = sponsors[0]
                            sponsor_name = f"{sponsor.get('firstName', '')} {sponsor.get('lastName', '')}".strip()
                            sponsor_state = sponsor.get('state')
                            sponsor_id = self.db.find_politician_by_name(sponsor_name, sponsor_state)
                        
                        # Insert bill (may raise ValueError if bill_number is missing)
                        bill_id = self.db.insert_bill(bill, source_id, sponsor_id)
                        if bill_id is not None:
                            success_count += 1
                        else:
                            error_count += 1
                            logger.warning(f"insert_bill returned None for bill {bill_number}")
                        
                    except ValueError as val_err:
                        # Missing bill_number or other validation error
                        error_count += 1
                        logger.warning(f"Validation error for bill: {val_err}")
                        continue
                        
                    except (psycopg2.OperationalError, psycopg2.InterfaceError) as conn_err:
                        error_count += 1
                        logger.error(f"Connection error for bill {bill_number}: {conn_err}")
                        try:
                            self.db._ensure_connection()
                        except:
                            break
                        continue
                        
                    except Exception as e:
                        error_count += 1
                        logger.error(f"Failed to ingest bill {bill_number}: {e}")
                        try:
                            self.db.rollback()
                        except:
                            pass
                        continue
                
                # Commit after each page
                try:
                    self.db.commit()
                    logger.info(f"Page {page + 1} committed: {success_count} bills so far")
                except Exception as e:
                    logger.error(f"Commit failed: {e}")
                
                # Check if there are more pages
                pagination = data.get('pagination', {})
                if not pagination.get('next'):
                    break
                
                offset += len(bills)
                page += 1
                
            except Exception as e:
                logger.error(f"Failed to fetch bills page {page}: {e}")
                break
        
        # Final commit
        try:
            self.db.commit()
        except Exception as e:
            logger.error(f"Final commit failed: {e}")
        
        logger.info(f"=== Bills ingestion complete ({success_count} succeeded, {error_count} failed) ===")
    
    def ingest_votes_from_roll_call(self, congress: int, chamber: str, session: int, roll_call: int):
        """Ingest votes from a specific roll call"""
        logger.info(f"=== Starting vote ingestion for roll call {roll_call} ===")
        
        try:
            vote_data = self.api.get_vote_details(congress, chamber, session, roll_call)
            
            # Get bill info from vote
            bills = vote_data.get('bills', [])
            if not bills:
                logger.warning("No bill associated with this vote")
                return
            
            bill_ref = bills[0]
            bill_type = bill_ref.get('type', '').upper()
            bill_number_raw = bill_ref.get('number', '')
            bill_number = f"{bill_type} {bill_number_raw}"
            
            # Find or create bill
            bill_id = self.db.get_bill_by_number(bill_number)
            if not bill_id:
                # Create a minimal bill record from vote data
                source = Source(
                    source_url=f"https://www.congress.gov/vote/{congress}/{chamber}/{session}/{roll_call}",
                    publisher="Congress.gov",
                    title=f"Roll Call Vote {roll_call}",
                    source_type="vote",
                    raw_text=json.dumps(vote_data, indent=2)
                )
                source_id = self.db.create_source(source)
                
                bill_data = {
                    'type': bill_type,
                    'number': bill_number_raw,
                    'title': vote_data.get('description', 'Unknown Bill'),
                    'congress': congress
                }
                bill_id = self.db.insert_bill(bill_data, source_id)
            
            # Create source for vote
            source = Source(
                source_url=f"https://www.congress.gov/vote/{congress}/{chamber}/{session}/{roll_call}",
                publisher="Congress.gov",
                title=f"Roll Call Vote {roll_call} - {vote_data.get('description', '')}",
                source_type="vote",
                raw_text=json.dumps(vote_data, indent=2)
            )
            source_id = self.db.create_source(source)
            
            # Process individual votes
            positions = vote_data.get('votes', {}).get('positions', [])
            for position in positions:
                member_name = f"{position.get('firstName', '')} {position.get('lastName', '')}".strip()
                state_code = position.get('state')
                
                # Try to find politician
                politician_id = self.db.find_politician_by_name(member_name, state_code=state_code)
                
                if politician_id:
                    vote_record = {
                        'vote': position.get('vote', ''),
                        'date': vote_data.get('date', '')
                    }
                    self.db.insert_vote(vote_record, politician_id, bill_id, source_id, roll_call_number=roll_call)
                else:
                    logger.warning(f"Could not find politician: {member_name} (state: {state_code})")
            
            logger.info(f"Processed {len(positions)} votes")
            
            # Commit the transaction after successfully processing all votes
            self.db.commit()
            logger.info(f"=== Vote ingestion for roll call {roll_call} committed ===")
            
        except Exception as e:
            logger.error(f"Failed to ingest votes for roll call {roll_call}: {e}")
            # Rollback to avoid partial transactions
            try:
                self.db.rollback()
                logger.info("Transaction rolled back")
            except Exception as rollback_err:
                logger.error(f"Rollback failed: {rollback_err}")
            raise


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Congress.gov API Ingestion')
    parser.add_argument('--congress', type=int, default=118, help='Congress number (default: 118)')
    parser.add_argument('--chamber', choices=['house', 'senate', 'both'], default='both',
                       help='Chamber to ingest (default: both)')
    parser.add_argument('--members-only', action='store_true', help='Only ingest members')
    parser.add_argument('--bills-only', action='store_true', help='Only ingest bills')
    parser.add_argument('--bill-type', choices=['hr', 's', 'hjres', 'sjres', 'hconres', 'sconres', 'hres', 'sres'],
                       default=None, help='Bill type (default: hr for house, s for senate)')
    parser.add_argument('--max-pages', type=int, default=3, help='Max pages of bills to fetch')
    
    args = parser.parse_args()
    
    logger.info("=== Congress.gov Ingestion Pipeline Started ===")
    
    # Initialize clients
    api_client = CongressGovClient(CONGRESS_GOV_API_KEY)
    
    with DatabaseManager(DATABASE_URL) as db:
        pipeline = IngestionPipeline(api_client, db)
        
        try:
            if not args.bills_only:
                # Ingest members
                pipeline.ingest_members(args.chamber, args.congress)
            
            if not args.members_only:
                # Ingest bills
                for chamber in (['house', 'senate'] if args.chamber == 'both' else [args.chamber]):
                    # If user specified a bill_type, use it for all chambers
                    # Otherwise, use the default per-chamber type
                    if args.bill_type:
                        bill_type = args.bill_type
                    else:
                        bill_type = 'hr' if chamber == 'house' else 's'
                    pipeline.ingest_bills(args.congress, chamber, bill_type, args.max_pages)
                    
        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            raise
    
    logger.info("=== Congress.gov Ingestion Pipeline Complete ===")


if __name__ == "__main__":
    main()

