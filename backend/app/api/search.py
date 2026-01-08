from fastapi import APIRouter
from typing import Optional
from ..repositories.repo import PoliticianRepo
from ..schemas.search import SearchResponse
from ..schemas.politician import PoliticianSummary

router = APIRouter()

repo = PoliticianRepo()

@router.get("/search", response_model=SearchResponse)
def search_politicians(name: str, zip_code: Optional[str] = None, limit: int = 10):
    """
    Search for politicians by name with fuzzy matching.

    Args:
        name: Politician name to search for (supports partial names like "joe" → "Joe Biden")
        zip_code: Optional zip code for geographic filtering (not yet implemented)
        limit: Maximum number of results to return (default: 10, max: 50)

    Returns:
        List of politicians ranked by relevance
    """
    # Limit the maximum number of results to prevent abuse
    limit = min(limit, 50)

    results = repo.search(name, zip_code, limit)
    politician_summaries = [PoliticianSummary(**politician) for politician in results]
    return SearchResponse(politician_summaries=politician_summaries)