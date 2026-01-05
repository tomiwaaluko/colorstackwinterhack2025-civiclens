# backend/app/api/qa.py

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/qa", tags=["qa"])


class QARequest(BaseModel):
    question: str
    context: str | None = None


class QAResponse(BaseModel):
    answer: str
    confidence: float | None = None


@router.post("/ask", response_model=QAResponse)
async def ask_question(payload: QARequest):
    """
    Simple Q&A endpoint (placeholder for future RAG integration).
    
    For full RAG with citations and guardrails, use /api/rag/answer instead.
    This endpoint is for simpler, non-citation-based Q&A.
    """
    # Placeholder implementation - integrate with AI service as needed
    return QAResponse(
        answer="This is a placeholder response. Please use /api/rag/answer for full RAG capabilities.",
        confidence=None
    )


__all__ = ["router"]
