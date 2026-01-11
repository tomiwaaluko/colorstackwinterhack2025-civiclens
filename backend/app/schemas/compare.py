from pydantic import BaseModel
from .politician import PoliticianSummary


class CompareRequest(BaseModel):
    politician_ids: list[int]

class CompareResponse(BaseModel):
    politician_summaries: list[PoliticianSummary]