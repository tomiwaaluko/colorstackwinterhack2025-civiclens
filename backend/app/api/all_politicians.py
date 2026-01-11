"""API endpoint to get all politicians"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..repositories.repo import PoliticianRepo
from ..schemas.politician import PoliticianSummary
from ..core.database import get_db

router = APIRouter()


@router.get("/politicians", response_model=list[PoliticianSummary])
async def get_all_politicians(db: AsyncSession = Depends(get_db)):
    """
    Get all politicians in the system.

    Returns a complete list of all politicians including national and local officials.
    """
    repo = PoliticianRepo()
    politicians = await repo.get_all(db)
    return [PoliticianSummary(**p) for p in politicians]
