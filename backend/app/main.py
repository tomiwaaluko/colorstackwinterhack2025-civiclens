from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# from app.api.rag import router as rag_router  # Requires database
from app.api.health import router as health_router
# from app.api.search import router as search_router  # Requires database
# from app.api.politicians import router as politicians_router  # Requires database
# from app.api.compare import router as compare_router  # Requires database
from app.api.qa import router as qa_router  # Works without database
# from app.api.visualizations.donations_map import router as donations_map_router  # Requires database
# from app.api.visualizations.timeline import router as timeline_router  # Requires database
# from app.api.visualizations.network_graph import router as network_graph_router  # Requires database
# from app.api.visualizations.radial import router as radial_router  # Requires database
# from app.api.admin import router as admin_router  # Requires database


def create_app() -> FastAPI:
    app = FastAPI(
        title="CivicLens AI API",
        description="AI-powered Q&A for political information",
        version="0.1.0",
    )

    # CORS middleware to allow frontend connections
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers (only database-free routes enabled for now)
    app.include_router(health_router)
    app.include_router(qa_router)  # AI endpoint - works without database
    # app.include_router(search_router)  # Uncomment when database is set up
    # app.include_router(politicians_router)  # Uncomment when database is set up
    # app.include_router(compare_router)  # Uncomment when database is set up
    # app.include_router(rag_router)  # Uncomment when database is set up
    
    # Visualization routers - uncomment when database is set up
    # app.include_router(donations_map_router)
    # app.include_router(timeline_router)
    # app.include_router(network_graph_router)
    # app.include_router(radial_router)
    
    # Admin router - uncomment when database is set up
    # app.include_router(admin_router)

    return app


app = create_app()
