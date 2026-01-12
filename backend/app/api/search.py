from fastapi import APIRouter, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from ..repositories.repo import PoliticianRepo
from ..schemas.search import SearchResponse
from ..schemas.politician import PoliticianSummary
from ..core.database import get_db

router = APIRouter()

repo = PoliticianRepo()

@router.get("/search", response_model=SearchResponse)
async def search_politicians(
    name: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """
    Search for politicians by name and/or state.

    Args:
        name: Politician name to search for (supports partial names like "joe" → "Joe Biden")
        state: Optional state abbreviation for geographic filtering (e.g., "CA", "NY")
        limit: Maximum number of results to return (default: 20, max: 50)

    Returns:
        List of politicians ranked by relevance
    """
    # Limit the maximum number of results to prevent abuse
    limit = min(limit, 50)

    if not name and not state:
        results = await repo.get_all(db, limit=limit)
    else:
        results = await repo.search(name, db, state, limit)
    politician_summaries = [PoliticianSummary(**politician) for politician in results]
    return SearchResponse(politician_summaries=politician_summaries)
