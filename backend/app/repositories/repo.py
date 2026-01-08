"""
Repository layer for politicians data.

Now uses PostgreSQL instead of JSON files.
Maintains the same interface for backward compatibility.
"""

import os
from typing import List, Dict, Optional
from rapidfuzz import fuzz
import psycopg2
from dotenv import load_dotenv

load_dotenv()


class PoliticianRepo:
    """Repository for accessing politician data from PostgreSQL"""
    
    def __init__(self, db_url: str = None):
        """
        Initialize repository with database connection string.
        
        Args:
            db_url: PostgreSQL connection string. If not provided, uses DATABASE_URL env var.
        """
        self.db_url = db_url or os.getenv('DATABASE_URL')
        if not self.db_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        # Test connection
        try:
            conn = psycopg2.connect(self.db_url, connect_timeout=10)
            conn.close()
        except psycopg2.OperationalError as e:
            error_msg = str(e)
            if "could not translate host name" in error_msg.lower():
                raise RuntimeError(
                    f"Failed to connect to database: {e}\n\n"
                    "TROUBLESHOOTING:\n"
                    "1. Check if your Supabase project is PAUSED - go to Supabase dashboard and resume it\n"
                    "2. Verify DATABASE_URL is correct in your .env file\n"
                    "3. Check your internet connection\n"
                    "4. Try: nslookup <hostname> to verify DNS resolution"
                )
            raise RuntimeError(f"Failed to connect to database: {e}")
        except psycopg2.Error as e:
            raise RuntimeError(f"Failed to connect to database: {e}")
        
        self._search_cache = {}

    def _get_connection(self):
        """Get a database connection"""
        return psycopg2.connect(self.db_url)

    def _politician_row_to_dict(self, row: tuple, columns: List[str]) -> Dict:
        """Convert database row to dictionary matching JSON format"""
        politician = dict(zip(columns, row))
        
        # Fetch related data
        politician_id = politician['id']
        
        # Get statements and votes
        statements = self._get_statements(politician_id)
        votes = self._get_votes(politician_id)
        
        # Build politician_details to match JSON schema
        politician['politician_details'] = {
            'statements': statements,
            'votes': votes
        }
        
        # Map database column names to JSON schema
        politician['name'] = politician.pop('full_name')
        politician['state_or_district'] = politician.pop('state')
        politician['position'] = politician.pop('current_office')
        
        # Add counts for compatibility
        politician['vote_count'] = len(votes)
        politician['statement_count'] = len(statements)
        
        # Remove internal fields
        for key in ['external_id', 'external_id_source', 'bio_text', 'source_id', 'created_at', 'updated_at']:
            politician.pop(key, None)
        
        return politician

    def _get_statements(self, politician_id: int) -> List[str]:
        """Get all statements for a politician"""
        conn = self._get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                SELECT statement_text FROM statements 
                WHERE politician_id = %s 
                ORDER BY statement_date DESC NULLS LAST
            """, (politician_id,))
            statements = [row[0] for row in cur.fetchall()]
            return statements
        finally:
            cur.close()
            conn.close()

    def _get_votes(self, politician_id: int) -> List:
        """Get all votes for a politician in [bill_title, vote_value] format"""
        conn = self._get_connection()
        cur = conn.cursor()
        
        try:
            # Use bill_id with JOIN to bills table to get bill title
            # Use COALESCE for vote_value to support both vote_position and vote_value columns
            cur.execute("""
                SELECT b.title as bill_title, 
                       COALESCE(v.vote_position, v.vote_value) as vote_value
                FROM votes v
                LEFT JOIN bills b ON v.bill_id = b.id
                WHERE v.politician_id = %s 
                ORDER BY v.vote_date DESC NULLS LAST
            """, (politician_id,))
            votes = [list(row) for row in cur.fetchall()]
            return votes
        finally:
            cur.close()
            conn.close()

    def get_all(self) -> List[Dict]:
        """Get all politicians"""
        conn = self._get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                SELECT id, full_name, state, current_office, image_url, party, 
                       external_id, external_id_source, bio_text, source_id, 
                       created_at, updated_at
                FROM politicians 
                ORDER BY id
            """)
            
            columns = [desc[0] for desc in cur.description]
            politicians = []
            
            for row in cur.fetchall():
                politician = self._politician_row_to_dict(row, columns)
                politicians.append(politician)
            
            return politicians
        finally:
            cur.close()
            conn.close()

    def get_by_id(self, politician_id: int) -> Optional[Dict]:
        """Get politician by ID"""
        conn = self._get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                SELECT id, full_name, state, current_office, image_url, party,
                       external_id, external_id_source, bio_text, source_id,
                       created_at, updated_at
                FROM politicians 
                WHERE id = %s
            """, (politician_id,))
            
            row = cur.fetchone()
            if not row:
                return None
            
            columns = [desc[0] for desc in cur.description]
            politician = self._politician_row_to_dict(row, columns)
            return politician
        finally:
            cur.close()
            conn.close()

    def search(self, name: str, zip_code: str = None, limit: int = 10) -> List[Dict]:
        """
        Search politicians by name with fuzzy matching.
        
        Args:
            name: Politician name to search for
            zip_code: Reserved for future use
            limit: Maximum results to return
        
        Returns:
            List of politicians ranked by relevance
        """
        cache_key = (name.lower(), zip_code, limit)
        
        if cache_key in self._search_cache:
            return self._search_cache[cache_key]

        # Get all politicians and search in memory (easier for fuzzy matching)
        all_politicians = self.get_all()
        
        scored_results = []
        name_lower = name.lower()

        for politician in all_politicians:
            politician_name = politician['name'].lower()

            token_score = fuzz.token_sort_ratio(name_lower, politician_name)
            partial_score = fuzz.partial_ratio(name_lower, politician_name)
            word_match = any(name_lower in word.lower() for word in politician['name'].split())

            combined_score = (token_score * 0.4) + (partial_score * 0.4) + (100 if word_match else 0) * 0.2

            if combined_score >= 60:
                scored_results.append((politician, combined_score))

        scored_results.sort(key=lambda x: x[1], reverse=True)
        results = [politician for politician, _ in scored_results[:limit]]

        if len(self._search_cache) < 256:
            self._search_cache[cache_key] = results

        return results

        
    def get_national_politicians(self):
        """Get all national-level politicians (President, VP)"""
        return [p for p in self.politicians if p.get('is_national', False)]

    def get_politicians_by_location(self, lat: float = None, lng: float = None, state: str = None):
        """
        Get politicians by location (state or coordinates).

        Args:
            lat: Latitude
            lng: Longitude
            state: State abbreviation (e.g., 'CA', 'NY')

        Returns:
            List of politicians serving that location
        """
        if state:
            # Filter by state
            return [
                p for p in self.politicians
                if not p.get('is_national', False) and
                state.upper() in p.get('state_or_district', '').upper()
            ]

        # For now, return all non-national politicians
        # In production, you'd use reverse geocoding or point-in-polygon checks
        return [p for p in self.politicians if not p.get('is_national', False)]