from pydantic import BaseModel, Field
from typing import Optional, List


class PoliticianDetail(BaseModel):
    """Details about a politician's statements and votes"""
    statements: Optional[List[str]] = Field(default_factory=list)
    votes: Optional[List[List[str]]] = Field(default_factory=list)


class PoliticianSummary(BaseModel):
    """Summary of a politician with their key information"""
    id: str  # Changed to str to support UUID
    name: str
    image_url: Optional[str] = None  # Made optional to handle NULL values
    party: Optional[str] = None  # Made flexible to handle various party names
    state_or_district: str
    position: Optional[str] = None  # Made flexible to handle various position names
    vote_count: int = 0
    statement_count: int = 0
    politician_details: Optional[PoliticianDetail] = None
