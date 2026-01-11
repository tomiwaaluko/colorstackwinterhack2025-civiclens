# backend/app/ai/visualization_schemas.py
"""Schemas for visualization AI features."""

from __future__ import annotations

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class InsightType(str, Enum):
    key_finding = "key_finding"
    comparison = "comparison"
    trend = "trend"
    concentration = "concentration"
    pattern_alert = "pattern_alert"


class ConfidenceLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Insight(BaseModel):
    """A single insight about the visualization."""
    model_config = ConfigDict(extra="forbid")

    type: InsightType
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    data_points: List[str] = Field(default_factory=list)
    confidence: ConfidenceLevel = ConfidenceLevel.medium


class InsightsResponse(BaseModel):
    """Response from the visualization insights endpoint."""
    model_config = ConfigDict(extra="forbid")

    insights: List[Insight] = Field(..., min_length=1, max_length=10)
    summary: str = Field(..., min_length=1, max_length=300)
    suggested_action: Optional[str] = None


class SupportingData(BaseModel):
    """Supporting data point for Q&A answers."""
    model_config = ConfigDict(extra="forbid")

    label: str
    value: str
    context: Optional[str] = None


class VisualizationQAResponse(BaseModel):
    """Response from the visualization Q&A endpoint."""
    model_config = ConfigDict(extra="forbid")

    answer: str = Field(..., min_length=1)
    supporting_data: List[SupportingData] = Field(default_factory=list)
    follow_up_suggestions: List[str] = Field(default_factory=list)
    confidence: ConfidenceLevel = ConfidenceLevel.medium
    limitations: Optional[str] = None


class SuggestionActionType(str, Enum):
    filter = "filter"
    compare = "compare"
    timerange = "timerange"
    switch_view = "switch_view"
    drill_down = "drill_down"


class SuggestionAction(BaseModel):
    """Action to perform for a suggestion."""
    model_config = ConfigDict(extra="forbid")

    type: SuggestionActionType
    params: Dict[str, Any] = Field(default_factory=dict)


class SuggestionDifficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    advanced = "advanced"


class SuggestionCategory(str, Enum):
    trending = "trending"
    comparison = "comparison"
    money = "money"
    voting = "voting"
    discovery = "discovery"


class Suggestion(BaseModel):
    """A single exploration suggestion."""
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=300)
    action: SuggestionAction
    difficulty: SuggestionDifficulty = SuggestionDifficulty.easy
    estimated_time: str = "1 minute"
    category: SuggestionCategory = SuggestionCategory.discovery


class SuggestionsResponse(BaseModel):
    """Response from the visualization suggestions endpoint."""
    model_config = ConfigDict(extra="forbid")

    suggestions: List[Suggestion] = Field(..., min_length=1, max_length=10)


# Request schemas

class VisualizationType(str, Enum):
    donations_map = "donations_map"
    timeline = "timeline"
    network_graph = "network_graph"
    radial_chart = "radial_chart"


class VisualizationInsightsRequest(BaseModel):
    """Request payload for visualization insights."""
    model_config = ConfigDict(extra="forbid")

    visualization_type: VisualizationType
    filters: Dict[str, Any] = Field(default_factory=dict)
    data_summary: Dict[str, Any] = Field(default_factory=dict)
    selected_items: List[str] = Field(default_factory=list)


class VisualizationQARequest(BaseModel):
    """Request payload for visualization Q&A."""
    model_config = ConfigDict(extra="forbid")

    question: str = Field(..., min_length=1, max_length=500)
    visualization_type: VisualizationType
    filters: Dict[str, Any] = Field(default_factory=dict)
    data_summary: Dict[str, Any] = Field(default_factory=dict)
    selected_items: List[str] = Field(default_factory=list)


class VisualizationSuggestionsRequest(BaseModel):
    """Request payload for visualization suggestions."""
    model_config = ConfigDict(extra="forbid")

    visualization_type: VisualizationType
    current_state: Dict[str, Any] = Field(default_factory=dict)
    user_history: List[str] = Field(default_factory=list)
