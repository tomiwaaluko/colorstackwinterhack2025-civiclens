# backend/app/ai/schemas.py

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, HttpUrl, ConfigDict, field_validator


class ConfidenceLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Citation(BaseModel):
    """
    A single citation entry used for rendering + auditing.
    `source_id` must match IDs coming from your ingestion/retrieval layer.
    """
    model_config = ConfigDict(extra="forbid")

    source_id: str = Field(..., min_length=1, description="Stable ID for the source document.")
    url: Optional[HttpUrl] = Field(
        default=None,
        description="Public URL or internal URL; can be None if private/unavailable.",
    )
    title: str = Field(..., min_length=1)
    publisher: str = Field(..., min_length=1)
    retrieved_at: datetime = Field(..., description="When this source was retrieved/ingested.")
    snippet: str = Field(..., min_length=1, description="Short excerpt supporting at least one claim.")


class Claim(BaseModel):
    """
    A single claim in the answer. Every claim MUST have >=1 citations.
    Citations are references to Citation.source_id values.
    """
    model_config = ConfigDict(extra="forbid")

    text: str = Field(..., min_length=1, description="Atomic, neutral statement supported by evidence.")
    citations: List[str] = Field(
        ...,
        min_length=1,
        description="List of Citation.source_id values supporting this claim.",
    )
    confidence: ConfidenceLevel = Field(...)

    @field_validator("citations")
    @classmethod
    def citations_nonempty_and_unique(cls, v: List[str]) -> List[str]:
        cleaned = [c.strip() for c in v if c and c.strip()]
        if not cleaned:
            raise ValueError("Each claim must include at least one citation source_id.")
        # preserve order while removing duplicates
        seen = set()
        uniq: List[str] = []
        for c in cleaned:
            if c not in seen:
                seen.add(c)
                uniq.append(c)
        return uniq


class AIResponse(BaseModel):
    """
    Canonical response contract between backend and frontend.

    NOTE: If no evidence is retrieved, do NOT return this object.
    Return the literal string: "Insufficient data."
    """
    model_config = ConfigDict(extra="forbid")

    answer: str = Field(..., min_length=1, description="Short, neutral answer grounded in evidence.")
    claims: List[Claim] = Field(..., description="List of supported claims.")
    citations: List[Citation] = Field(..., description="Bibliography of sources referenced by claims.")
    limitations: Optional[str] = Field(
        default=None,
        description="Evidence gaps, conflicts, or why confidence is limited.",
    )
    disclosure: str = Field(
        ...,
        min_length=1,
        description="Plain-language disclosure of what the system does/doesn’t do.",
    )

    @field_validator("citations")
    @classmethod
    def citations_unique_by_source_id(cls, v: List[Citation]) -> List[Citation]:
        seen = set()
        out: List[Citation] = []
        for c in v:
            if c.source_id in seen:
                continue
            seen.add(c.source_id)
            out.append(c)
        return out


# ---- Optional request typing for FastAPI route ----

class RAGRequest(BaseModel):
    """Request payload for POST /api/rag/answer"""
    model_config = ConfigDict(extra="forbid")

    question: str = Field(..., min_length=1)
    politician_ids: Optional[List[str]] = Field(default=None)
    top_k: int = Field(default=8, ge=1, le=50)


class InsufficientDataResponse(str, Enum):
    """Typed literal response (if you want this in OpenAPI docs)."""
    INSUFFICIENT_DATA = "Insufficient data."
