from pydantic import BaseModel
from typing import Optional
from enum import Enum

class PoliticalPary(Enum):
    DEMOCRAT = "Democrat"
    REPUBLICAN = "Republican"
    INDEPENDENT = "Independent"
    OTHER = "Other"

class Position(Enum):
    SENATOR = "Senator"
    REPRESENTATIVE = "Representative"
    GOVERNOR = "Governor"
    MAYOR = "Mayor"
    OTHER = "Other"

class VoteDescision(Enum):
    YES = "Yes"
    NO = "No"
    ABSTAIN = "Abstain"
    NOT_PRESENT = "Not Present"

class PoliticianSummary(BaseModel):

    id : int
    name : str
    image_url : str
    party : PoliticalPary
    state_or_district : str
    position : Position
    vote_count : int
    statement_count : int
    politician_details : Optional[PoliticianDetail]

class PoliticianDetail(BaseModel):
    
    statements : Optional[list[str]] 
    votes : Optional[list[(str, VoteDescision)]]

