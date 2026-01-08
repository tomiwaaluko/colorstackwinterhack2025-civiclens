"""API endpoint to get all politicians"""
from fastapi import APIRouter
from pathlib import Path
from ..repositories.repo import PoliticianRepo
from ..schemas.politician import PoliticianSummary

router = APIRouter()

DATA_PATH = Path(__file__).parent.parent / "data" / "politicians.json"
repo = PoliticianRepo(str(DATA_PATH))


@router.get("/politicians", response_model=list[PoliticianSummary])
def get_all_politicians():
    """
    Get all politicians in the system.

    Returns a complete list of all politicians including national and local officials.
    """
    politicians = repo.get_all()
    return [PoliticianSummary(**p) for p in politicians]
