"""API endpoints for politician voting records"""
from fastapi import APIRouter, HTTPException, Depends
from ..repositories.repo import PoliticianRepo
from ..schemas.vote import VotesResponse, Vote
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.database import get_db

router = APIRouter()

repo = PoliticianRepo()


@router.get("/politicians/{politician_id}/votes", response_model=VotesResponse)
async def get_politician_votes(
    politician_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get voting record for a specific politician"""
    politician = await repo.get_by_id(politician_id, db)
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")

    votes_data = politician.get("recent_votes", [])
    votes = [Vote(**vote) for vote in votes_data]

    return VotesResponse(
        politician_id=politician_id,
        politician_name=politician["name"],
        votes=votes
    )
