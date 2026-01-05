# backend/app/ai/retrieval.py

from __future__ import annotations

import os
from datetime import datetime
from typing import List, Optional, Sequence

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from google import genai

from .retrieval_models import EvidenceBundle, RetrievedChunk


# ---- Config (env-overridable) ----
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

DEFAULT_TOP_K = int(os.getenv("RAG_TOP_K", "8"))

# If all retrieved chunks are weaker than this threshold, treat as "no evidence"
# similarity ~ (1 - cosine_distance) when using pgvector <=> operator for cosine distance
MIN_SIMILARITY = float(os.getenv("RAG_MIN_SIMILARITY", "0.20"))


class RetrievalError(RuntimeError):
    pass


def _embed_query(text_to_embed: str) -> List[float]:
    """
    Returns a vector embedding for the query using Gemini embeddings.
    Uses the Google Gen AI Python SDK embed_content API. :contentReference[oaicite:2]{index=2}
    """
    if not GEMINI_API_KEY:
        raise RetrievalError("Missing GEMINI_API_KEY (set env var).")

    client = genai.Client(api_key=GEMINI_API_KEY)

    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text_to_embed,
    )

    # google-genai returns an object containing embeddings; commonly it's a list with one embedding.
    # We support both shapes defensively.
    emb = None
    if hasattr(result, "embeddings") and result.embeddings:
        # result.embeddings may be list[Embedding] or similar
        first = result.embeddings[0]
        emb = getattr(first, "values", None) or getattr(first, "embedding", None) or first
    elif hasattr(result, "embedding"):
        emb = getattr(result.embedding, "values", None) or result.embedding

    if emb is None:
        raise RetrievalError("Embedding call returned no embedding vector.")

    # Ensure plain list[float]
    return list(emb)


async def retrieve_evidence(
    *,
    db: AsyncSession,
    question: str,
    politician_ids: Optional[List[str]] = None,
    top_k: int = DEFAULT_TOP_K,
) -> EvidenceBundle:
    """
    Retrieve top-k chunks for a question (optionally filtered by politician_ids).

    Expected DB schema (adjust table/column names here to match your project):
      - chunks: id, source_id, text, embedding (pgvector), politician_id OR politician_ids
      - sources: id, url, title, publisher, retrieved_at

    Returns:
      EvidenceBundle(question=..., chunks=[RetrievedChunk, ...])
    """
    qvec = _embed_query(question)

    # IMPORTANT:
    # pgvector expects the vector param to be cast to ::vector in SQL.
    # We'll pass a string like '[0.1, 0.2, ...]' and cast it.
    qvec_str = "[" + ",".join(f"{x:.8f}" for x in qvec) + "]"

    # --- Choose ONE filter style depending on your schema ---
    # Option A: chunks.politician_id is a single value
    politician_filter_sql = ""
    params = {
        "qvec": qvec_str,
        "top_k": top_k,
    }

    if politician_ids:
        # If your schema uses single politician_id per chunk:
        politician_filter_sql = "AND c.politician_id = ANY(:politician_ids)"
        params["politician_ids"] = politician_ids

        # If your schema uses an array column (e.g., c.politician_ids TEXT[]), replace with:
        # politician_filter_sql = "AND c.politician_ids && :politician_ids"

    sql = text(
        f"""
        SELECT
            c.id AS chunk_id,
            c.source_id AS source_id,
            c.text AS chunk_text,
            -- distance is cosine distance when using <=> on pgvector (if configured as cosine distance opclass)
            (c.embedding <=> (:qvec::vector)) AS distance,
            s.url AS url,
            s.title AS title,
            s.publisher AS publisher,
            s.retrieved_at AS retrieved_at
        FROM chunks c
        JOIN sources s ON s.id = c.source_id
        WHERE 1=1
        {politician_filter_sql}
        ORDER BY c.embedding <=> (:qvec::vector) ASC
        LIMIT :top_k
        """
    )

    rows = (await db.execute(sql, params)).mappings().all()

    chunks: List[RetrievedChunk] = []
    for r in rows:
        distance = float(r["distance"]) if r["distance"] is not None else None
        similarity = (1.0 - distance) if distance is not None else None

        retrieved_at = r["retrieved_at"]
        if isinstance(retrieved_at, str):
            # If your DB returns string timestamps, you can parse; otherwise leave as-is.
            retrieved_at = datetime.fromisoformat(retrieved_at)

        chunks.append(
            RetrievedChunk(
                chunk_id=str(r["chunk_id"]),
                source_id=str(r["source_id"]),
                text=str(r["chunk_text"]),
                url=str(r["url"]) if r["url"] is not None else None,
                title=str(r["title"]),
                publisher=str(r["publisher"]),
                retrieved_at=retrieved_at,
                score=similarity,
                politician_ids=politician_ids,
                metadata=None,
            )
        )

    # Fail-closed: if nothing, EvidenceBundle with empty chunks
    if not chunks:
        return EvidenceBundle(question=question, chunks=[], politician_ids=politician_ids, top_k=top_k)

    # If the best chunk is still too weak, treat as no evidence
    best = chunks[0].score
    if best is None or best < MIN_SIMILARITY:
        return EvidenceBundle(question=question, chunks=[], politician_ids=politician_ids, top_k=top_k)

    return EvidenceBundle(question=question, chunks=chunks, politician_ids=politician_ids, top_k=top_k)
