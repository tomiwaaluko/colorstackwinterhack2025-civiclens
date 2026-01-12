#!/usr/bin/env python3
"""
Federal Election Commission (FEC) API Donation Ingestion Script

Fetches campaign finance and donation data from FEC API and stores with full provenance.
This replaces the deprecated OpenSecrets API (discontinued April 15, 2025).

Requirements:
    pip install requests psycopg2-binary python-dotenv

Environment variables (.env):
    FEC_API_KEY=your_key_here
    DATABASE_URL=postgresql://user:pass@localhost/dbname

API Documentation:
    https://api.open.fec.gov/developers/
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
        logging.FileHandler('fec_ingest.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

# Configuration
FEC_API_KEY = os.getenv('FEC_API_KEY')
DATABASE_URL = os.getenv('DATABASE_URL')
BASE_URL = "https://api.open.fec.gov/v1"

if not FEC_API_KEY:
    raise ValueError("FEC_API_KEY not found in environment")
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
    license_notes: str = "FEC data - Federal Election Commission (public domain)"


class FECClient:
    """Client for FEC API"""
    
    def __init__(self, api_key: str, rate_limit_delay: float = 0.5):
        self.api_key = api_key
        self.rate_limit_delay = rate_limit_delay
        self.session = requests.Session()
        
    def _request(self, endpoint: str, params: Optional[Dict] = None, retries: int = 3, page: int = 1) -> Dict:
        """Make API request with retry logic and rate limiting"""
        if params is None:
            params = {}
        
        params['api_key'] = self.api_key
        params['page'] = page
        params['per_page'] = 100  # FEC allows up to 100 per page
        
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
                
                # FEC returns pagination info
                if 'results' not in data:
                    raise ValueError("Unexpected API response format")
                
                # Rate limiting (FEC allows 1,000 requests/hour for free tier)
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
    
    def get_all_pages(self, endpoint: str, params: Optional[Dict] = None, max_pages: int = 10) -> List[Dict]:
        """Get all pages of results"""
        all_results = []
        page = 1
        
        while page <= max_pages:
            try:
                data = self._request(endpoint, params, page=page)
                results = data.get('results', [])
                
                if not results:
                    break
                
                all_results.extend(results)
                
                # Check if there are more pages
                pagination = data.get('pagination', {})
                pages = pagination.get('pages', 1)
                
                if page >= pages:
                    break
                
                page += 1
                
            except Exception as e:
                logger.error(f"Error fetching page {page}: {e}")
                break
        
        return all_results
    
    def get_candidate(self, candidate_id: str) -> Optional[Dict]:
        """Get candidate information by FEC candidate ID"""
        try:
            params = {'candidate_id': candidate_id}
            data = self._request('candidates/', params)
            results = data.get('results', [])
            return results[0] if results else None
        except Exception as e:
            logger.error(f"Error fetching candidate {candidate_id}: {e}")
            return None
    
    def search_candidates(self, name: Optional[str] = None, office: Optional[str] = None, 
                         state: Optional[str] = None, cycle: Optional[int] = None) -> List[Dict]:
        """Search for candidates"""
        params = {}
        if name:
            params['q'] = name
        if office:
            params['office'] = office  # 'H' (House), 'S' (Senate), 'P' (President)
        if state:
            params['state'] = state
        if cycle:
            params['cycle'] = cycle
        
        return self.get_all_pages('candidates/search', params)
    
    def get_candidate_contributions(self, candidate_id: str, cycle: int, max_pages: int = 10) -> List[Dict]:
        """Get itemized contributions to a candidate (Schedule A)"""
        params = {
            'candidate_id': candidate_id,
            'two_year_transaction_period': cycle,
            'sort': '-contribution_receipt_amount'
        }
        return self.get_all_pages('schedules/schedule_a/', params, max_pages=max_pages)
    
    def get_committee_contributions(self, committee_id: str, cycle: int, max_pages: int = 10) -> List[Dict]:
        """Get itemized contributions to a committee (Schedule A)"""
        params = {
            'committee_id': committee_id,
            'two_year_transaction_period': cycle,
            'sort': '-contribution_receipt_amount'
        }
        return self.get_all_pages('schedules/schedule_a/', params, max_pages=max_pages)
    
    def get_committee(self, committee_id: str) -> Optional[Dict]:
        """Get committee information"""
        try:
            params = {'committee_id': committee_id}
            data = self._request('committees/', params)
            results = data.get('results', [])
            return results[0] if results else None
        except Exception as e:
            logger.error(f"Error fetching committee {committee_id}: {e}")
            return None
    
    def get_candidate_committees(self, candidate_id: str, cycle: Optional[int] = None) -> List[Dict]:
        """Get committees associated with a candidate"""
        params = {'candidate_id': candidate_id}
        if cycle:
            params['cycle'] = cycle
        
        return self.get_all_pages('candidates/{}/committees'.format(candidate_id), params)


# Industry/Donor Category Mapping (similar to OpenSecrets mapping)
# FEC provides contributor employer/occupation, we map to categories
INDUSTRY_MAPPING = {
    # Healthcare
    'HEALTH PROFESSIONALS': 'Healthcare',
    'HOSPITALS': 'Healthcare',
    'PHARMACEUTICALS': 'Healthcare',
    'HEALTH CARE': 'Healthcare',
    'MEDICAL': 'Healthcare',
    # Energy
    'OIL & GAS': 'Energy',
    'OIL AND GAS': 'Energy',
    'MINING': 'Energy',
    'ELECTRIC UTILITIES': 'Energy',
    'NUCLEAR ENERGY': 'Energy',
    # Technology
    'INTERNET': 'Technology',
    'COMPUTER SOFTWARE': 'Technology',
    'ELECTRONICS': 'Technology',
    'TELECOMMUNICATIONS': 'Technology',
    'TELECOM': 'Technology',
    # Finance
    'COMMERCIAL BANKS': 'Finance',
    'BANKING': 'Finance',
    'SECURITIES & INVESTMENT': 'Finance',
    'INSURANCE': 'Finance',
    'REAL ESTATE': 'Finance',
    # Defense
    'DEFENSE': 'Defense',
    'DEFENSE AEROSPACE': 'Defense',
    # Agriculture
    'AGRICULTURE': 'Agriculture',
    'FOOD & BEVERAGE': 'Agriculture',
    # Transportation
    'TRANSPORTATION': 'Transportation',
    'AUTOMOTIVE': 'Transportation',
    'AIRLINES': 'Transportation',
    # Construction
    'CONSTRUCTION': 'Construction',
    # Retail
    'RETAIL': 'Retail',
}


def map_contributor_to_category(contributor_employer: str, contributor_occupation: str = None) -> str:
    """Map FEC contributor employer/occupation to our donor category"""
    if not contributor_employer:
        return 'Other'
    
    employer_upper = contributor_employer.upper()
    
    # Check employer name for industry keywords
    for keyword, category in INDUSTRY_MAPPING.items():
        if keyword in employer_upper:
            return category
    
    # Check occupation if available
    if contributor_occupation:
        occupation_upper = contributor_occupation.upper()
        for keyword, category in INDUSTRY_MAPPING.items():
            if keyword in occupation_upper:
                return category
    
    return 'Other'


def parse_float(value: Any, default: float = 0.0) -> float:
    """Safely parse a value to float with fallback to default"""
    try:
        if value is None:
            return default
        return float(value)
    except (ValueError, TypeError) as e:
        logger.warning(f"Failed to parse float value '{value}': {e}. Using default {default}")
        return default


def parse_date(date_str: Optional[str]) -> Optional[date]:
    """Parse FEC date string to date object"""
    if not date_str:
        return None
    try:
        # FEC dates are typically YYYY-MM-DD format
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        try:
            # Sometimes they include time
            return datetime.strptime(date_str.split('T')[0], '%Y-%m-%d').date()
        except (ValueError, TypeError):
            logger.warning(f"Failed to parse date '{date_str}'")
            return None


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
    
    def find_politician_by_name(self, name: str, state_code: str = None) -> Optional[int]:
        """Find politician by name"""
        with self.conn.cursor() as cur:
            if state_code:
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
    
    def find_politician_by_fec_id(self, fec_candidate_id: str) -> Optional[int]:
        """Find politician by FEC candidate ID (if stored)"""
        # Note: This assumes you might store FEC IDs in a metadata field
        # For now, we'll rely on name matching
        return None
    
    def insert_donation(self, donation_data: Dict, politician_id: int, source_id: int):
        """Insert donation record"""
        with self.conn.cursor() as cur:
            # Check if donation already exists
            cur.execute("""
                SELECT id FROM donations 
                WHERE politician_id = %s AND donor_name = %s AND donor_category = %s 
                  AND amount = %s AND date = %s
            """, (
                politician_id,
                donation_data['donor_name'],
                donation_data.get('donor_category'),
                donation_data['amount'],
                donation_data.get('date')
            ))
            
            if cur.fetchone():
                logger.debug(f"Donation already exists: {donation_data['donor_name']}")
                return
            
            # Convert amount to amount_cents
            amount = donation_data.get('amount')
            amount_cents = None
            if amount is not None:
                if isinstance(amount, (int, float)):
                    amount_cents = int(amount * 100) if amount < 1000000 else int(amount)
                else:
                    try:
                        amount_cents = int(float(amount) * 100)
                    except (ValueError, TypeError):
                        pass
            
            donation_date = donation_data.get('date')
            
            cur.execute("""
                INSERT INTO donations (politician_id, donor_name, donor_category, donor_type, 
                                     amount, amount_cents, date, donation_date, cycle, state_code, source_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                politician_id,
                donation_data['donor_name'],
                donation_data.get('donor_category'),
                donation_data.get('donor_type'),
                amount,
                amount_cents,
                donation_date,
                donation_date,
                donation_data.get('cycle'),
                donation_data.get('state_code'),
                source_id
            ))
            logger.debug(f"Created donation: {donation_data['donor_name']} -> ${donation_data['amount']}")


class IngestionPipeline:
    """Main ingestion orchestrator"""
    
    def __init__(self, api_client: FECClient, db_manager: DatabaseManager):
        self.api = api_client
        self.db = db_manager
        
    def ingest_candidate_contributions(self, candidate_id: str, politician_id: int, cycle: int, max_contributions: int = 1000):
        """Ingest contributions for a specific candidate"""
        logger.info(f"=== Starting contribution ingestion for FEC candidate {candidate_id}, cycle {cycle} ===")
        
        try:
            # Get candidate info
            candidate_info = self.api.get_candidate(candidate_id)
            if not candidate_info:
                logger.error(f"Candidate {candidate_id} not found in FEC")
                return
            
            # Get contributions
            contributions = self.api.get_candidate_contributions(candidate_id, cycle, max_pages=max_contributions // 100)
            
            if not contributions:
                logger.warning(f"No contributions found for candidate {candidate_id}")
                return
            
            # Limit to max_contributions
            contributions = contributions[:max_contributions]
            
            # Create source record
            source = Source(
                source_url=f"https://www.fec.gov/data/candidate/{candidate_id}/?cycle={cycle}",
                publisher="Federal Election Commission",
                title=f"Campaign Contributions for {candidate_info.get('name', candidate_id)} - Cycle {cycle}",
                source_type="donation",
                raw_text=json.dumps({
                    'candidate': candidate_info,
                    'contributions': contributions[:10]  # Store sample in raw_text
                }, indent=2)
            )
            source_id = self.db.create_source(source)
            
            # Process contributions
            processed = 0
            for contribution in contributions:
                try:
                    # Extract contributor information
                    contributor_name = contribution.get('contributor_name', 'Unknown')
                    contributor_employer = contribution.get('contributor_employer', '')
                    contributor_occupation = contribution.get('contributor_occupation', '')
                    
                    # Map to category
                    category = map_contributor_to_category(contributor_employer, contributor_occupation)
                    
                    # Get amount
                    amount = parse_float(contribution.get('contribution_receipt_amount'), 0.0)
                    
                    if amount <= 0:
                        continue  # Skip invalid amounts
                    
                    # Get date
                    contribution_date = parse_date(contribution.get('contribution_receipt_date'))
                    
                    # Determine donor type (must be lowercase per database constraint)
                    donor_type = 'individual'
                    if contribution.get('committee_id'):
                        donor_type = 'pac'
                    
                    # Create donation record
                    donation_data = {
                        'donor_name': contributor_name or 'Unknown',
                        'donor_category': category,
                        'donor_type': donor_type,
                        'amount': amount,
                        'date': contribution_date,
                        'cycle': cycle,
                        'state_code': contribution.get('contributor_state')
                    }
                    
                    self.db.insert_donation(donation_data, politician_id, source_id)
                    processed += 1
                    
                except Exception as e:
                    logger.error(f"Failed to process contribution: {e}")
                    continue
            
            logger.info(f"Processed {processed} contributions for candidate {candidate_id}")
            
        except Exception as e:
            logger.error(f"Failed to ingest contributions for candidate {candidate_id}: {e}")
            raise
    
    def ingest_for_politicians(self, politician_ids: List[int] = None, cycles: List[int] = None, 
                              fec_id_mapping: Dict[int, str] = None):
        """
        Ingest contributions for politicians in database
        
        Args:
            politician_ids: List of politician IDs (None = all)
            cycles: List of election cycles to ingest (e.g., [2024, 2022])
            fec_id_mapping: Optional mapping of politician_id -> FEC candidate_id
        """
        if cycles is None:
            cycles = [2024]
        
        with self.db.conn.cursor() as cur:
            if politician_ids:
                placeholders = ','.join(['%s'] * len(politician_ids))
                cur.execute(f"""
                    SELECT id, name, state_code 
                    FROM politicians 
                    WHERE id IN ({placeholders})
                """, politician_ids)
            else:
                cur.execute("""
                    SELECT id, name, state_code 
                    FROM politicians
                """)
            
            politicians = cur.fetchall()
        
        logger.info(f"Found {len(politicians)} politicians to process")
        
        for politician_id, name, state_code in politicians:
            logger.info(f"Processing {name} (ID: {politician_id})")
            
            # Try to get FEC ID from mapping
            fec_candidate_id = None
            if fec_id_mapping:
                fec_candidate_id = fec_id_mapping.get(politician_id)
            
            if not fec_candidate_id:
                # Try to search FEC by name
                candidates = self.api.search_candidates(name=name, state=state_code)
                if candidates:
                    # Use first match
                    fec_candidate_id = candidates[0].get('candidate_id')
                    logger.info(f"Found FEC candidate ID {fec_candidate_id} for {name}")
                else:
                    logger.warning(f"Could not find FEC candidate ID for {name}. Skipping.")
                    continue
            
            # Ingest for each cycle
            for cycle in cycles:
                try:
                    self.ingest_candidate_contributions(fec_candidate_id, politician_id, cycle)
                except Exception as e:
                    logger.error(f"Failed to ingest cycle {cycle} for {name}: {e}")
                    continue


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='FEC API Campaign Finance Ingestion')
    parser.add_argument('--candidate-id', type=str, help='FEC candidate ID (e.g., S8TX00161)')
    parser.add_argument('--politician-id', type=int, help='Politician ID in database')
    parser.add_argument('--cycle', type=int, default=2024, help='Election cycle (default: 2024)')
    parser.add_argument('--max-contributions', type=int, default=1000, 
                       help='Maximum number of contributions to ingest (default: 1000)')
    parser.add_argument('--all-politicians', action='store_true', 
                       help='Ingest for all politicians (requires FEC ID mapping)')
    
    args = parser.parse_args()
    
    logger.info("=== FEC Campaign Finance Ingestion Pipeline Started ===")
    
    # Initialize clients
    api_client = FECClient(FEC_API_KEY)
    
    with DatabaseManager(DATABASE_URL) as db:
        pipeline = IngestionPipeline(api_client, db)
        
        try:
            if args.candidate_id and args.politician_id:
                # Ingest for specific candidate
                pipeline.ingest_candidate_contributions(
                    args.candidate_id, 
                    args.politician_id, 
                    args.cycle,
                    args.max_contributions
                )
            elif args.all_politicians:
                # Ingest for all (requires FEC ID mapping - can search by name)
                pipeline.ingest_for_politicians(cycles=[args.cycle])
            else:
                logger.error("Must provide --candidate-id and --politician-id, or --all-politicians")
                logger.error("Example: python fec_ingest.py --candidate-id S8TX00161 --politician-id 1 --cycle 2024")
                sys.exit(1)
                    
        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            raise
    
    logger.info("=== FEC Campaign Finance Ingestion Pipeline Complete ===")


if __name__ == "__main__":
    main()
