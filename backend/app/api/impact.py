"""API endpoints for politician impact on constituents"""
from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import Optional
from ..repositories.repo import PoliticianRepo
from ..schemas.impact import ImpactResponse, CurrentBill

router = APIRouter()

DATA_PATH = Path(__file__).parent.parent / "data" / "politicians.json"
repo = PoliticianRepo(str(DATA_PATH))


@router.get("/politicians/{politician_id}/impact", response_model=ImpactResponse)
def get_politician_impact(politician_id: int, zip_code: Optional[str] = None):
    """
    Get current bills and impact for a specific politician.

    Shows how the politician's current legislative work affects constituents.
    """
    politician = repo.get_by_id(politician_id)
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")

    bills_data = politician.get("current_bills", [])
    bills = [CurrentBill(**bill) for bill in bills_data]

    # Generate summary
    bill_count = len(bills)
    summary = f"{politician['name']} is currently working on {bill_count} bill{'s' if bill_count != 1 else ''} that affect you."

    return ImpactResponse(
        politician_id=politician_id,
        politician_name=politician["name"],
        current_bills=bills,
        summary=summary
    )
