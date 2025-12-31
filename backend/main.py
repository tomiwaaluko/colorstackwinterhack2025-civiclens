from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, search, politicians, compare

app = FastAPI(
    title="Civic Lens API",
    description="API for politician search, profiles, and comparison",
    version="1.0.0"
)

# CORS middleware - allows frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(health.router, tags=["Health"])
app.include_router(search.router, tags=["Search"])
app.include_router(politicians.router, tags=["Politicians"])
app.include_router(compare.router, tags=["Compare"])

@app.get("/")
def root():
    return {
        "message": "Welcome to Civic Lens API",
        "docs": "/docs",
        "health": "/health"
    }
