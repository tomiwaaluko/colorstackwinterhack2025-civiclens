from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# from app.api.rag import router as rag_router  # Requires database
from app.api.health import router as health_router
from app.api.search import router as search_router
from app.api.politicians import router as politicians_router
from app.api.compare import router as compare_router
from app.api.qa import router as qa_router
from app.api.visualizations.donations_map import router as donations_map_router
from app.api.visualizations.timeline import router as timeline_router
from app.api.visualizations.network_graph import router as network_graph_router
from app.api.visualizations.radial import router as radial_router
from app.api.visualizations.ai_insights import router as ai_insights_router
from app.api.admin import router as admin_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="CivicLens AI API",
        description="AI-powered Q&A for political information",
        version="0.1.0",
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://civiclensai.vercel.app",  # Production Vercel domain
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(health_router)
    app.include_router(search_router)
    app.include_router(politicians_router)
    app.include_router(compare_router)
    app.include_router(qa_router)
    
    # Visualization routers
    app.include_router(donations_map_router)
    app.include_router(timeline_router)
    app.include_router(network_graph_router)
    app.include_router(radial_router)
    app.include_router(ai_insights_router)
    
    # Admin routers
    app.include_router(admin_router)

    return app


app = create_app()
