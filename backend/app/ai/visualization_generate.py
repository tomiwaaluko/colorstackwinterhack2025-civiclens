# backend/app/ai/visualization_generate.py
"""Gemini-powered generation for visualization AI features."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional, Union

from pydantic import ValidationError

from .visualization_schemas import (
    InsightsResponse,
    VisualizationQAResponse,
    SuggestionsResponse,
    VisualizationInsightsRequest,
    VisualizationQARequest,
    VisualizationSuggestionsRequest,
)

# Gemini SDK
from google import genai
from google.genai import types


PROMPTS_DIR = Path(__file__).parent / "prompts"
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


class VisualizationGenerationError(RuntimeError):
    """Error during visualization AI generation."""
    pass


class RateLimitError(VisualizationGenerationError):
    """Error when API rate limit is exceeded."""
    pass


def _load_prompt(filename: str) -> str:
    """Load a prompt template from the prompts directory."""
    path = PROMPTS_DIR / filename
    if not path.exists():
        raise VisualizationGenerationError(f"Prompt file not found: {path}")
    return path.read_text(encoding="utf-8").strip()


def _compose_prompt(system_prompt: str, user_text: str) -> str:
    """Compose system and user prompts for Gemini."""
    return f"SYSTEM:\n{system_prompt}\n\nUSER:\n{user_text}".strip()


def _parse_json_response(text: str) -> Dict[str, Any]:
    """Parse JSON from model output, handling common formatting issues."""
    # Remove code fences
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.IGNORECASE | re.MULTILINE)
    
    # Extract first JSON object if extra text present
    if not cleaned.startswith("{"):
        start = cleaned.find("{")
        if start == -1:
            raise ValueError("No JSON object found in model output.")
        depth = 0
        for i in range(start, len(cleaned)):
            if cleaned[i] == "{":
                depth += 1
            elif cleaned[i] == "}":
                depth -= 1
                if depth == 0:
                    cleaned = cleaned[start : i + 1]
                    break
    
    return json.loads(cleaned)


def _call_gemini(
    prompt: str,
    *,
    model: str = DEFAULT_MODEL,
    api_key: Optional[str] = None,
    temperature: float = 0.3,
    max_output_tokens: int = 1500,
) -> str:
    """Call Gemini API and return the response text."""
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        raise VisualizationGenerationError("Missing GEMINI_API_KEY.")

    client = genai.Client(api_key=key)

    config = types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        response_mime_type="application/json",
    )

    try:
        resp = client.models.generate_content(
            model=model,
            contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
            config=config,
        )
    except Exception as e:
        error_str = str(e).lower()
        # Check for rate limit / quota exceeded errors (429 RESOURCE_EXHAUSTED)
        if "429" in error_str or "resource_exhausted" in error_str or "quota" in error_str:
            raise RateLimitError(f"Gemini API rate limit exceeded: {e}")
        raise VisualizationGenerationError(f"Gemini API call failed: {e}")

    return (resp.text or "").strip()


def generate_visualization_insights(
    request: VisualizationInsightsRequest,
    *,
    model: str = DEFAULT_MODEL,
    api_key: Optional[str] = None,
    retry_on_invalid_json: int = 1,
) -> InsightsResponse:
    """
    Generate AI insights for a visualization.
    
    Args:
        request: The visualization state and data summary
        model: Gemini model to use
        api_key: Optional API key override
        retry_on_invalid_json: Number of retries on JSON parsing/validation errors (default: 1)
        
    Returns:
        InsightsResponse with generated insights
    """
    system_prompt = _load_prompt("visualization_insights_prompt.txt")
    
    # Format the user context
    user_text = f"""
VISUALIZATION TYPE: {request.visualization_type.value}

CURRENT FILTERS:
{json.dumps(request.filters, indent=2)}

DATA SUMMARY:
{json.dumps(request.data_summary, indent=2)}

SELECTED ITEMS: {', '.join(request.selected_items) if request.selected_items else 'None'}

Generate insights based on this visualization data.
"""
    
    prompt_base = _compose_prompt(system_prompt, user_text)
    last_err: Optional[Exception] = None
    
    for attempt in range(retry_on_invalid_json + 1):
        prompt = prompt_base
        if attempt > 0:
            # Add correction message on retry
            correction = (
                "\n\nYour previous response was invalid. "
                "Return ONLY valid JSON matching the schema with at least 1 insight. "
                "Do not include code fences or extra text. Ensure all strings are properly escaped."
            )
            prompt = prompt + correction
        
        try:
            response_text = _call_gemini(prompt, model=model, api_key=api_key)
            data = _parse_json_response(response_text)
            
            # Validate the response
            result = InsightsResponse.model_validate(data)
            
            # Ensure we have at least one insight
            if len(result.insights) == 0:
                raise ValueError("Response validation failed: insights list is empty (must have at least 1 item)")
            
            return result
        except (json.JSONDecodeError, ValidationError, ValueError) as e:
            last_err = e
            if attempt >= retry_on_invalid_json:
                break
    
    raise VisualizationGenerationError(f"Failed to generate insights after {retry_on_invalid_json + 1} attempts: {last_err}")


def generate_visualization_answer(
    request: VisualizationQARequest,
    *,
    model: str = DEFAULT_MODEL,
    api_key: Optional[str] = None,
) -> VisualizationQAResponse:
    """
    Generate an AI answer to a question about a visualization.
    
    Args:
        request: The question and visualization context
        model: Gemini model to use
        api_key: Optional API key override
        
    Returns:
        VisualizationQAResponse with the answer
    """
    system_prompt = _load_prompt("visualization_ask_prompt.txt")
    
    user_text = f"""
VISUALIZATION TYPE: {request.visualization_type.value}

CURRENT FILTERS:
{json.dumps(request.filters, indent=2)}

DATA SUMMARY:
{json.dumps(request.data_summary, indent=2)}

SELECTED ITEMS: {', '.join(request.selected_items) if request.selected_items else 'None'}

USER QUESTION: {request.question}

Answer the user's question based on the visualization data.
"""
    
    prompt = _compose_prompt(system_prompt, user_text)
    
    try:
        response_text = _call_gemini(prompt, model=model, api_key=api_key)
        data = _parse_json_response(response_text)
        return VisualizationQAResponse.model_validate(data)
    except (json.JSONDecodeError, ValidationError, ValueError) as e:
        raise VisualizationGenerationError(f"Failed to generate answer: {e}")


def generate_visualization_suggestions(
    request: VisualizationSuggestionsRequest,
    *,
    model: str = DEFAULT_MODEL,
    api_key: Optional[str] = None,
) -> SuggestionsResponse:
    """
    Generate AI-powered exploration suggestions.
    
    Args:
        request: The current visualization state
        model: Gemini model to use
        api_key: Optional API key override
        
    Returns:
        SuggestionsResponse with suggested explorations
    """
    system_prompt = _load_prompt("visualization_suggestions_prompt.txt")
    
    user_text = f"""
VISUALIZATION TYPE: {request.visualization_type.value}

CURRENT STATE:
{json.dumps(request.current_state, indent=2)}

USER HISTORY: {', '.join(request.user_history) if request.user_history else 'No previous actions'}

Generate contextual exploration suggestions.
"""
    
    prompt = _compose_prompt(system_prompt, user_text)
    
    try:
        response_text = _call_gemini(prompt, model=model, api_key=api_key)
        data = _parse_json_response(response_text)
        return SuggestionsResponse.model_validate(data)
    except (json.JSONDecodeError, ValidationError, ValueError) as e:
        raise VisualizationGenerationError(f"Failed to generate suggestions: {e}")
