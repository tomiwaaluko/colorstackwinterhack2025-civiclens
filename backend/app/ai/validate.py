# backend/app/ai/validate.py

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

from .schemas import AIResponse, Claim, Citation


class ValidationError(Exception):
    """Raised when an AIResponse fails citation/consistency checks."""


@dataclass(frozen=True)
class ValidationIssue:
    code: str
    message: str


def validate_response(
    response: AIResponse,
    *,
    retrieved_chunks_text_by_source_id: Dict[str, List[str]],
    require_snippet_in_evidence: bool = True,
) -> None:
    """
    Enforce hard rules beyond Pydantic schema.

    Args:
        response: Parsed AIResponse.
        retrieved_chunks_text_by_source_id: Map of source_id -> list of chunk texts retrieved.
            (Multiple chunks can share the same source_id.)
        require_snippet_in_evidence: If True, citation.snippet must appear verbatim (best effort)
            in the retrieved evidence text for that source_id.

    Raises:
        ValidationError: if any rule fails.
    """
    issues: List[ValidationIssue] = []

    # Build quick lookup for citations in the response.
    citation_by_id: Dict[str, Citation] = {c.source_id: c for c in response.citations}

    # 1) Every claim must have citations (schema already does min_length=1, but keep defensively)
    for idx, claim in enumerate(response.claims):
        if not claim.citations:
            issues.append(
                ValidationIssue(
                    code="CLAIM_NO_CITATIONS",
                    message=f"Claim[{idx}] has zero citations.",
                )
            )

    # 2) Claim citation IDs must exist in response.citations
    for idx, claim in enumerate(response.claims):
        for cid in claim.citations:
            if cid not in citation_by_id:
                issues.append(
                    ValidationIssue(
                        code="CITATION_ID_MISSING_FROM_BIBLIO",
                        message=f"Claim[{idx}] references citation source_id '{cid}' not present in citations[].",
                    )
                )

    # 3) Citation IDs must be among retrieved evidence source_ids (no phantom sources)
    retrieved_source_ids: Set[str] = set(retrieved_chunks_text_by_source_id.keys())
    for c in response.citations:
        if c.source_id not in retrieved_source_ids:
            issues.append(
                ValidationIssue(
                    code="CITATION_NOT_IN_RETRIEVED_EVIDENCE",
                    message=(
                        f"Citation source_id '{c.source_id}' is not in retrieved evidence. "
                        "The model must cite only retrieved sources."
                    ),
                )
            )

    # 4) Best-effort: snippet should appear in retrieved chunk text for that source_id
    if require_snippet_in_evidence:
        for c in response.citations:
            if c.source_id not in retrieved_chunks_text_by_source_id:
                continue  # already flagged above
            if not _snippet_in_any_chunk(c.snippet, retrieved_chunks_text_by_source_id[c.source_id]):
                issues.append(
                    ValidationIssue(
                        code="SNIPPET_NOT_FOUND_IN_EVIDENCE",
                        message=(
                            f"Citation snippet for source_id '{c.source_id}' not found in retrieved evidence text."
                        ),
                    )
                )

    # 5) Optional: ensure all claim citations are also in retrieved evidence
    for idx, claim in enumerate(response.claims):
        for cid in claim.citations:
            if cid in citation_by_id and cid not in retrieved_source_ids:
                issues.append(
                    ValidationIssue(
                        code="CLAIM_CITES_NON_RETRIEVED_SOURCE",
                        message=f"Claim[{idx}] cites '{cid}', which is not in retrieved evidence.",
                    )
                )

    if issues:
        raise ValidationError(_format_issues(issues))


# ----------------------
# Helper utilities
# ----------------------

_WS_RE = re.compile(r"\s+")


def _normalize(s: str) -> str:
    """
    Normalize text for best-effort matching:
    - lowercase
    - collapse whitespace
    """
    return _WS_RE.sub(" ", s).strip().lower()


def _snippet_in_any_chunk(snippet: str, chunks: List[str]) -> bool:
    sn = _normalize(snippet)
    if not sn:
        return False
    for ch in chunks:
        if sn in _normalize(ch):
            return True
    return False


def _format_issues(issues: List[ValidationIssue]) -> str:
    lines = ["AIResponse validation failed:"]
    for i, issue in enumerate(issues, start=1):
        lines.append(f"{i}. [{issue.code}] {issue.message}")
    return "\n".join(lines)


# ----------------------
# Convenience helper for your pipeline
# ----------------------

def build_retrieved_text_map(chunks) -> Dict[str, List[str]]:
    """
    Convenience adapter if you're using retrieval_models.RetrievedChunk objects.
    Pass in bundle.chunks and you'll get the dict validate_response expects.

    This is kept untyped on purpose to avoid import cycles.
    Expected chunk fields:
      - source_id: str
      - text: str
    """
    out: Dict[str, List[str]] = {}
    for ch in chunks:
        sid = getattr(ch, "source_id", None)
        txt = getattr(ch, "text", None)
        if not sid or not isinstance(sid, str):
            continue
        if not txt or not isinstance(txt, str):
            continue
        out.setdefault(sid, []).append(txt)
    return out
