from pydantic import BaseModel


class Policy(BaseModel):
    category: str
    stance: str
    description: str
    impact: str


class PoliciesResponse(BaseModel):
    politician_id: int
    politician_name: str
    policies: list[Policy]
