from fastapi import FastAPI

from app.api.rag import router as rag_router
from app.api.health import router as health_router
from app.api.search import router as search_router
from app.api.politicians import router as politicians_router
from app.api.compare import router as compare_router
from app.api.qa import router as qa_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Responsible AI RAG API",
        description="Citation-first Retrieval-Augmented Generation API",
        version="0.1.0",
    )

    # Routers
    app.include_router(health_router)
    app.include_router(search_router)
    app.include_router(politicians_router)
    app.include_router(compare_router)
    app.include_router(qa_router)
    app.include_router(rag_router)

    return app


app = create_app()
