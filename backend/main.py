from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import (
    health,
    search,
    politicians,
    compare,
    votes,
    policies,
    impact,
    map as map_api,
    all_politicians
)

app = FastAPI(
    title="Civic Lens API",
    description="API for politician search, profiles, comparison, and civic engagement",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routes
app.include_router(health.router, tags=["Health"])
app.include_router(search.router, tags=["Search"])
app.include_router(all_politicians.router, tags=["Politicians"])
app.include_router(politicians.router, tags=["Politicians"])
app.include_router(compare.router, tags=["Compare"])

# Detailed politician data routes
app.include_router(votes.router, tags=["Votes"])
app.include_router(policies.router, tags=["Policies"])
app.include_router(impact.router, tags=["Impact"])

# Map-based routes
app.include_router(map_api.router, tags=["Map"])

@app.get("/")
def root():
    return {
        "message": "Welcome to Civic Lens API - Making Politics Personal",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "search": "/search?name={name}&zip_code={zip}&limit={limit}",
            "all_politicians": "/politicians",
            "politician_profile": "/politicians/{id}",
            "compare": "/compare?ids=1,2,3",
            "votes": "/politicians/{id}/votes",
            "policies": "/politicians/{id}/policies",
            "impact": "/politicians/{id}/impact",
            "map_search": "/map/politicians?state={state}",
            "national_politicians": "/map/national"
        }
    }
