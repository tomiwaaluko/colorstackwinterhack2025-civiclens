"""
Donations Map Endpoint

Returns aggregated donation data by state for choropleth map visualization.
Returns values only (no GeoJSON shapes).
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date

from app.core.database import get_db
from app.schemas.visualizations import DonationsMapResponse, StateDonationValue, Citation

router = APIRouter(prefix="/api/visualizations", tags=["visualizations"])


@router.get("/donations-map", response_model=DonationsMapResponse)
async def get_donations_map(
    politician_ids: Optional[List[int]] = Query(None, description="Filter by politician IDs"),
    category: Optional[str] = Query(None, description="Filter by donor category"),
    start_date: Optional[date] = Query(None, description="Start date (ISO8601)"),
    end_date: Optional[date] = Query(None, description="End date (ISO8601)"),
    aggregation_level: str = Query("state", description="Aggregation level (state only for MVP)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get aggregated donation data by state for choropleth map.
    
    Returns values only (no GeoJSON shapes). Frontend combines with static boundaries.
    
    Query Parameters:
    - politician_ids: Filter donations by politician IDs
    - category: Filter by donor category (Healthcare, Energy, etc.)
    - start_date: Filter donations from this date onwards
    - end_date: Filter donations up to this date
    - aggregation_level: Currently only 'state' supported
    
    Response Format:
    {
        "level": "state",
        "values": {
            "CA": {
                "total_amount": 1500000,
                "donation_count": 250,
                "top_donor_category": "Technology",
                "citations": [...],
                ...
            },
            ...
        },
        "metadata": {...}
    }
    """
    if aggregation_level != "state":
        raise HTTPException(
            status_code=400,
            detail=f"Aggregation level '{aggregation_level}' not supported. Only 'state' is supported."
        )
    
    # Build WHERE clause based on filters
    where_conditions = ["d.state_code IS NOT NULL"]

    # Always include all params for secondary queries that use "IS NULL OR" pattern
    params = {
        "politician_ids": politician_ids,  # Can be None
        "category": category,              # Can be None
        "start_date": start_date,          # Can be None
        "end_date": end_date,              # Can be None
    }

    if politician_ids:
        where_conditions.append("d.politician_id = ANY(:politician_ids)")

    if category:
        where_conditions.append("d.donor_category = :category")

    if start_date:
        where_conditions.append("d.date >= :start_date")

    if end_date:
        where_conditions.append("d.date <= :end_date")

    where_clause = " AND ".join(where_conditions)
    
    # Main aggregation query
    # Note: Subqueries for top_donor_category use same filters via WHERE correlation
    sql = text(f"""
        SELECT 
            d.state_code,
            SUM(d.amount) as total_amount,
            COUNT(*) as donation_count,
            AVG(d.amount) as avg_amount,
            (
                SELECT donor_category
                FROM donations d2
                WHERE d2.state_code = d.state_code
                  AND d2.state_code IS NOT NULL
                  {'AND d2.politician_id = ANY(:politician_ids)' if politician_ids else ''}
                  {'AND d2.donor_category = :category' if category else ''}
                  {'AND d2.date >= :start_date' if start_date else ''}
                  {'AND d2.date <= :end_date' if end_date else ''}
                GROUP BY donor_category
                ORDER BY SUM(amount) DESC
                LIMIT 1
            ) as top_donor_category,
            (
                SELECT SUM(amount)
                FROM donations d2
                WHERE d2.state_code = d.state_code
                  AND d2.state_code IS NOT NULL
                  {'AND d2.politician_id = ANY(:politician_ids)' if politician_ids else ''}
                  {'AND d2.donor_category = :category' if category else ''}
                  {'AND d2.date >= :start_date' if start_date else ''}
                  {'AND d2.date <= :end_date' if end_date else ''}
                GROUP BY donor_category
                ORDER BY SUM(amount) DESC
                LIMIT 1
            ) as top_category_amount
        FROM donations d
        WHERE {where_clause}
        GROUP BY d.state_code
        ORDER BY total_amount DESC
    """)
    
    result = await db.execute(sql, params)
    rows = result.mappings().all()
    
    # Build dynamic filter conditions for secondary queries (same logic as main query)
    secondary_conditions = ["d.state_code IS NOT NULL"]
    if politician_ids:
        secondary_conditions.append("d.politician_id = ANY(:politician_ids)")
    if category:
        secondary_conditions.append("d.donor_category = :category")
    if start_date:
        secondary_conditions.append("d.date >= :start_date")
    if end_date:
        secondary_conditions.append("d.date <= :end_date")
    secondary_where = " AND ".join(secondary_conditions)

    # Get top politicians and donors per state
    top_politicians_sql = text(f"""
        SELECT
            d.state_code,
            p.id as politician_id,
            p.name as politician_name,
            SUM(d.amount) as total_amount
        FROM donations d
        JOIN politicians p ON d.politician_id = p.id
        WHERE {secondary_where}
        GROUP BY d.state_code, p.id, p.name
        HAVING SUM(d.amount) > 0
        ORDER BY d.state_code, total_amount DESC
    """)

    politicians_result = await db.execute(top_politicians_sql, params)
    politicians_rows = politicians_result.mappings().all()

    # Build conditions for donors query (no 'd.' alias)
    donors_conditions = ["state_code IS NOT NULL"]
    if politician_ids:
        donors_conditions.append("politician_id = ANY(:politician_ids)")
    if category:
        donors_conditions.append("donor_category = :category")
    if start_date:
        donors_conditions.append("date >= :start_date")
    if end_date:
        donors_conditions.append("date <= :end_date")
    donors_where = " AND ".join(donors_conditions)

    # Get top donors per state using windowed approach (top N per state instead of global limit)
    top_donors_sql = text(f"""
        SELECT state_code, donor_name, total_amount, donation_count
        FROM (
            SELECT
                state_code,
                donor_name,
                SUM(amount) as total_amount,
                COUNT(*) as donation_count,
                ROW_NUMBER() OVER (PARTITION BY state_code ORDER BY SUM(amount) DESC) as rn
            FROM donations
            WHERE {donors_where}
            GROUP BY state_code, donor_name
            HAVING SUM(amount) > 10000
        ) ranked
        WHERE rn <= 10
        ORDER BY state_code, total_amount DESC
    """)

    donors_result = await db.execute(top_donors_sql, params)
    donors_rows = donors_result.mappings().all()

    # Get citations (top sources) per state
    # Use DISTINCT ON (state_code) with ORDER BY citation_count DESC to get top citations per state
    citations_sql = text(f"""
        SELECT DISTINCT ON (state_code)
            state_code,
            source_id,
            source_url,
            title,
            publisher,
            retrieved_at,
            citation_count
        FROM (
            SELECT
                d.state_code,
                s.id as source_id,
                s.source_url,
                s.title,
                s.publisher,
                s.retrieved_at,
                COUNT(*) OVER (PARTITION BY d.state_code, s.id) as citation_count
            FROM donations d
            JOIN sources s ON d.source_id = s.id
            WHERE {secondary_where}
        ) sub
        ORDER BY state_code, citation_count DESC, source_id
    """)
    
    citations_result = await db.execute(citations_sql, params)
    citations_rows = citations_result.mappings().all()
    
    # Organize data by state
    state_politicians = {}
    for row in politicians_rows:
        state_code = row["state_code"]
        if state_code not in state_politicians:
            state_politicians[state_code] = []
        state_politicians[state_code].append({
            "politician_id": row["politician_id"],
            "name": row["politician_name"],
            "total_amount": float(row["total_amount"])
        })
        # Limit to top 3 per state
        if len(state_politicians[state_code]) >= 3:
            # Sort and keep top 3
            state_politicians[state_code].sort(key=lambda x: x["total_amount"], reverse=True)
            state_politicians[state_code] = state_politicians[state_code][:3]
    
    state_donors = {}
    for row in donors_rows:
        state_code = row["state_code"]
        if state_code not in state_donors:
            state_donors[state_code] = []
        state_donors[state_code].append({
            "donor_name": row["donor_name"],
            "total_amount": float(row["total_amount"]),
            "donation_count": row["donation_count"]
        })
        # Limit to top 3 per state
        if len(state_donors[state_code]) >= 3:
            state_donors[state_code].sort(key=lambda x: x["total_amount"], reverse=True)
            state_donors[state_code] = state_donors[state_code][:3]
    
    state_citations = {}
    for row in citations_rows:
        state_code = row["state_code"]
        if state_code not in state_citations:
            state_citations[state_code] = []
        if len(state_citations[state_code]) < 3:  # Top 3 citations per state
            state_citations[state_code].append(Citation(
                source_id=str(row["source_id"]),
                source_url=row["source_url"] or "",
                title=row["title"] or "",
                publisher=row["publisher"] or "",
                retrieved_at=str(row["retrieved_at"]) if row["retrieved_at"] else ""
            ))
    
    # Build response
    values = {}
    total_citation_count = 0
    min_date = None
    max_date = None
    
    for row in rows:
        state_code = row["state_code"]
        total_citation_count += len(state_citations.get(state_code, []))
        
        values[state_code] = StateDonationValue(
            total_amount=float(row["total_amount"] or 0),
            donation_count=row["donation_count"] or 0,
            avg_amount=float(row["avg_amount"]) if row["avg_amount"] else None,
            top_donor_category=row["top_donor_category"],
            top_category_amount=float(row["top_category_amount"]) if row["top_category_amount"] else None,
            citations=state_citations.get(state_code, []),
            top_politicians=state_politicians.get(state_code, []),
            top_donors=state_donors.get(state_code, [])
        )
    
    # Get date range metadata
    if start_date or end_date:
        min_date = start_date
        max_date = end_date
    else:
        date_range_sql = text("""
            SELECT MIN(date) as min_date, MAX(date) as max_date
            FROM donations
            WHERE state_code IS NOT NULL
        """)
        date_result = await db.execute(date_range_sql)
        date_row = date_result.mappings().first()
        if date_row:
            min_date = date_row["min_date"]
            max_date = date_row["max_date"]
    
    return DonationsMapResponse(
        level="state",
        values=values,
        metadata={
            "date_range": {
                "start": str(min_date) if min_date else None,
                "end": str(max_date) if max_date else None
            },
            "citation_count": total_citation_count,
            "total_states": len(values),
            "filters": {
                "politician_ids": politician_ids,
                "category": category,
                "start_date": str(start_date) if start_date else None,
                "end_date": str(end_date) if end_date else None
            }
        }
    )


__all__ = ["router"]

