"""
Visualization aggregation endpoints.

These endpoints return aggregated data for visualization components.
All responses return values only (no GeoJSON shapes).
"""

from .donations_map import router as donations_map_router
from .timeline import router as timeline_router
from .network_graph import router as network_graph_router
from .radial import router as radial_router
from .ai_insights import router as ai_insights_router

__all__ = [
    "donations_map_router",
    "timeline_router",
    "network_graph_router",
    "radial_router",
    "ai_insights_router",
]

