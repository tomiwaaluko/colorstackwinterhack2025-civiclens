from fastapi import APIRouter, HTTPException
from pathlib import Path
from ..repositories.repo import PoliticianRepo
from ..schemas.politician import PoliticianSummary

router = APIRouter()

# Get the path to the data file relative to this file
DATA_PATH = Path(__file__).parent.parent / "data" / "politicians.json"
repo = PoliticianRepo(str(DATA_PATH))

@router.get("/politicians/{id}", response_model=PoliticianSummary)
def get_politician(id: int):
    politician = repo.get_by_id(id)
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")
    return PoliticianSummary(**politician)
    