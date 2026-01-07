"""
OpenStates API Ingestion Pipeline

Fetches people, bills, and votes from OpenStates API and stores with full provenance.

Requirements:
    pip install requests psycopg2-binary python-dotenv

Environment variables (.env):
    OPENSTATES_API_KEY=your_key_here
    DATABASE_URL=postgresql://user:pass@localhost/dbname
"""

import os
import sys
import json
import logging
from datetime import datetime
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
        logging.FileHandler('ingest.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

# Configuration
OPENSTATES_API_KEY = os.getenv('OPENSTATES_API_KEY')
DATABASE_URL = os.getenv('DATABASE_URL')
BASE_URL = "https://v3.openstates.org"

if not OPENSTATES_API_KEY:
    raise ValueError("OPENSTATES_API_KEY not found in environment")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment")

# Jurisdiction mappings
JURISDICTIONS = {
    'federal': 'ocd-jurisdiction/country:us/government',
    'CA': 'ocd-jurisdiction/country:us/state:ca/government',
    'NY': 'ocd-jurisdiction/country:us/state:ny/government',
    'TX': 'ocd-jurisdiction/country:us/state:tx/government',
    'FL': 'ocd-jurisdiction/country:us/state:fl/government',
    'VT': 'ocd-jurisdiction/country:us/state:vt/government',
    'KY': 'ocd-jurisdiction/country:us/state:ky/government',
}

@dataclass
class Source:
    """Source record for provenance"""
    source_url: str
    publisher: str
    title: str
    source_type: str
    raw_text: str
    published_at: Optional[datetime] = None
    license_notes: str = "OpenStates data under Creative Commons Attribution 4.0"


class OpenStatesClient:
    """Client for OpenStates API v3"""
    
    def __init__(self, api_key: str, rate_limit_delay: float = 0.5):
        self.api_key = api_key
        self.rate_limit_delay = rate_limit_delay
        self.session = requests.Session()
        self.session.headers.update({'X-API-Key': api_key})
        
    def _request(self, endpoint: str, params: Optional[Dict] = None, retries: int = 3) -> Dict:
        """Make API request with retry logic and rate limiting"""
        url = f"{BASE_URL}/{endpoint}"
        
        for attempt in range(retries):
            try:
                response = self.session.get(url, params=params, timeout=30)
                
                # Log response details for debugging
                if response.status_code != 200:
                    logger.error(f"API returned {response.status_code}: {response.text[:500]}")
                
                response.raise_for_status()
                
                # Rate limiting
                time.sleep(self.rate_limit_delay)
                
                return response.json()
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request failed (attempt {attempt + 1}/{retries}): {e}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise
                    
    def get_people(self, jurisdiction: str, page: int = 1, per_page: int = 50) -> Dict:
        """
        Get people (legislators) for a jurisdiction
        Returns paginated results
        """
        logger.info(f"Fetching people for {jurisdiction} (page {page})")
        params = {
            'jurisdiction': jurisdiction,
            'page': page,
            'per_page': per_page,
            'include': 'other_names'
        }
        data = self._request('people', params=params)
        logger.info(f"Retrieved {len(data.get('results', []))} people")
        return data
    
    def get_person_details(self, person_id: str) -> Dict:
        """Get detailed info for a specific person"""
        logger.info(f"Fetching details for person {person_id}")
        endpoint = f"people/{person_id}"
        return self._request(endpoint)
    
    def get_bills(self, jurisdiction: str, session: Optional[str] = None, 
                  page: int = 1, per_page: int = 20) -> Dict:
        """
        Get bills for a jurisdiction
        session: Optional session identifier (varies by state)
        """
        logger.info(f"Fetching bills for {jurisdiction} (page {page})")
        params = {
            'jurisdiction': jurisdiction,
            'page': page,
            'per_page': per_page
        }
        if session:
            params['session'] = session
        
        data = self._request('bills', params=params)
        logger.info(f"Retrieved {len(data.get('results', []))} bills")
        return data
    
    def get_bill_details(self, bill_id: str) -> Dict:
        """Get detailed info for a specific bill"""
        logger.info(f"Fetching details for bill {bill_id}")
        endpoint = f"bills/{bill_id}"
        return self._request(endpoint)
    
    def get_bill_votes(self, bill_id: str) -> List[Dict]:
        """Get vote events for a bill"""
        logger.info(f"Fetching votes for bill {bill_id}")
        bill = self.get_bill_details(bill_id)
        return bill.get('votes', [])


class DatabaseManager:
    """Database connection and operations manager"""
    
    def __init__(self, connection_string: str):
        self.conn = psycopg2.connect(connection_string)
        self.conn.autocommit = False
        
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
        
    def create_source(self, source: Source) -> str:
        """Insert a source record and return its UUID"""
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO sources (source_url, publisher, title, source_type, published_at, 
                                   retrieved_at, license_notes, raw_text)
                VALUES (%s, %s, %s, %s, %s, NOW(), %s, %s)
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
    
    def get_politician_by_external_id(self, external_id: str, source: str = 'openstates') -> Optional[str]:
        """Get politician UUID by external ID"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT id FROM politicians 
                WHERE external_id = %s AND external_id_source = %s
            """, (external_id, source))
            result = cur.fetchone()
            return result[0] if result else None
    
    def upsert_politician(self, person_data: Dict, source_id: str) -> str:
        """Insert or update politician record"""
        with self.conn.cursor() as cur:
            # Check if exists
            existing_id = self.get_politician_by_external_id(person_data['id'])
            
            # Extract state from jurisdiction or current_role
            state = None
            if person_data.get('current_role'):
                jurisdiction = person_data['current_role'].get('jurisdiction', {})
                if jurisdiction.get('classification') == 'state':
                    state = jurisdiction.get('name', '')[:2].upper()
            
            # Normalize party
            party = person_data.get('party', '').replace('Democratic', 'Democrat')
            
            if existing_id:
                # Update
                cur.execute("""
                    UPDATE politicians 
                    SET full_name = %s, party = %s, state = %s, 
                        current_office = %s, updated_at = NOW()
                    WHERE id = %s
                    RETURNING id
                """, (
                    person_data.get('name', ''),
                    party,
                    state,
                    person_data.get('current_role', {}).get('title', 'Legislator'),
                    existing_id
                ))
                logger.info(f"Updated politician {person_data['id']}")
                return existing_id
            else:
                # Insert
                cur.execute("""
                    INSERT INTO politicians (external_id, external_id_source, full_name, 
                                           party, state, current_office, source_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    person_data['id'],
                    'openstates',
                    person_data.get('name', ''),
                    party,
                    state,
                    person_data.get('current_role', {}).get('title', 'Legislator'),
                    source_id
                ))
                politician_id = cur.fetchone()[0]
                logger.info(f"Created politician {person_data['id']} -> {politician_id}")
                return politician_id
    
    def insert_office(self, politician_id: str, role_data: Dict, source_id: str):
        """Insert office record from role data"""
        with self.conn.cursor() as cur:
            # Map OpenStates role type to our office_type
            role_type_map = {
                'upper': 'senate',
                'lower': 'house',
                'legislature': 'house',
                'executive': 'governor'
            }
            
            office_type = role_type_map.get(
                role_data.get('org_classification', 'other'),
                'other'
            )
            
            # Check if already exists
            cur.execute("""
                SELECT id FROM offices
                WHERE politician_id = %s 
                  AND office_type = %s
                  AND start_date = %s
            """, (politician_id, office_type, role_data.get('start_date')))
            
            if cur.fetchone():
                logger.debug(f"Office already exists for {politician_id}")
                return
            
            cur.execute("""
                INSERT INTO offices (politician_id, office_type, state, district,
                                   start_date, end_date, party_at_time, source_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                politician_id,
                office_type,
                role_data.get('jurisdiction', {}).get('name', '')[:2].upper(),
                role_data.get('district'),
                role_data.get('start_date'),
                role_data.get('end_date'),
                role_data.get('party'),
                source_id
            ))
            logger.info(f"Created office record for {politician_id}")
    
    def get_bill_by_external_id(self, external_id: str) -> Optional[str]:
        """Get bill UUID by external ID"""
        with self.conn.cursor() as cur:
            cur.execute("SELECT id FROM bills WHERE external_id = %s", (external_id,))
            result = cur.fetchone()
            return result[0] if result else None
    
    def insert_bill(self, bill_data: Dict, source_id: str, sponsor_id: Optional[str]) -> Optional[str]:
        """Insert bill record - returns bill_id or None if insert fails"""
        with self.conn.cursor() as cur:
            # Check if exists
            existing_id = self.get_bill_by_external_id(bill_data['id'])
            if existing_id:
                logger.info(f"Bill {bill_data['id']} already exists")
                return existing_id
            
            # Determine chamber from classification
            chamber = 'house'  # default
            if bill_data.get('from_organization', {}).get('classification') == 'upper':
                chamber = 'senate'
            
            # Extract congress number from session (if federal)
            congress_number = 118  # default current
            session = bill_data.get('session', {})
            if isinstance(session, dict):
                session_id = session.get('identifier', '118')
            else:
                session_id = str(session)
            
            # Try to extract number
            try:
                congress_number = int(''.join(filter(str.isdigit, session_id)))
            except:
                pass
            
            # If sponsor_id is required by database but None, try to insert without it
            # or handle gracefully
            cur.execute("""
                INSERT INTO bills (external_id, bill_number, title, summary, sponsor_id,
                                 introduced_date, congress_number, chamber, status, source_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                bill_data['id'],
                bill_data.get('identifier', 'Unknown'),
                bill_data.get('title', 'Untitled'),
                bill_data.get('abstracts', [{}])[0].get('abstract') if bill_data.get('abstracts') else None,
                sponsor_id,  # Can be None, which is allowed by schema
                bill_data.get('created_at', '').split('T')[0] if bill_data.get('created_at') else None,
                congress_number,
                chamber,
                bill_data.get('status', 'introduced'),
                source_id
            ))
            bill_id = cur.fetchone()[0]
            logger.info(f"Created bill {bill_data['id']} -> {bill_id}")
            return bill_id
    
    def insert_vote(self, vote_data: Dict, politician_id: str, bill_id: str, 
                   vote_event_data: Dict, source_id: str):
        """Insert individual vote record"""
        with self.conn.cursor() as cur:
            # Normalize vote value
            vote_value_map = {
                'yes': 'yea',
                'no': 'nay',
                'not voting': 'not_voting',
                'absent': 'not_voting',
                'abstain': 'present'
            }
            vote_value = vote_value_map.get(
                vote_data.get('option', '').lower(),
                vote_data.get('option', 'not_voting').lower()
            )
            
            # Determine chamber
            chamber_map = {
                'upper': 'senate',
                'lower': 'house'
            }
            chamber = chamber_map.get(
                vote_event_data.get('organization', {}).get('classification', 'lower'),
                'house'
            )
            
            # Check if vote already exists
            cur.execute("""
                SELECT id FROM votes 
                WHERE politician_id = %s AND bill_id = %s 
                  AND vote_date = %s AND chamber = %s
            """, (politician_id, bill_id, 
                  vote_event_data.get('start_date', '').split('T')[0],
                  chamber))
            
            if cur.fetchone():
                logger.debug(f"Vote already exists for {politician_id} on {bill_id}")
                return
            
            cur.execute("""
                INSERT INTO votes (politician_id, bill_id, vote_value, vote_date,
                                 roll_call_number, chamber, source_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                politician_id,
                bill_id,
                vote_value,
                vote_event_data.get('start_date', '').split('T')[0],
                vote_event_data.get('identifier'),
                chamber,
                source_id
            ))
            logger.info(f"Created vote for {politician_id} on {bill_id}: {vote_value}")


class IngestionPipeline:
    """Main ingestion orchestrator"""
    
    def __init__(self, api_client: OpenStatesClient, db_manager: DatabaseManager):
        self.api = api_client
        self.db = db_manager
        
    def ingest_people(self, jurisdiction: str, max_pages: int = 5):
        """Ingest people (legislators) for a jurisdiction"""
        logger.info(f"=== Starting people ingestion for {jurisdiction} ===")
        
        page = 1
        while page <= max_pages:
            try:
                data = self.api.get_people(jurisdiction, page=page)
                people = data.get('results', [])
                
                if not people:
                    logger.info("No more people to fetch")
                    break
                
                for person in people:
                    try:
                        # Create source record
                        source = Source(
                            source_url=f"{BASE_URL}/people/{person['id']}",
                            publisher="OpenStates",
                            title=f"{person.get('name', 'Unknown')} Legislative Profile",
                            source_type="profile",
                            raw_text=json.dumps(person, indent=2)
                        )
                        source_id = self.db.create_source(source)
                        
                        # Upsert politician
                        politician_id = self.db.upsert_politician(person, source_id)
                        
                        # Insert current office if available
                        if person.get('current_role'):
                            self.db.insert_office(politician_id, person['current_role'], source_id)
                        
                    except Exception as e:
                        logger.error(f"Failed to ingest person {person.get('id')}: {e}")
                        continue
                
                page += 1
                
            except Exception as e:
                logger.error(f"Failed to fetch page {page}: {e}")
                break
        
        self.db.conn.commit()
        logger.info("=== People ingestion complete ===")
    
    def ingest_bills(self, jurisdiction: str, max_pages: int = 3):
        """Ingest bills for a jurisdiction"""
        logger.info(f"=== Starting bill ingestion for {jurisdiction} ===")
        
        page = 1
        while page <= max_pages:
            try:
                data = self.api.get_bills(jurisdiction, page=page)
                bills = data.get('results', [])
                
                if not bills:
                    logger.info("No more bills to fetch")
                    break
                
                for bill in bills:
                    try:
                        # Create source
                        source = Source(
                            source_url=f"{BASE_URL}/bills/{bill['id']}",
                            publisher="OpenStates",
                            title=bill.get('title', 'Untitled Bill'),
                            source_type="bill",
                            raw_text=json.dumps(bill, indent=2),
                            published_at=datetime.fromisoformat(
                                bill['created_at'].replace('Z', '+00:00')
                            ) if bill.get('created_at') else None
                        )
                        source_id = self.db.create_source(source)
                        
                        # Get sponsor
                        sponsor_id = None
                        sponsorships = bill.get('sponsorships', [])
                        if sponsorships:
                            primary_sponsor = next(
                                (s for s in sponsorships if s.get('primary')), 
                                sponsorships[0]
                            )
                            if primary_sponsor.get('person_id'):
                                sponsor_id = self.db.get_politician_by_external_id(
                                    primary_sponsor['person_id']
                                )
                        
                        # Insert bill
                        bill_id = self.db.insert_bill(bill, source_id, sponsor_id)
                        
                        # Commit after each successful bill to avoid transaction rollback cascade
                        if bill_id:
                            self.db.conn.commit()
                        
                    except Exception as e:
                        logger.error(f"Failed to ingest bill {bill.get('id')}: {e}")
                        self.db.conn.rollback()
                        continue
                
                page += 1
                
            except Exception as e:
                logger.error(f"Failed to fetch bills page {page}: {e}")
                break
        
        self.db.conn.commit()
        logger.info("=== Bill ingestion complete ===")


def main():
    """Main entry point"""
    logger.info("=== OpenStates Ingestion Pipeline Started ===")
    
    # Initialize clients
    api_client = OpenStatesClient(OPENSTATES_API_KEY)
    
    with DatabaseManager(DATABASE_URL) as db:
        pipeline = IngestionPipeline(api_client, db)
        
        try:
            # Demo: Ingest NY state legislators (small dataset)
            # Use full OCD-ID
            pipeline.ingest_people('ocd-jurisdiction/country:us/state:ny/government', max_pages=2)
            
            # Demo: Ingest recent NY bills
            pipeline.ingest_bills('ocd-jurisdiction/country:us/state:ny/government', max_pages=2)
            
            # Uncomment to add more states:
            # pipeline.ingest_people(JURISDICTIONS['CA'], max_pages=3)
            # pipeline.ingest_bills(JURISDICTIONS['CA'], max_pages=2)
            
        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            raise
    
    logger.info("=== OpenStates Ingestion Pipeline Complete ===")


if __name__ == "__main__":
    main()