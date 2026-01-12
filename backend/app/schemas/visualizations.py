"""
Pydantic schemas for visualization endpoints.
"""

from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import date
from enum import Enum


class Citation(BaseModel):
    """Citation/evidence bundle for visualizations."""
    source_id: str  # Can be int or UUID depending on database
    source_url: str
    title: str
    publisher: str
    retrieved_at: str


class StateDonationValue(BaseModel):
    """Donation aggregation data for a single state."""
    total_amount: float
    donation_count: int
    avg_amount: Optional[float] = None
    top_donor_category: Optional[str] = None
    top_category_amount: Optional[float] = None
    citations: List[Citation] = []
    top_politicians: List[Dict] = []
    top_donors: List[Dict] = []


class DonationsMapResponse(BaseModel):
    """Response for donations map endpoint."""
    level: str = "state"
    values: Dict[str, StateDonationValue]
    metadata: Dict


# Timeline schemas
class EventType(str, Enum):
    VOTE = "vote"
    BILL_SPONSOR = "bill_sponsor"
    DONATION = "donation"
    STATEMENT = "statement"


class TimelineEvent(BaseModel):
    """Single event in timeline."""
    id: str
    type: EventType
    date: str
    title: str
    outcome: Optional[str] = None
    citations: List[Citation] = []
    citation_count: int = 0


class TimelineResponse(BaseModel):
    """Response for timeline endpoint."""
    events: List[TimelineEvent]
    clusters: Optional[List] = []


# Network graph schemas
class NetworkNode(BaseModel):
    """Node in network graph."""
    id: str
    label: str
    type: str  # 'politician' or 'donor' or 'bill'
    metadata: Optional[Dict] = {}


class NetworkEdge(BaseModel):
    """Edge in network graph."""
    source: str
    target: str
    weight: float
    type: str  # 'donation' or 'vote' or 'sponsor'
    metadata: Optional[Dict] = {}


class NetworkGraphResponse(BaseModel):
    """Response for network graph endpoint."""
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]


# Radial chart schemas
class CategoryValue(BaseModel):
    """Donation data for a single category."""
    category: str
    total_amount: float
    donation_count: int
    avg_amount: Optional[float] = None
    citations: List[Citation] = []


class RadialResponse(BaseModel):
    """Response for radial chart endpoint."""
    categories: List[CategoryValue]
    total_amount: float
    total_count: int

