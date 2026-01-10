from pydantic import BaseModel


class CurrentBill(BaseModel):
    title: str
    status: str
    your_impact: str


class ImpactResponse(BaseModel):
    politician_id: int
    politician_name: str
    current_bills: list[CurrentBill]
    summary: str
