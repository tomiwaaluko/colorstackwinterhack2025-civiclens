from pydantic import BaseModel
from typing import Optional


class LocationCenter(BaseModel):
    lat: float
    lng: float


class Location(BaseModel):
    type: str  # "national", "state", "district"
    state: Optional[str] = None
    district: Optional[str] = None
    center: LocationCenter


class MapPolitician(BaseModel):
    id: int
    name: str
    party: str
    position: str
    image_url: str
    location: Location


class MapResponse(BaseModel):
    politicians: list[MapPolitician]
