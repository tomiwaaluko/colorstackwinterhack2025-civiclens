# backend/app/ai/retrieval_models.py

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class RetrievedChunk:
    """
    What retrieval returns (per chunk). This is your "evidence atom".
    Keep it simple and stable—generation + validation depend on it.
    """
    chunk_id: str
    source_id: str

    text: str  # the actual chunk text used for snippet checks

    # Source metadata (for building citations)
    url: Optional[str]
    title: str
    publisher: str
    retrieved_at: datetime

    # Retrieval metadata (optional but useful)
    score: Optional[float] = None
    politician_ids: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None  # section, page, etc.


@dataclass(frozen=True)
class EvidenceBundle:
    """
    Convenience wrapper that retrieval.py can return.
    """
    question: str
    chunks: List[RetrievedChunk]

    # Optional: include filters used so you can log/debug later
    politician_ids: Optional[List[str]] = None
    top_k: int = 8

    def source_ids(self) -> List[str]:
        seen = set()
        out: List[str] = []
        for ch in self.chunks:
            if ch.source_id not in seen:
                seen.add(ch.source_id)
                out.append(ch.source_id)
        return out
