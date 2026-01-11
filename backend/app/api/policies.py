"""API endpoints for politician policies"""
from fastapi import APIRouter, HTTPException, Depends
from ..repositories.repo import PoliticianRepo
from ..schemas.policy import PoliciesResponse, Policy
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.database import get_db

router = APIRouter()

repo = PoliticianRepo()


@router.get("/politicians/{politician_id}/policies", response_model=PoliciesResponse)
async def get_politician_policies(
    politician_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get key policy positions for a specific politician"""
    politician = await repo.get_by_id(politician_id, db)
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")

    policies_data = politician.get("key_policies", [])
    policies = [Policy(**policy) for policy in policies_data]

    return PoliciesResponse(
        politician_id=politician_id,
        politician_name=politician["name"],
        policies=policies
    )
