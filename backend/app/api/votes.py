"""API endpoints for politician voting records"""
from fastapi import APIRouter, HTTPException
from pathlib import Path
from ..repositories.repo import PoliticianRepo
from ..schemas.vote import VotesResponse, Vote

router = APIRouter()

DATA_PATH = Path(__file__).parent.parent / "data" / "politicians.json"
repo = PoliticianRepo(str(DATA_PATH))


@router.get("/politicians/{politician_id}/votes", response_model=VotesResponse)
def get_politician_votes(politician_id: int):
    """Get voting record for a specific politician"""
    politician = repo.get_by_id(politician_id)
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")

    votes_data = politician.get("recent_votes", [])
    votes = [Vote(**vote) for vote in votes_data]

    return VotesResponse(
        politician_id=politician_id,
        politician_name=politician["name"],
        votes=votes
    )
