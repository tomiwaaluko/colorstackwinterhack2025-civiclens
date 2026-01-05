from fastapi import FastAPI

from app.api.rag import router as rag_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Responsible AI RAG API",
        description="Citation-first Retrieval-Augmented Generation API",
        version="0.1.0",
    )

    # Routers
    app.include_router(rag_router)

    return app


app = create_app()
