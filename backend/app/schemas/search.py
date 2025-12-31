from pydantic import BaseModel
from typing import Optional
from .politician import PoliticianSummary


class SearchRequest(BaseModel):
    name: str
    zip_code: Optional[str] = None

class SearchResponse(BaseModel):
    politician_summaries: list[PoliticianSummary]
