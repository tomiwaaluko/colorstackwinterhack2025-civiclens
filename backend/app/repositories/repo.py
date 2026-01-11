"""
Repository layer for politicians data.

Uses async SQLAlchemy with PostgreSQL/Supabase.
Maintains the same interface for backward compatibility.
"""

import os
from typing import List, Dict, Optional
from uuid import UUID
from rapidfuzz import fuzz
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv

load_dotenv()


class PoliticianRepo:
    """Repository for accessing politician data from PostgreSQL via async SQLAlchemy"""

    def __init__(self, db_session: AsyncSession = None):
        """
        Initialize repository with database session.

        Args:
            db_session: SQLAlchemy AsyncSession. If not provided, will be passed in method calls.
        """
        self.db_session = db_session
        self._search_cache = {}

    async def _politician_row_to_dict(self, row, db: AsyncSession) -> Dict:
        """Convert database row to dictionary matching JSON format"""
        # Convert SQLAlchemy Row to dict
        politician = {
            'id': str(row.id),  # Convert UUID to string
            'full_name': row.full_name,
            'state': row.state,
            'current_office': row.current_office,
            'image_url': row.image_url,
            'party': row.party,
        }

        # Fetch related data
        politician_id = row.id

        # Get statements and votes
        statements = await self._get_statements(politician_id, db)
        votes = await self._get_votes(politician_id, db)

        # Build politician_details to match JSON schema
        politician['politician_details'] = {
            'statements': statements,
            'votes': votes
        }

        # Map database column names to JSON schema
        politician['name'] = politician.pop('full_name')
        politician['state_or_district'] = politician.pop('state') or 'National'
        politician['position'] = politician.pop('current_office') or 'Unknown'

        # Add counts for compatibility
        politician['vote_count'] = len(votes)
        politician['statement_count'] = len(statements)

        return politician

    async def _get_statements(self, politician_id: UUID, db: AsyncSession) -> List[str]:
        """Get all statements for a politician"""
        result = await db.execute(
            text("""
                SELECT statement_text FROM statements
                WHERE politician_id = :politician_id
                ORDER BY statement_date DESC NULLS LAST
            """),
            {"politician_id": politician_id}
        )
        statements = [row[0] for row in result.fetchall()]
        return statements

    async def _get_votes(self, politician_id: UUID, db: AsyncSession) -> List:
        """Get all votes for a politician in [bill_title, vote_value] format"""
        result = await db.execute(
            text("""
                SELECT COALESCE(b.title, v.bill_title, 'Unknown Bill') as bill_title,
                       COALESCE(v.vote_position, v.vote_value, 'Unknown') as vote_value
                FROM votes v
                LEFT JOIN bills b ON v.bill_id = b.id
                WHERE v.politician_id = :politician_id
                ORDER BY v.vote_date DESC NULLS LAST
                LIMIT 10
            """),
            {"politician_id": politician_id}
        )
        votes = [list(row) for row in result.fetchall()]
        return votes

    async def get_all(self, db: AsyncSession) -> List[Dict]:
        """Get all politicians"""
        result = await db.execute(
            text("""
                SELECT id, full_name, state, current_office, image_url, party
                FROM politicians
                ORDER BY full_name
            """)
        )

        politicians = []
        for row in result.fetchall():
            politician = await self._politician_row_to_dict(row, db)
            politicians.append(politician)

        return politicians

    async def get_by_id(self, politician_id: str, db: AsyncSession) -> Optional[Dict]:
        """Get politician by ID"""
        try:
            # Convert string ID to UUID
            uuid_id = UUID(politician_id) if isinstance(politician_id, str) else politician_id
        except (ValueError, AttributeError):
            return None

        result = await db.execute(
            text("""
                SELECT id, full_name, state, current_office, image_url, party
                FROM politicians
                WHERE id = :politician_id
            """),
            {"politician_id": uuid_id}
        )

        row = result.fetchone()
        if not row:
            return None

        politician = await self._politician_row_to_dict(row, db)
        return politician

    async def search(self, name: str, db: AsyncSession, zip_code: str = None, limit: int = 10) -> List[Dict]:
        """
        Search politicians by name with fuzzy matching.

        Args:
            name: Politician name to search for
            db: Database session
            zip_code: Reserved for future use
            limit: Maximum results to return

        Returns:
            List of politicians ranked by relevance
        """
        cache_key = (name.lower(), zip_code, limit)

        if cache_key in self._search_cache:
            return self._search_cache[cache_key]

        # Get all politicians and search in memory (easier for fuzzy matching)
        all_politicians = await self.get_all(db)

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

    async def get_national_politicians(self, db: AsyncSession) -> List[Dict]:
        """Get all national-level politicians"""
        # In the database, we can identify national politicians by checking if they have no specific state
        all_politicians = await self.get_all(db)
        return [p for p in all_politicians if p.get('state_or_district') == 'National']

    async def get_politicians_by_location(self, db: AsyncSession, lat: float = None, lng: float = None, state: str = None) -> List[Dict]:
        """
        Get politicians by location (state or coordinates).

        Args:
            db: Database session
            lat: Latitude
            lng: Longitude
            state: State abbreviation (e.g., 'CA', 'NY')

        Returns:
            List of politicians serving that location
        """
        if state:
            # Query by state
            result = await db.execute(
                text("""
                    SELECT id, full_name, state, current_office, image_url, party
                    FROM politicians
                    WHERE state ILIKE :state
                    ORDER BY full_name
                """),
                {"state": f"%{state}%"}
            )

            politicians = []
            for row in result.fetchall():
                politician = await self._politician_row_to_dict(row, db)
                politicians.append(politician)

            return politicians

        # For now, return all politicians
        return await self.get_all(db)