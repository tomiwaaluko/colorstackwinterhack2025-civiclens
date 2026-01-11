from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.politicians import router as politicians_router
from app.api.all_politicians import router as all_politicians_router
from app.api.qa import router as qa_router
# from app.api.rag import router as rag_router  # TODO: Enable when needed
# from app.api.search import router as search_router  # TODO: Enable when needed
# from app.api.compare import router as compare_router  # TODO: Enable when needed
# from app.api.visualizations.donations_map import router as donations_map_router  # TODO: Enable when needed
# from app.api.visualizations.timeline import router as timeline_router  # TODO: Enable when needed
# from app.api.visualizations.network_graph import router as network_graph_router  # TODO: Enable when needed
# from app.api.visualizations.radial import router as radial_router  # TODO: Enable when needed
# from app.api.admin import router as admin_router  # TODO: Enable when needed


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

    # Core routers
    app.include_router(health_router)
    app.include_router(qa_router)
    app.include_router(all_politicians_router)
    app.include_router(politicians_router)

    # Additional routers - enable when needed
    # app.include_router(search_router)
    # app.include_router(compare_router)
    # app.include_router(rag_router)
    # app.include_router(donations_map_router)
    # app.include_router(timeline_router)
    # app.include_router(network_graph_router)
    # app.include_router(radial_router)
    # app.include_router(admin_router)

    return app


app = create_app()
