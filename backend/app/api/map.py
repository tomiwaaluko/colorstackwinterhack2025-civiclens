"""API endpoints for map-based politician lookup"""
from fastapi import APIRouter, Query
from pathlib import Path
from typing import Optional
from ..repositories.repo import PoliticianRepo
from ..schemas.location import MapResponse, MapPolitician, Location, LocationCenter

router = APIRouter()

DATA_PATH = Path(__file__).parent.parent / "data" / "politicians.json"
repo = PoliticianRepo(str(DATA_PATH))


@router.get("/map/politicians", response_model=MapResponse)
def get_politicians_by_location(
    lat: Optional[float] = Query(None, description="Latitude"),
    lng: Optional[float] = Query(None, description="Longitude"),
    state: Optional[str] = Query(None, description="State abbreviation (e.g., CA, NY)")
):
    """
    Get politicians serving a specific location.

    Provide either:
    - lat/lng coordinates, or
    - state abbreviation

    Returns all politicians (senators, representatives) serving that area.
    Does NOT include national-level politicians (use /politicians/national instead).
    """
    politicians = repo.get_politicians_by_location(lat=lat, lng=lng, state=state)

    map_politicians = []
    for p in politicians:
        location_data = p.get("location", {})
        location = Location(
            type=location_data.get("type", "unknown"),
            state=location_data.get("state"),
            district=location_data.get("district"),
            center=LocationCenter(**location_data.get("center", {"lat": 0, "lng": 0}))
        )

        map_politicians.append(MapPolitician(
            id=p["id"],
            name=p["name"],
            party=p["party"],
            position=p["position"],
            image_url=p["image_url"],
            location=location
        ))

    return MapResponse(politicians=map_politicians)


@router.get("/map/national", response_model=MapResponse)
def get_national_politicians():
    """
    Get national-level politicians (President, Vice President).

    These are NOT shown on the map, but in a separate list/index.
    """
    politicians = repo.get_national_politicians()

    map_politicians = []
    for p in politicians:
        location_data = p.get("location", {})
        location = Location(
            type=location_data.get("type", "national"),
            state=location_data.get("state"),
            district=location_data.get("district"),
            center=LocationCenter(**location_data.get("center", {"lat": 38.9072, "lng": -77.0369}))
        )

        map_politicians.append(MapPolitician(
            id=p["id"],
            name=p["name"],
            party=p["party"],
            position=p["position"],
            image_url=p["image_url"],
            location=location
        ))

    return MapResponse(politicians=map_politicians)
