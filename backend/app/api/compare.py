from fastapi import APIRouter, Query, HTTPException
from pathlib import Path
from ..repositories.repo import PoliticianRepo
from ..schemas.compare import CompareResponse
from ..schemas.politician import PoliticianSummary

router = APIRouter()

# Get the path to the data file relative to this file
DATA_PATH = Path(__file__).parent.parent / "data" / "politicians.json"
repo = PoliticianRepo(str(DATA_PATH))

@router.get("/compare", response_model=CompareResponse)
def compare_politicians(ids: str = Query(..., description="Comma-separated politician IDs")):
    # Parse comma-separated IDs
    politician_ids = [int(id.strip()) for id in ids.split(",")]

    politicians = []
    for politician_id in politician_ids:
        politician = repo.get_by_id(politician_id)
        if not politician:
            raise HTTPException(status_code=404, detail=f"Politician with id {politician_id} not found")
        politicians.append(PoliticianSummary(**politician))

    return CompareResponse(politician_summaries=politicians)