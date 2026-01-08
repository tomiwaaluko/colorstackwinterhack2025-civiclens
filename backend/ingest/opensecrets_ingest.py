#!/usr/bin/env python3
"""
OpenSecrets API Donation Ingestion Script

Fetches campaign finance and donation data from OpenSecrets API and stores with full provenance.

Requirements:
    pip install requests psycopg2-binary python-dotenv

Environment variables (.env):
    OPENSECRETS_API_KEY=your_key_here
    DATABASE_URL=postgresql://user:pass@localhost/dbname

API Documentation:
    https://www.opensecrets.org/open-data/api-documentation
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
        logging.FileHandler('opensecrets_ingest.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

# Configuration
OPENSECRETS_API_KEY = os.getenv('OPENSECRETS_API_KEY')
DATABASE_URL = os.getenv('DATABASE_URL')
BASE_URL = "https://www.opensecrets.org/api/"

if not OPENSECRETS_API_KEY:
    raise ValueError("OPENSECRETS_API_KEY not found in environment")
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
    license_notes: str = "OpenSecrets data - Center for Responsive Politics"


class OpenSecretsClient:
    """Client for OpenSecrets API"""
    
    def __init__(self, api_key: str, rate_limit_delay: float = 1.0):
        self.api_key = api_key
        self.rate_limit_delay = rate_limit_delay
        self.session = requests.Session()
        
    def _request(self, method: str, params: Dict, retries: int = 3) -> Dict:
        """Make API request with retry logic and rate limiting"""
        params['apikey'] = self.api_key
        params['output'] = 'json'
        
        for attempt in range(retries):
            try:
                response = self.session.get(BASE_URL, params=params, timeout=30)
                
                if response.status_code == 429:
                    wait_time = 2 ** attempt
                    logger.warning(f"Rate limited. Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                
                if response.status_code != 200:
                    logger.error(f"API returned {response.status_code}: {response.text[:500]}")
                
                response.raise_for_status()
                data = response.json()
                
                # OpenSecrets wraps in response key
                if 'response' not in data:
                    raise ValueError("Unexpected API response format")
                
                # Rate limiting
                time.sleep(self.rate_limit_delay)
                
                return data
                
            except requests.exceptions.RequestException as e:
                if attempt == retries - 1:
                    raise
                wait_time = 2 ** attempt
                logger.warning(f"Request failed (attempt {attempt + 1}/{retries}): {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
        
        raise RuntimeError("Failed to fetch data after retries")
    
    def get_candidate_summary(self, cid: str, cycle: str = '2024') -> Dict:
        """
        Get candidate funding summary
        
        Args:
            cid: OpenSecrets candidate ID (CRP ID)
            cycle: Election cycle (e.g., '2024', '2022')
        """
        params = {
            'method': 'candSummary',
            'cid': cid,
            'cycle': cycle
        }
        logger.info(f"Fetching candidate summary for {cid}, cycle {cycle}")
        data = self._request('candSummary', params)
        return data.get('response', {}).get('summary', {})
    
    def get_contributors(self, cid: str, cycle: str = '2024') -> List[Dict]:
        """Get top contributors to a candidate"""
        params = {
            'method': 'candContrib',
            'cid': cid,
            'cycle': cycle
        }
        logger.info(f"Fetching contributors for {cid}, cycle {cycle}")
        data = self._request('candContrib', params)
        return data.get('response', {}).get('contributors', {}).get('contributor', [])
    
    def get_industries(self, cid: str, cycle: str = '2024') -> List[Dict]:
        """Get contributions by industry for a candidate"""
        params = {
            'method': 'candIndByInd',
            'cid': cid,
            'cycle': cycle
        }
        logger.info(f"Fetching industries for {cid}, cycle {cycle}")
        data = self._request('candIndByInd', params)
        return data.get('response', {}).get('industries', {}).get('industry', [])
    
    def get_org_summary(self, org_id: str, cycle: str = '2024') -> Dict:
        """Get organization (PAC) summary"""
        params = {
            'method': 'orgSummary',
            'id': org_id,
            'cycle': cycle
        }
        logger.info(f"Fetching organization summary for {org_id}")
        data = self._request('orgSummary', params)
        return data.get('response', {}).get('organization', {})
    
    def search_candidates(self, name: str, cycle: str = '2024') -> List[Dict]:
        """Search for candidates by name"""
        params = {
            'method': 'getLegislators',
            'id': name,
            'cycle': cycle
        }
        logger.info(f"Searching candidates for: {name}")
        data = self._request('getLegislators', params)
        return data.get('response', {}).get('legislator', [])


# Industry/Donor Category Mapping
INDUSTRY_MAPPING = {
    'Health': 'Healthcare',
    'Pharmaceuticals/Health Products': 'Healthcare',
    'Hospitals/Nursing Homes': 'Healthcare',
    'Health Professionals': 'Healthcare',
    'Oil & Gas': 'Energy',
    'Mining': 'Energy',
    'Electric Utilities': 'Energy',
    'Nuclear Energy': 'Energy',
    'Internet': 'Technology',
    'Computer Software': 'Technology',
    'Electronics Mfg & Equip': 'Technology',
    'Telecom Services & Equipment': 'Technology',
    'Commercial Banks': 'Finance',
    'Securities & Investment': 'Finance',
    'Insurance': 'Finance',
    'Real Estate': 'Finance',
    'Defense Aerospace': 'Defense',
    'Defense/Foreign Policy Advocates': 'Defense',
    'Agriculture': 'Agriculture',
    'Food & Beverage': 'Agriculture',
    'Construction': 'Construction',
    'Transportation': 'Transportation',
    'Automotive': 'Transportation',
    'Airlines': 'Transportation',
    'Retail Sales': 'Retail',
    'Lobbyists': 'Other',
    'General Business': 'Other',
    'Misc Business': 'Other',
}


def map_industry_to_category(industry_name: str) -> str:
    """Map OpenSecrets industry to our donor category"""
    return INDUSTRY_MAPPING.get(industry_name, 'Other')


def parse_float(value: Any, default: float = 0.0) -> float:
    """Safely parse a value to float with fallback to default"""
    try:
        if value is None:
            return default
        return float(value)
    except (ValueError, TypeError) as e:
        logger.warning(f"Failed to parse float value '{value}': {e}. Using default {default}")
        return default


def parse_int(value: Any, default: int = 0) -> int:
    """Safely parse a value to int with fallback to default"""
    try:
        if value is None:
            return default
        return int(value)
    except (ValueError, TypeError) as e:
        logger.warning(f"Failed to parse int value '{value}': {e}. Using default {default}")
        return default


class DatabaseManager:
    """Database connection and operations manager"""
    
    def __init__(self, connection_string: str):
        try:
            # Convert asyncpg URL to psycopg2 format if needed
            if "+asyncpg" in connection_string:
                connection_string = connection_string.replace("+asyncpg", "")
            
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
    
    def get_or_create_politician_from_cid(self, cid: str, name: str, state_code: str = None) -> int:
        """Get or create politician from OpenSecrets CID"""
        with self.conn.cursor() as cur:
            # Check if exists by name
            politician_id = self.find_politician_by_name(name, state_code)
            if politician_id:
                return politician_id
            
            # Create minimal politician record if not found
            # Note: In production, you'd want to match to existing politicians better
            logger.warning(f"Politician not found: {name}. You may need to ingest from ProPublica first.")
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
                donation_data['donor_category'],
                donation_data['amount'],
                donation_data['date']
            ))
            
            if cur.fetchone():
                logger.debug(f"Donation already exists: {donation_data['donor_name']}")
                return
            
            # Convert amount to amount_cents if amount is provided as decimal
            amount = donation_data.get('amount')
            amount_cents = None
            if amount is not None:
                if isinstance(amount, (int, float)):
                    amount_cents = int(amount * 100) if amount < 1000000 else int(amount)  # Assume already in cents if large
                else:
                    try:
                        amount_cents = int(float(amount) * 100)
                    except (ValueError, TypeError):
                        pass
            
            # Map donation date
            donation_date = donation_data.get('date')
            date = donation_date  # Keep both for compatibility
            
            cur.execute("""
                INSERT INTO donations (politician_id, donor_name, donor_category, donor_type, 
                                     amount, amount_cents, date, donation_date, cycle, state_code, source_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                politician_id,
                donation_data['donor_name'],
                donation_data.get('donor_category'),
                donation_data.get('donor_type'),  # May be None, that's okay
                amount,
                amount_cents,
                date,
                donation_date,
                donation_data.get('cycle'),  # May be None
                donation_data.get('state_code'),
                source_id
            ))
            logger.debug(f"Created donation: {donation_data['donor_name']} -> ${donation_data['amount']}")


class IngestionPipeline:
    """Main ingestion orchestrator"""
    
    def __init__(self, api_client: OpenSecretsClient, db_manager: DatabaseManager):
        self.api = api_client
        self.db = db_manager
        
    def ingest_candidate_donations(self, cid: str, politician_id: int, cycle: str = '2024'):
        """Ingest donations for a specific candidate"""
        logger.info(f"=== Starting donation ingestion for CID {cid} ===")
        
        try:
            # Get industries (aggregated by category)
            industries = self.api.get_industries(cid, cycle)
            
            # Create source record
            source = Source(
                source_url=f"https://www.opensecrets.org/members-of-congress/contributors?cid={cid}&cycle={cycle}",
                publisher="OpenSecrets",
                title=f"Campaign Contributions for Cycle {cycle}",
                source_type="donation",
                raw_text=json.dumps(industries, indent=2)
            )
            source_id = self.db.create_source(source)
            
            # Process industries as donation categories
            for industry in industries:
                industry_name = industry.get('industry_name', 'Other')
                category = map_industry_to_category(industry_name)
                total_amount = parse_float(industry.get('total'), default=0.0)
                
                # OpenSecrets provides totals by industry, not individual donations
                # We'll create a single aggregated donation record per industry
                donation_data = {
                    'donor_name': f"{industry_name} Industry",
                    'donor_category': category,
                    'amount': total_amount,
                    'date': date(parse_int(cycle, default=2024), 1, 1),  # Use cycle start date
                    'state_code': None  # Industry-level, not state-specific
                }
                
                self.db.insert_donation(donation_data, politician_id, source_id)
            
            logger.info(f"Processed {len(industries)} industry categories")
            
            # Get top contributors (individual organizations)
            contributors = self.api.get_contributors(cid, cycle)
            
            for contributor in contributors:
                org_name = contributor.get('org_name', 'Unknown')
                total = parse_float(contributor.get('total'), default=0.0)
                pacs = parse_float(contributor.get('pacs'), default=0.0)
                indivs = parse_float(contributor.get('indivs'), default=0.0)
                
                # Determine category from organization name or use 'Other'
                category = 'Other'
                org_name_lower = org_name.lower()
                for key, cat in INDUSTRY_MAPPING.items():
                    if key.lower() in org_name_lower:
                        category = cat
                        break
                
                # Create donation record(s)
                if pacs > 0:
                    donation_data = {
                        'donor_name': org_name,
                        'donor_category': category,
                        'amount': pacs,
                        'date': date(int(cycle), 1, 1),
                        'state_code': None
                    }
                    self.db.insert_donation(donation_data, politician_id, source_id)
                
                if indivs > 0:
                    donation_data = {
                        'donor_name': f"{org_name} (Individuals)",
                        'donor_category': category,
                        'amount': indivs,
                        'date': date(int(cycle), 1, 1),
                        'state_code': None
                    }
                    self.db.insert_donation(donation_data, politician_id, source_id)
            
            logger.info(f"Processed {len(contributors)} top contributors")
            
        except Exception as e:
            logger.error(f"Failed to ingest donations for CID {cid}: {e}")
            raise
    
    def ingest_for_politicians(self, politician_ids: List[int] = None, cycles: List[str] = None):
        """
        Ingest donations for politicians in database
        
        Args:
            politician_ids: List of politician IDs (None = all)
            cycles: List of election cycles to ingest (e.g., ['2024', '2022'])
        """
        if cycles is None:
            cycles = ['2024']
        
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
            
            # Note: OpenSecrets uses CRP IDs (CIDs), not politician names
            # In production, you'd need a mapping table or matching logic
            # For now, we'll need manual CID lookup or integration with ProPublica data
            
            logger.warning(f"OpenSecrets requires CRP ID (CID) for {name}. Manual mapping needed.")
            logger.warning("Consider ingesting ProPublica data first to get CRP IDs.")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='OpenSecrets API Donation Ingestion')
    parser.add_argument('--cid', type=str, help='OpenSecrets candidate ID (CRP ID)')
    parser.add_argument('--politician-id', type=int, help='Politician ID in database')
    parser.add_argument('--cycle', type=str, default='2024', help='Election cycle (default: 2024)')
    parser.add_argument('--all-politicians', action='store_true', 
                       help='Ingest for all politicians (requires CID mapping)')
    
    args = parser.parse_args()
    
    logger.info("=== OpenSecrets Ingestion Pipeline Started ===")
    
    # Initialize clients
    api_client = OpenSecretsClient(OPENSECRETS_API_KEY)
    
    with DatabaseManager(DATABASE_URL) as db:
        pipeline = IngestionPipeline(api_client, db)
        
        try:
            if args.cid and args.politician_id:
                # Ingest for specific candidate
                pipeline.ingest_candidate_donations(args.cid, args.politician_id, args.cycle)
            elif args.all_politicians:
                # Ingest for all (requires CID mapping)
                pipeline.ingest_for_politicians(cycles=[args.cycle])
            else:
                logger.error("Must provide --cid and --politician-id, or --all-politicians")
                logger.error("Example: python opensecrets_ingest.py --cid N00000019 --politician-id 1 --cycle 2024")
                sys.exit(1)
                    
        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            raise
    
    logger.info("=== OpenSecrets Ingestion Pipeline Complete ===")


if __name__ == "__main__":
    main()

