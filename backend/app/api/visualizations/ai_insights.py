"""
Visualization AI Endpoints

Provides AI-powered insights, Q&A, and suggestions for visualizations.
Uses Gemini to generate contextual analysis based on visualization state.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import logging

from app.ai.visualization_schemas import (
    VisualizationInsightsRequest,
    VisualizationQARequest,
    VisualizationSuggestionsRequest,
    InsightsResponse,
    VisualizationQAResponse,
    SuggestionsResponse,
)
from app.ai.visualization_generate import (
    generate_visualization_insights,
    generate_visualization_answer,
    generate_visualization_suggestions,
    VisualizationGenerationError,
    RateLimitError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/visualizations/ai", tags=["visualizations-ai"])


@router.post("/insights", response_model=InsightsResponse)
async def get_visualization_insights(request: VisualizationInsightsRequest):
    """
    Generate AI-powered insights for the current visualization.

    Analyzes the visualization data and generates contextual insights
    including key findings, comparisons, trends, and patterns.

    Request Body:
    - visualization_type: Type of visualization (donations_map, timeline, etc.)
    - filters: Current filters applied to the visualization
    - data_summary: Summary of the data being displayed
    - selected_items: Currently selected items (states, politicians, etc.)

    Returns:
    - insights: List of generated insights
    - summary: One-sentence summary of the visualization
    - suggested_action: Recommended next exploration
    """
    try:
        result = generate_visualization_insights(request)
        return result
    except RateLimitError as e:
        logger.warning(f"Rate limit exceeded for insights: {e}")
        raise HTTPException(
            status_code=429,
            detail="AI service is temporarily unavailable due to rate limits. Please try again in a few moments."
        )
    except VisualizationGenerationError as e:
        logger.error(f"Failed to generate insights: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in insights generation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.post("/ask", response_model=VisualizationQAResponse)
async def ask_about_visualization(request: VisualizationQARequest):
    """
    Answer a question about the current visualization.

    Uses AI to answer user questions based on the visualization
    data and context, providing supporting data points and follow-up suggestions.

    Request Body:
    - question: The user's question about the visualization
    - visualization_type: Type of visualization being viewed
    - filters: Current filters applied
    - data_summary: Summary of the data being displayed
    - selected_items: Currently selected items

    Returns:
    - answer: Direct answer to the question
    - supporting_data: Data points supporting the answer
    - follow_up_suggestions: Related questions the user might ask
    - confidence: Confidence level in the answer
    - limitations: Any caveats about the answer
    """
    try:
        result = generate_visualization_answer(request)
        return result
    except RateLimitError as e:
        logger.warning(f"Rate limit exceeded for Q&A: {e}")
        raise HTTPException(
            status_code=429,
            detail="AI service is temporarily unavailable due to rate limits. Please try again in a few moments."
        )
    except VisualizationGenerationError as e:
        logger.error(f"Failed to generate answer: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in Q&A: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


@router.post("/suggestions", response_model=SuggestionsResponse)
async def get_visualization_suggestions(request: VisualizationSuggestionsRequest):
    """
    Generate AI-powered exploration suggestions.

    Analyzes the current visualization state and suggests interesting
    explorations the user might want to try.

    Request Body:
    - visualization_type: Type of visualization being viewed
    - current_state: Current state of the visualization
    - user_history: List of previous user actions

    Returns:
    - suggestions: List of contextual exploration suggestions
    """
    try:
        result = generate_visualization_suggestions(request)
        return result
    except RateLimitError as e:
        logger.warning(f"Rate limit exceeded for suggestions: {e}")
        raise HTTPException(
            status_code=429,
            detail="AI service is temporarily unavailable due to rate limits. Please try again in a few moments."
        )
    except VisualizationGenerationError as e:
        logger.error(f"Failed to generate suggestions: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in suggestions: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


# Fallback endpoint for when AI is unavailable
@router.get("/status")
async def ai_status():
    """Check if AI features are available."""
    import os
    api_key = os.getenv("GEMINI_API_KEY")
    return {
        "available": bool(api_key),
        "model": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
    }


__all__ = ["router"]
