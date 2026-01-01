from pydantic import BaseModel
from datetime import date


class Vote(BaseModel):
    bill_name: str
    vote: str
    date: str
    description: str


class VotesResponse(BaseModel):
    politician_id: int
    politician_name: str
    votes: list[Vote]
