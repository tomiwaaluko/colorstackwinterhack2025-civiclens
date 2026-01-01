"""API endpoints for politician policies"""
from fastapi import APIRouter, HTTPException
from pathlib import Path
from ..repositories.repo import PoliticianRepo
from ..schemas.policy import PoliciesResponse, Policy

router = APIRouter()

DATA_PATH = Path(__file__).parent.parent / "data" / "politicians.json"
repo = PoliticianRepo(str(DATA_PATH))


@router.get("/politicians/{politician_id}/policies", response_model=PoliciesResponse)
def get_politician_policies(politician_id: int):
    """Get key policy positions for a specific politician"""
    politician = repo.get_by_id(politician_id)
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")

    policies_data = politician.get("key_policies", [])
    policies = [Policy(**policy) for policy in policies_data]

    return PoliciesResponse(
        politician_id=politician_id,
        politician_name=politician["name"],
        policies=policies
    )
