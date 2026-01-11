from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..repositories.repo import PoliticianRepo
from ..schemas.politician import PoliticianSummary
from ..core.database import get_db

router = APIRouter()

@router.get("/politicians/{id}", response_model=PoliticianSummary)
async def get_politician(id: str, db: AsyncSession = Depends(get_db)):
    """Get a politician by their ID (UUID)"""
    repo = PoliticianRepo()
    politician = await repo.get_by_id(id, db)
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")
    return PoliticianSummary(**politician)
