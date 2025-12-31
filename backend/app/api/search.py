from fastapi import APIRouter
from pathlib import Path
from typing import Optional
from ..repositories.repo import PoliticianRepo
from ..schemas.search import SearchResponse
from ..schemas.politician import PoliticianSummary

router = APIRouter()

# Get the path to the data file relative to this file
DATA_PATH = Path(__file__).parent.parent / "data" / "politicians.json"
repo = PoliticianRepo(str(DATA_PATH))

@router.get("/search", response_model=SearchResponse)
def search_politicians(name: str, zip_code: Optional[str] = None):
    results = repo.search(name, zip_code)
    politician_summaries = [PoliticianSummary(**politician) for politician in results]
    return SearchResponse(politician_summaries=politician_summaries)