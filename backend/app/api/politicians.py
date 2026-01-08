from fastapi import APIRouter, HTTPException
from ..repositories.repo import PoliticianRepo
from ..schemas.politician import PoliticianSummary

router = APIRouter()

repo = PoliticianRepo()

@router.get("/politicians/{id}", response_model=PoliticianSummary)
def get_politician(id: int):
    politician = repo.get_by_id(id)
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")
    return PoliticianSummary(**politician)
    