# backend/app/ai/guardrails.py

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class GuardrailDecision(str, Enum):
    ALLOW = "allow"
    REFUSE = "refuse"
    REFRAME = "reframe"


@dataclass(frozen=True)
class GuardrailResult:
    """
    Result of a guardrails check.
    - decision: allow / refuse / reframe
    - message: what to return to the user if not allowed
    - rewritten_question: optional safer version of the question
    """
    decision: GuardrailDecision
    message: Optional[str] = None
    rewritten_question: Optional[str] = None


# ---- keyword / pattern buckets ----

RANKING_PATTERNS = [
    r"\bwho is better\b",
    r"\bwho is worse\b",
    r"\bbetter than\b",
    r"\bworse than\b",
    r"\bbest\b",
    r"\bworst\b",
    r"\brank\b",
    r"\btop\s+\d+\b",
]

ENDORSEMENT_PATTERNS = [
    r"\bshould i vote for\b",
    r"\bwho should i vote for\b",
    r"\brecommend\b",
    r"\bendorse\b",
    r"\bsupport\b",
]

PREDICTION_PATTERNS = [
    r"\bwho will win\b",
    r"\bwho is going to win\b",
    r"\bwill win\b",
    r"\bchances of winning\b",
    r"\bpredict\b",
    r"\blikely to win\b",
]

MORALIZED_PATTERNS = [
    r"\bcorrupt\b",
    r"\bcriminal\b",
    r"\bevil\b",
    r"\blying\b",
    r"\bfraud\b",
]


# ---- core guardrails logic ----

def check_guardrails(question: str) -> GuardrailResult:
    """
    Deterministic pre-LLM guardrails.

    This runs BEFORE retrieval or generation.
    Do not rely on the LLM to enforce these rules.
    """
    q = question.lower().strip()

    # Ranking / comparison language
    if _matches_any(q, RANKING_PATTERNS):
        return GuardrailResult(
            decision=GuardrailDecision.REFUSE,
            message=(
                "I can’t rank or judge who is better or worse. "
                "If you’d like, I can summarize specific, cited evidence "
                "about each individual instead."
            ),
        )

    # Endorsements / voting advice
    if _matches_any(q, ENDORSEMENT_PATTERNS):
        return GuardrailResult(
            decision=GuardrailDecision.REFUSE,
            message=(
                "I can’t provide endorsements or voting recommendations. "
                "I can share cited information about policies or actions instead."
            ),
        )

    # Predictions
    if _matches_any(q, PREDICTION_PATTERNS):
        return GuardrailResult(
            decision=GuardrailDecision.REFUSE,
            message=(
                "I can’t make predictions about outcomes. "
                "I can summarize past events or documented evidence if you’d like."
            ),
        )

    # Loaded / moralized language → reframe
    if _matches_any(q, MORALIZED_PATTERNS):
        return GuardrailResult(
            decision=GuardrailDecision.REFRAME,
            message=(
                "I can’t make moral judgments. I can summarize documented facts "
                "from reliable sources if you want."
            ),
            rewritten_question=_neutralize_language(question),
        )

    return GuardrailResult(decision=GuardrailDecision.ALLOW)


# ---- helpers ----

def _matches_any(text: str, patterns: list[str]) -> bool:
    for p in patterns:
        if re.search(p, text):
            return True
    return False


def _neutralize_language(question: str) -> str:
    """
    Best-effort rewrite to remove loaded language.
    This does NOT add facts—just neutralizes wording.
    """
    replacements = {
        r"\bcorrupt\b": "involved in documented investigations or allegations",
        r"\bcriminal\b": "associated with documented legal cases",
        r"\bevil\b": "controversial",
        r"\blying\b": "making statements disputed by sources",
        r"\bfraud\b": "accused of fraud in documented cases",
    }

    rewritten = question
    for pattern, replacement in replacements.items():
        rewritten = re.sub(pattern, replacement, rewritten, flags=re.IGNORECASE)

    return rewritten.strip()
