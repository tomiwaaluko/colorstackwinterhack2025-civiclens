from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.ai.guardrails import GuardrailDecision, check_guardrails
from app.ai.generate import GenerationError, generate_answer
from app.ai.schemas import AIResponse, InsufficientDataResponse, RAGRequest
from app.ai.validate import ValidationError as AIValidationError, build_retrieved_text_map, validate_response

# You will implement this next (or adapt to your repo's DB/repositories pattern)
# Expected signature:
#   retrieve_evidence(question: str, politician_ids: list[str] | None, top_k: int) -> EvidenceBundle
from app.ai.retrieval import retrieve_evidence  # type: ignore


router = APIRouter(prefix="/api/rag", tags=["rag"])


# Optional: explicit response model for OpenAPI.
# Since you sometimes return a literal string, we handle responses manually.
@router.post("/answer")
async def rag_answer(payload: RAGRequest, db: AsyncSession = Depends(get_db)):
    """
    RAG endpoint:
    1) guardrails
    2) retrieval (pgvector)
    3) generation (Gemini)
    4) validation (citations enforced)
    """
    # 1) Guardrails
    gr = check_guardrails(payload.question)
    if gr.decision == GuardrailDecision.REFUSE:
        # Refusals are plain text for simplicity; frontend can render as assistant message.
        return PlainTextResponse(gr.message or "I can’t help with that request.", status_code=200)

    question = gr.rewritten_question or payload.question

    # 2) Retrieval
    bundle = await retrieve_evidence(
        db=db,
        question=question,
        politician_ids=payload.politician_ids,
        top_k=payload.top_k,
    )

    if not bundle.chunks:
        # Must be exact per your spec
        return PlainTextResponse(InsufficientDataResponse.INSUFFICIENT_DATA.value, status_code=200)

    # 3) Generation (Gemini)
    try:
        out = generate_answer(bundle)
    except GenerationError as e:
        # Fail closed
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    if isinstance(out, str):
        # Either "Insufficient data." or some refusal string
        return PlainTextResponse(out, status_code=200)

    # 4) Validation (citation enforcement)
    try:
        retrieved_text_map = build_retrieved_text_map(bundle.chunks)
        validate_response(out, retrieved_chunks_text_by_source_id=retrieved_text_map)
    except AIValidationError:
        # Fail closed; do not let invalid answers pass through.
        return PlainTextResponse(InsufficientDataResponse.INSUFFICIENT_DATA.value, status_code=200)

    # Return JSON response
    return JSONResponse(content=out.model_dump())


# If you prefer the router name in __init__.py, export it here:
__all__ = ["router"]
