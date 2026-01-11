"""API endpoints for map-based politician lookup"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from ..repositories.repo import PoliticianRepo
from ..schemas.location import MapResponse, MapPolitician, Location, LocationCenter
from ..core.database import get_db

router = APIRouter()

repo = PoliticianRepo()


@router.get("/map/politicians", response_model=MapResponse)
async def get_politicians_by_location(
    lat: Optional[float] = Query(None, description="Latitude"),
    lng: Optional[float] = Query(None, description="Longitude"),
    state: Optional[str] = Query(None, description="State abbreviation (e.g., CA, NY)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get politicians serving a specific location.

    Provide either:
    - lat/lng coordinates, or
    - state abbreviation

    Returns all politicians (senators, representatives) serving that area.
    Does NOT include national-level politicians (use /politicians/national instead).
    """
    politicians = await repo.get_politicians_by_location(db, lat=lat, lng=lng, state=state)

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
async def get_national_politicians(db: AsyncSession = Depends(get_db)):
    """
    Get national-level politicians (President, Vice President).

    These are NOT shown on the map, but in a separate list/index.
    """
    politicians = await repo.get_national_politicians(db)

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
