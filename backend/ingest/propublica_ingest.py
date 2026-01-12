#!/usr/bin/env python3
"""
ProPublica Congress API Ingestion Pipeline

Fetches members, bills, and votes from ProPublica Congress API and stores with full provenance.

Requirements:
    pip install requests psycopg2-binary python-dotenv

Environment variables (.env):
    PROPUBLICA_API_KEY=your_key_here
    DATABASE_URL=postgresql://user:pass@localhost/dbname

API Documentation:
    https://projects.propublica.org/api-docs/congress-api/
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
        logging.FileHandler('propublica_ingest.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

# Configuration
PROPUBLICA_API_KEY = os.getenv('PROPUBLICA_API_KEY')
DATABASE_URL = os.getenv('DATABASE_URL')
BASE_URL = "https://api.propublica.org/congress/v1"

if not PROPUBLICA_API_KEY:
    raise ValueError("PROPUBLICA_API_KEY not found in environment")
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
    license_notes: str = "ProPublica Congress API - Data licensed under Creative Commons"


def get_ordinal_suffix(n: int) -> str:
    """Get ordinal suffix (st, nd, rd, th) for a number"""
    # Handle special cases 11-13
    if 11 <= n % 100 <= 13:
        return "th"
    # Handle 1st, 2nd, 3rd
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


class ProPublicaClient:
    """Client for ProPublica Congress API"""
    
    def __init__(self, api_key: str, rate_limit_delay: float = 0.2):
        self.api_key = api_key
        self.rate_limit_delay = rate_limit_delay
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'User-Agent': 'CivicLens/1.0'
        })
        
    def _request(self, endpoint: str, params: Optional[Dict] = None, retries: int = 3) -> Dict:
        """Make API request with retry logic and rate limiting"""
        url = f"{BASE_URL}/{endpoint}"
        
        for attempt in range(retries):
            try:
                response = self.session.get(url, params=params, timeout=30)
                
                if response.status_code == 429:
                    wait_time = 2 ** attempt
                    logger.warning(f"Rate limited. Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                
                if response.status_code != 200:
                    logger.error(f"API returned {response.status_code}: {response.text[:500]}")
                
                response.raise_for_status()
                data = response.json()
                
                # ProPublica wraps responses in status and results
                if data.get('status') != 'OK':
                    raise ValueError(f"API returned status: {data.get('status')}")
                
                # Rate limiting
                time.sleep(self.rate_limit_delay)
                
                return data
                
            except requests.exceptions.HTTPError as http_err:
                # Check if it's a client error (4xx) - don't retry
                if http_err.response and 400 <= http_err.response.status_code < 500:
                    logger.error(f"Client error {http_err.response.status_code}: {http_err}. Not retrying.")
                    raise
                # Server error (5xx) - retry
                if attempt == retries - 1:
                    raise
                wait_time = 2 ** attempt
                logger.warning(f"Server error (attempt {attempt + 1}/{retries}): {http_err}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as transient_err:
                # Transient errors - retry
                if attempt == retries - 1:
                    raise
                wait_time = 2 ** attempt
                logger.warning(f"Transient error (attempt {attempt + 1}/{retries}): {transient_err}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            except requests.exceptions.RequestException as e:
                # Other request exceptions - retry
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
        
        endpoint = f"{congress}/{chamber}/members.json"
        logger.info(f"Fetching {chamber} members for Congress {congress}")
        data = self._request(endpoint)
        return data.get('results', [{}])[0].get('members', [])
    
    def get_member_details(self, member_id: str, congress: int = 118) -> Dict:
        """Get detailed info for a specific member"""
        logger.info(f"Fetching details for member {member_id}")
        endpoint = f"{congress}/members/{member_id}.json"
        data = self._request(endpoint)
        return data.get('results', [{}])[0]
    
    def get_bills(self, congress: int = 118, chamber: str = 'house', 
                  bill_type: str = 'introduced', offset: int = 0) -> Dict:
        """
        Get bills for a Congress
        
        Args:
            congress: Congress number
            chamber: 'house' or 'senate'
            bill_type: 'introduced', 'updated', 'passed_house', 'passed_senate', 'enacted'
            offset: Offset for pagination
        """
        endpoint = f"{congress}/{chamber}/bills/{bill_type}.json"
        params = {'offset': offset} if offset > 0 else None
        logger.info(f"Fetching {bill_type} bills for {chamber}, offset {offset}")
        return self._request(endpoint, params)
    
    def get_bill_details(self, congress: int, bill_slug: str) -> Dict:
        """Get detailed info for a specific bill"""
        logger.info(f"Fetching details for bill {bill_slug}")
        endpoint = f"{congress}/bills/{bill_slug}.json"
        data = self._request(endpoint)
        return data.get('results', [{}])[0]
    
    def get_roll_call_vote(self, congress: int, chamber: str, session: int, roll_call: int) -> Dict:
        """Get roll call vote details"""
        logger.info(f"Fetching roll call vote {roll_call} for {chamber}")
        endpoint = f"{congress}/{chamber}/sessions/{session}/votes/{roll_call}.json"
        data = self._request(endpoint)
        return data.get('results', [{}])[0].get('votes', {})
    
    def get_recent_votes(self, chamber: str) -> List[Dict]:
        """Get recent votes for a chamber"""
        logger.info(f"Fetching recent votes for {chamber}")
        endpoint = f"{chamber}/votes/recent.json"
        data = self._request(endpoint)
        return data.get('results', [{}])[0].get('votes', [])


class DatabaseManager:
    """Database connection and operations manager"""

    def __init__(self, connection_string: str):
        try:
            # Clean asyncpg-specific parameters
            connection_string = self._clean_connection_string(connection_string)

            self.conn = psycopg2.connect(connection_string, connect_timeout=10)
            self.conn.autocommit = False
        except psycopg2.OperationalError as e:
            error_msg = str(e)
            if "could not translate host name" in error_msg.lower():
                logger.error(f"DNS resolution failed for database host. Error: {e}")
                logger.error("Troubleshooting:")
                logger.error("  1. Check your internet connection")
                logger.error("  2. Verify the DATABASE_URL hostname is correct")
                logger.error("  3. Check if your Supabase project is active (not paused)")
            raise

    @staticmethod
    def _clean_connection_string(url: str) -> str:
        """Remove asyncpg-specific parameters from connection string"""
        url = url.replace("+asyncpg", "")
        if "?" in url:
            base_url, params = url.split("?", 1)
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
            logger.error("Transaction rolled back due to error")
        else:
            self.conn.commit()
            logger.info("Transaction committed")
        self.conn.close()
    
    def create_source(self, source: Source) -> int:
        """Insert a source record and return its ID"""
        with self.conn.cursor() as cur:
            # Check if source already exists
            cur.execute("""
                SELECT id FROM sources 
                WHERE source_url = %s
            """, (source.source_url,))
            existing = cur.fetchone()
            if existing:
                logger.debug(f"Source already exists: {source.source_url}")
                return existing[0]
            
            cur.execute("""
                INSERT INTO sources (source_url, publisher, title, source_type, published_at, 
                                   retrieved_at, license_notes, raw_text)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s, %s)
                RETURNING id
            """, (
                source.source_url,
                source.publisher,
                source.title,
                source.source_type,
                source.published_at,
                source.license_notes,
                source.raw_text
            ))
            source_id = cur.fetchone()[0]
            logger.debug(f"Created source {source_id} for {source.title}")
            return source_id
    
    def find_politician_by_name(self, name: str, state_code: str = None, party: str = None) -> Optional[int]:
        """Find politician by name (with optional state/party matching)"""
        with self.conn.cursor() as cur:
            if state_code and party:
                cur.execute("""
                    SELECT id FROM politicians 
                    WHERE name = %s AND state_code = %s AND party = %s
                    LIMIT 1
                """, (name, state_code, party))
            elif state_code:
                cur.execute("""
                    SELECT id FROM politicians 
                    WHERE name = %s AND state_code = %s
                    LIMIT 1
                """, (name, state_code))
            else:
                cur.execute("""
                    SELECT id FROM politicians 
                    WHERE name = %s
                    LIMIT 1
                """, (name,))
            result = cur.fetchone()
            return result[0] if result else None
    
    def upsert_politician(self, member_data: Dict, source_id: int) -> int:
        """Insert or update politician record"""
        with self.conn.cursor() as cur:
            # Extract data
            name = member_data.get('first_name', '') + ' ' + member_data.get('last_name', '')
            state_code = member_data.get('state')
            party = member_data.get('party', '')
            
            # Normalize party
            if 'Democratic' in party:
                party = 'Democrat'
            elif 'Republican' in party:
                party = 'Republican'
            else:
                party = 'Independent'
            
            # Determine position
            chamber = member_data.get('chamber', '').lower()
            if chamber == 'house':
                position = 'Representative'
                district_number = member_data.get('district')
            elif chamber == 'senate':
                position = 'Senator'
                district_number = None
            else:
                position = 'Other'
                district_number = None
            
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
                return existing_id
            else:
                # Insert
                cur.execute("""
                    INSERT INTO politicians (name, party, state_code, district_number, "position")
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (name, party, state_code, district_number, position))
                politician_id = cur.fetchone()[0]
                logger.info(f"Created politician {name} -> {politician_id}")
                return politician_id
    
    def get_bill_by_number(self, bill_number: str) -> Optional[int]:
        """Get bill ID by bill number"""
        with self.conn.cursor() as cur:
            cur.execute("SELECT id FROM bills WHERE bill_number = %s", (bill_number,))
            result = cur.fetchone()
            return result[0] if result else None
    
    def insert_bill(self, bill_data: Dict, source_id: int) -> int:
        """Insert bill record"""
        with self.conn.cursor() as cur:
            bill_number = bill_data.get('number', '')
            
            # Check if exists
            existing_id = self.get_bill_by_number(bill_number)
            if existing_id:
                logger.debug(f"Bill {bill_number} already exists")
                return existing_id
            
            title = bill_data.get('title', '')
            introduced_date = bill_data.get('introduced_date')
            if introduced_date:
                try:
                    introduced_date = datetime.strptime(introduced_date, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    introduced_date = None
            
            # Extract topic from subjects if available
            topics = bill_data.get('subjects', [])
            topic = topics[0] if topics else None
            
            cur.execute("""
                INSERT INTO bills (bill_number, title, topic, introduced_date, source_id)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (bill_number, title, topic, introduced_date, source_id))
            bill_id = cur.fetchone()[0]
            logger.info(f"Created bill {bill_number} -> {bill_id}")
            return bill_id
    
    def insert_vote(self, vote_data: Dict, politician_id: int, bill_id: int, source_id: int, roll_call_number: Optional[int] = None):
        """Insert vote record
        
        Args:
            vote_data: Vote data dictionary
            politician_id: Politician ID
            bill_id: Bill ID
            source_id: Source ID
            roll_call_number: Optional roll call number to distinguish distinct roll calls with NULL vote_date
        """
        with self.conn.cursor() as cur:
            # Map ProPublica vote to our schema
            position = vote_data.get('position', '').lower()
            if position not in ['yes', 'no', 'abstain', 'not_voting']:
                if position in ['yea', 'y']:
                    position = 'yes'
                elif position in ['nay', 'n']:
                    position = 'no'
                elif position in ['present']:
                    position = 'abstain'
                else:
                    position = 'not_voting'
            
            vote_date = vote_data.get('date')
            if vote_date:
                try:
                    vote_date = datetime.strptime(vote_date, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    vote_date = None
            
            # Check if vote already exists (handle NULL vote_date and distinguish by roll_call_number)
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
                INSERT INTO votes (politician_id, bill_id, vote_position, vote_value, vote_date, roll_call_number, source_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (politician_id, bill_id, position, vote_value, vote_date, roll_call_number, source_id))
            logger.debug(f"Created vote for politician {politician_id} on bill {bill_id}, roll_call {roll_call_number}: {position}")


class IngestionPipeline:
    """Main ingestion orchestrator"""
    
    def __init__(self, api_client: ProPublicaClient, db_manager: DatabaseManager):
        self.api = api_client
        self.db = db_manager
        
    def ingest_members(self, chamber: str = 'both', congress: int = 118):
        """Ingest members (politicians) for a chamber"""
        logger.info(f"=== Starting members ingestion for {chamber}, Congress {congress} ===")
        
        members = self.api.get_members(chamber, congress)
        logger.info(f"Found {len(members)} members")
        
        for member in members:
            try:
                # Create source record
                member_id = member.get('id', '')
                source = Source(
                    source_url=f"https://www.propublica.org/datastore/api/propublica-congress-api/members/{member_id}",
                    publisher="ProPublica",
                    title=f"{member.get('first_name', '')} {member.get('last_name', '')} - Member Profile",
                    source_type="profile",
                    raw_text=json.dumps(member, indent=2)
                )
                source_id = self.db.create_source(source)
                
                # Upsert politician
                politician_id = self.db.upsert_politician(member, source_id)
                
            except Exception as e:
                logger.error(f"Failed to ingest member {member.get('id')}: {e}")
                continue
        
        logger.info(f"=== Members ingestion complete ({len(members)} processed) ===")
    
    def ingest_bills(self, congress: int = 118, chamber: str = 'house', 
                     bill_type: str = 'introduced', max_pages: int = 3):
        """Ingest bills with pagination"""
        logger.info(f"=== Starting bills ingestion for {chamber}, Congress {congress} ===")
        
        offset = 0
        page = 0
        
        while page < max_pages:
            try:
                data = self.api.get_bills(congress, chamber, bill_type, offset)
                bills = data.get('results', [{}])[0].get('bills', [])
                
                if not bills:
                    logger.info("No more bills to fetch")
                    break
                
                logger.info(f"Processing page {page + 1} with {len(bills)} bills")
                
                for bill in bills:
                    try:
                        # Create source record
                        bill_slug = bill.get('bill_slug', '')
                        source = Source(
                            source_url=f"https://www.congress.gov/bill/{format_congress_ordinal(congress)}-congress/{chamber}-bill/{bill.get('number', '').replace(' ', '-')}",
                            publisher="ProPublica",
                            title=f"Bill {bill.get('number', '')}: {bill.get('title', '')}",
                            source_type="bill",
                            raw_text=json.dumps(bill, indent=2)
                        )
                        source_id = self.db.create_source(source)
                        
                        # Insert bill
                        bill_id = self.db.insert_bill(bill, source_id)
                        
                    except Exception as e:
                        logger.error(f"Failed to ingest bill {bill.get('number')}: {e}")
                        continue
                
                # Check if there are more pages
                offset += len(bills)
                if len(bills) < 20:  # ProPublica typically returns 20 per page
                    break
                page += 1
                
            except Exception as e:
                logger.error(f"Failed to fetch bills page {page}: {e}")
                break
        
        logger.info(f"=== Bills ingestion complete ===")
    
    def ingest_votes_from_roll_call(self, congress: int, chamber: str, session: int, roll_call: int):
        """Ingest votes from a specific roll call"""
        logger.info(f"=== Starting vote ingestion for roll call {roll_call} ===")
        
        try:
            vote_data = self.api.get_roll_call_vote(congress, chamber, session, roll_call)
            
            # Get bill info from vote
            bill_slug = vote_data.get('bill', {}).get('number', '')
            if not bill_slug:
                logger.warning("No bill associated with this vote")
                return
            
            # Find or create bill
            bill_id = self.db.get_bill_by_number(bill_slug)
            if not bill_id:
                # Create a minimal bill record
                source = Source(
                    source_url=f"https://www.propublica.org/datastore/api/propublica-congress-api/votes/{roll_call}",
                    publisher="ProPublica",
                    title=f"Roll Call Vote {roll_call}",
                    source_type="vote",
                    raw_text=json.dumps(vote_data, indent=2)
                )
                source_id = self.db.create_source(source)
                
                bill_data = vote_data.get('bill', {})
                bill_id = self.db.insert_bill(bill_data, source_id)
            
            # Create source for vote
            source = Source(
                source_url=f"https://www.propublica.org/datastore/api/propublica-congress-api/votes/{roll_call}",
                publisher="ProPublica",
                title=f"Roll Call Vote {roll_call} - {vote_data.get('description', '')}",
                source_type="vote",
                raw_text=json.dumps(vote_data, indent=2)
            )
            source_id = self.db.create_source(source)
            
            # Process positions (votes)
            positions = vote_data.get('positions', [])
            for position in positions:
                member_name = f"{position.get('name', '')}"
                # Extract additional filters from position data
                state_code = position.get('state')
                party = position.get('party')
                # Try to find politician with additional filters for disambiguation
                politician_id = self.db.find_politician_by_name(member_name, state_code=state_code, party=party)
                
                if politician_id:
                    vote_record = {
                        'position': position.get('vote_position', ''),
                        'date': vote_data.get('date', '')
                    }
                    self.db.insert_vote(vote_record, politician_id, bill_id, source_id, roll_call_number=roll_call)
                else:
                    logger.warning(f"Could not find politician: {member_name} (state: {state_code}, party: {party})")
            
            logger.info(f"Processed {len(positions)} votes")
            
        except Exception as e:
            logger.error(f"Failed to ingest votes for roll call {roll_call}: {e}")
            raise


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='ProPublica Congress API Ingestion')
    parser.add_argument('--congress', type=int, default=118, help='Congress number (default: 118)')
    parser.add_argument('--chamber', choices=['house', 'senate', 'both'], default='both',
                       help='Chamber to ingest (default: both)')
    parser.add_argument('--members-only', action='store_true', help='Only ingest members')
    parser.add_argument('--bills-only', action='store_true', help='Only ingest bills')
    parser.add_argument('--max-pages', type=int, default=3, help='Max pages of bills to fetch')
    
    args = parser.parse_args()
    
    logger.info("=== ProPublica Ingestion Pipeline Started ===")
    
    # Initialize clients
    api_client = ProPublicaClient(PROPUBLICA_API_KEY)
    
    with DatabaseManager(DATABASE_URL) as db:
        pipeline = IngestionPipeline(api_client, db)
        
        try:
            if not args.bills_only:
                # Ingest members
                pipeline.ingest_members(args.chamber, args.congress)
            
            if not args.members_only:
                # Ingest bills
                for chamber in (['house', 'senate'] if args.chamber == 'both' else [args.chamber]):
                    pipeline.ingest_bills(args.congress, chamber, 'introduced', args.max_pages)
                    
        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            raise
    
    logger.info("=== ProPublica Ingestion Pipeline Complete ===")


if __name__ == "__main__":
    main()

