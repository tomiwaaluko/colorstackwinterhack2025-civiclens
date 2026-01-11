# Generate# backend/app/ai/generate.py

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional, Union

from pydantic import ValidationError

from .schemas import AIResponse
from .retrieval_models import EvidenceBundle, RetrievedChunk

# Gemini SDK
# pip install google-genai
from google import genai
from google.genai import types


PROMPTS_DIR = Path(__file__).parent / "prompts"
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


class GenerationError(RuntimeError):
    pass


def generate_answer(
    bundle: EvidenceBundle,
    *,
    model: str = DEFAULT_MODEL,
    api_key: Optional[str] = None,
    temperature: float = 0.2,
    max_output_tokens: int = 1200,
    retry_on_invalid_json: int = 1,
) -> Union[AIResponse, str]:
    """
    Calls Gemini to produce a citation-first JSON response matching AIResponse.

    Returns:
      - AIResponse (validated) on success
      - literal string "Insufficient data." if the model outputs that OR if bundle is empty

    Notes:
      - This function only generates; validation beyond Pydantic schema should be done in validate.py
      - Fail-closed behavior is implemented: if output can't be parsed after retry, raises GenerationError.
    """
    if not bundle.chunks:
        return "Insufficient data."

    system_prompt = _load_prompt("system_prompt.txt")
    answer_prompt = _load_prompt("answer_prompt.txt")

    evidence_blocks = _format_evidence(bundle.chunks)
    user_text = answer_prompt.format(question=bundle.question, evidence_blocks=evidence_blocks)

    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        raise GenerationError("Missing GEMINI_API_KEY (set env var or pass api_key=...).")

    client = genai.Client(api_key=key)

    config = types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        # Encourages JSON-only responses.
        response_mime_type="application/json",
        # Add safety settings here if your org wants stricter blocking.
    )

    last_err: Optional[Exception] = None

    for attempt in range(retry_on_invalid_json + 1):
        resp = client.models.generate_content(
            model=model,
            contents=[
                types.Content(role="user", parts=[types.Part(text=_compose_prompt(system_prompt, user_text))])
            ],
            config=config,
        )

        text = (resp.text or "").strip()

        # Allow exact insufficient data short-circuit.
        if text == "Insufficient data.":
            return text

        try:
            data = _parse_json_strict(text)
            # Pydantic schema validation (structure/type only)
            return AIResponse.model_validate(data)
        except (json.JSONDecodeError, ValidationError, ValueError) as e:
            last_err = e
            if attempt >= retry_on_invalid_json:
                break

            # Retry once with explicit correction message appended.
            correction = (
                "\n\nYour previous response was invalid. "
                "Return ONLY valid JSON matching the schema. "
                "Do not include code fences or extra text."
            )
            user_text = user_text + correction

    raise GenerationError(f"Failed to generate valid JSON response: {last_err}")


# ----------------------
# Prompt helpers
# ----------------------

def _load_prompt(filename: str) -> str:
    path = PROMPTS_DIR / filename
    if not path.exists():
        raise GenerationError(f"Prompt file not found: {path}")
    return path.read_text(encoding="utf-8").strip()


def _compose_prompt(system_prompt: str, user_text: str) -> str:
    """
    Gemini doesn't have the exact same 'system' role behavior as OpenAI Chat Completions,
    but you can reliably include a top-of-message 'SYSTEM' section.
    """
    return f"SYSTEM:\n{system_prompt}\n\nUSER:\n{user_text}".strip()


def _format_evidence(chunks: list[RetrievedChunk]) -> str:
    """
    Format evidence blocks so the model can cite by source_id.
    Keep chunk text verbatim to support snippet matching in validation.
    """
    blocks = []
    for i, ch in enumerate(chunks, start=1):
        url = ch.url or None
        blocks.append(
            "\n".join(
                [
                    f"[EVIDENCE {i}]",
                    f"source_id: {ch.source_id}",
                    f"title: {ch.title}",
                    f"publisher: {ch.publisher}",
                    f"url: {url}",
                    f"retrieved_at: {ch.retrieved_at.isoformat()}",
                    f"chunk_id: {ch.chunk_id}",
                    f"score: {ch.score if ch.score is not None else 'null'}",
                    "text:",
                    ch.text,
                ]
            )
        )
    return "\n\n---\n\n".join(blocks)


# ----------------------
# JSON parsing helpers
# ----------------------

_CODE_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE | re.MULTILINE)


def _parse_json_strict(text: str) -> Dict[str, Any]:
    """
    Parse JSON from model output, handling common formatting issues:
    - code fences ```json ... ```
    - leading/trailing whitespace
    - accidental extra text (tries to extract first JSON object)
    """
    cleaned = _CODE_FENCE_RE.sub("", text).strip()

    # If the model included extra prose, try to extract the first {...} JSON object.
    if not cleaned.startswith("{"):
        cleaned = _extract_first_json_object(cleaned)

    return json.loads(cleaned)


def _extract_first_json_object(s: str) -> str:
    """
    Best-effort extraction of the first top-level JSON object in a string.
    """
    start = s.find("{")
    if start == -1:
        raise ValueError("No JSON object found in model output.")
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
    raise ValueError("Unbalanced JSON braces in model output.")
