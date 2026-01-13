"""
Politician Timeline Endpoint

Returns timeline events (votes, donations, statements) for a politician.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date

from app.core.database import get_db
from app.schemas.visualizations import TimelineResponse, TimelineEvent, EventType, Citation

router = APIRouter(prefix="/api/visualizations", tags=["visualizations"])


@router.get("/politician-timeline/{politician_id}", response_model=TimelineResponse)
async def get_politician_timeline(
    politician_id: str,
    start_date: Optional[date] = Query(None, description="Start date (ISO8601)"),
    end_date: Optional[date] = Query(None, description="End date (ISO8601)"),
    event_types: Optional[List[EventType]] = Query(None, description="Filter by event types"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get timeline events for a politician.
    
    Returns votes, donations, and statements in chronological order.
    
    Path Parameters:
    - politician_id: ID of the politician
    
    Query Parameters:
    - start_date: Filter events from this date onwards
    - end_date: Filter events up to this date
    - event_types: Filter by event types (vote, donation, statement)
    
    Response Format:
    {
        "events": [
            {
                "id": "vote-123",
                "type": "vote",
                "date": "2024-03-15",
                "title": "HR 1234 - Healthcare Reform Act",
                "outcome": "yes",
                "citations": [...],
                "citation_count": 5
            },
            ...
        ],
        "clusters": []
    }
    """
    # Verify politician exists
    politician_check = await db.execute(
        text("SELECT id FROM politicians WHERE id = :politician_id"),
        {"politician_id": politician_id}
    )
    if not politician_check.first():
        raise HTTPException(status_code=404, detail=f"Politician {politician_id} not found")
    
    events = []
    
    # Build filters
    date_filter = ""
    params = {"politician_id": politician_id}
    
    if start_date:
        date_filter += " AND date >= :start_date"
        params["start_date"] = start_date
    
    if end_date:
        date_filter += " AND date <= :end_date"
        params["end_date"] = end_date
    
    # Get votes
    if not event_types or EventType.VOTE in event_types:
        votes_sql = text(f"""
            SELECT 
                v.id,
                v.vote_date as date,
                v.vote_position as outcome,
                b.title as bill_title,
                b.bill_number,
                v.source_id,
                s.source_url,
                s.title as source_title,
                s.publisher,
                s.retrieved_at
            FROM votes v
            JOIN bills b ON v.bill_id = b.id
            JOIN sources s ON v.source_id = s.id
            WHERE v.politician_id = :politician_id
              {date_filter}
            ORDER BY v.vote_date DESC
        """)
        
        votes_result = await db.execute(votes_sql, params)
        for row in votes_result.mappings().all():
            bill_title = f"{row['bill_number']} - {row['bill_title']}" if row['bill_number'] else row['bill_title']
            events.append(TimelineEvent(
                id=f"vote-{row['id']}",
                type=EventType.VOTE,
                date=str(row['date']),
                title=bill_title or "Vote",
                outcome=row['outcome'],
                citations=[Citation(
                    source_id=row['source_id'],
                    source_url=row['source_url'] or "",
                    title=row['source_title'] or "",
                    publisher=row['publisher'] or "",
                    retrieved_at=str(row['retrieved_at']) if row['retrieved_at'] else ""
                )] if row['source_id'] else [],
                citation_count=1 if row['source_id'] else 0
            ))
    
    # Get donations
    if not event_types or EventType.DONATION in event_types:
        donations_sql = text(f"""
            SELECT 
                d.id,
                d.date,
                d.donor_name,
                d.amount,
                d.donor_category,
                d.source_id,
                s.source_url,
                s.title as source_title,
                s.publisher,
                s.retrieved_at
            FROM donations d
            JOIN sources s ON d.source_id = s.id
            WHERE d.politician_id = :politician_id
              {date_filter}
            ORDER BY d.date DESC
        """)
        
        donations_result = await db.execute(donations_sql, params)
        for row in donations_result.mappings().all():
            title = f"{row['donor_name']} - ${row['amount']:,.0f} ({row['donor_category']})"
            events.append(TimelineEvent(
                id=f"donation-{row['id']}",
                type=EventType.DONATION,
                date=str(row['date']),
                title=title,
                outcome=None,
                citations=[Citation(
                    source_id=row['source_id'],
                    source_url=row['source_url'] or "",
                    title=row['source_title'] or "",
                    publisher=row['publisher'] or "",
                    retrieved_at=str(row['retrieved_at']) if row['retrieved_at'] else ""
                )] if row['source_id'] else [],
                citation_count=1 if row['source_id'] else 0
            ))
    
    # Get statements
    if not event_types or EventType.STATEMENT in event_types:
        statements_sql = text(f"""
            SELECT 
                s.id,
                s.date,
                LEFT(s.text, 100) as text_preview,
                s.source_id as statement_source_id,
                src.source_url,
                src.title as source_title,
                src.publisher,
                src.retrieved_at
            FROM statements s
            JOIN sources src ON s.source_id = src.id
            WHERE s.politician_id = :politician_id
              {date_filter}
            ORDER BY s.date DESC NULLS LAST, s.id DESC
        """)
        
        statements_result = await db.execute(statements_sql, params)
        for row in statements_result.mappings().all():
            events.append(TimelineEvent(
                id=f"statement-{row['id']}",
                type=EventType.STATEMENT,
                date=str(row['date']) if row['date'] else "",
                title=row['text_preview'] or "Statement",
                outcome=None,
                citations=[Citation(
                    source_id=row['statement_source_id'],
                    source_url=row['source_url'] or "",
                    title=row['source_title'] or "",
                    publisher=row['publisher'] or "",
                    retrieved_at=str(row['retrieved_at']) if row['retrieved_at'] else ""
                )] if row['statement_source_id'] else [],
                citation_count=1 if row['statement_source_id'] else 0
            ))
    
    # Sort all events by date
    events.sort(key=lambda e: e.date, reverse=True)
    
    return TimelineResponse(
        events=events,
        clusters=[]  # Can be implemented later for event clustering
    )


__all__ = ["router"]

