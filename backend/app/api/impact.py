"""API endpoints for politician impact on constituents"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from ..repositories.repo import PoliticianRepo
from ..schemas.impact import ImpactResponse, CurrentBill
from ..core.database import get_db

router = APIRouter()

repo = PoliticianRepo()


@router.get("/politicians/{politician_id}/impact", response_model=ImpactResponse)
async def get_politician_impact(
    politician_id: str,
    zip_code: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Get current bills and impact for a specific politician.

    Shows how the politician's current legislative work affects constituents.
    """
    politician = await repo.get_by_id(politician_id, db)
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
