from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..repositories.repo import PoliticianRepo
from ..schemas.compare import CompareResponse
from ..schemas.politician import PoliticianSummary
from ..core.database import get_db

router = APIRouter()

repo = PoliticianRepo()

@router.get("/compare", response_model=CompareResponse)
async def compare_politicians(
    ids: str = Query(..., description="Comma-separated politician IDs"),
    db: AsyncSession = Depends(get_db),
):
    # Parse comma-separated IDs
    politician_ids = [id.strip() for id in ids.split(",") if id.strip()]

    politicians = []
    for politician_id in politician_ids:
        politician = await repo.get_by_id(politician_id, db)
        if not politician:
            raise HTTPException(status_code=404, detail=f"Politician with id {politician_id} not found")
        politicians.append(PoliticianSummary(**politician))

    return CompareResponse(politician_summaries=politicians)
