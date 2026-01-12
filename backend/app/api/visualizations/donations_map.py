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
    
    # Build WHERE clause based on filters (without table alias for CTE)
    where_conditions = ["state_code IS NOT NULL"]
    params = {}
    
    if politician_ids:
        where_conditions.append("politician_id = ANY(:politician_ids)")
        params["politician_ids"] = politician_ids
    
    if category:
        where_conditions.append("donor_category = :category")
        params["category"] = category
    
    if start_date:
        where_conditions.append("date >= :start_date")
        params["start_date"] = start_date
    
    if end_date:
        where_conditions.append("date <= :end_date")
        params["end_date"] = end_date
    
    where_clause = " AND ".join(where_conditions)
    
    # Main aggregation query using CTE to avoid parameter duplication issues
    sql = text(f"""
        WITH filtered_donations AS (
            SELECT 
                state_code,
                amount,
                donor_category
            FROM donations
            WHERE {where_clause}
        ),
        state_category_totals AS (
            SELECT 
                state_code,
                donor_category,
                SUM(amount) as category_total
            FROM filtered_donations
            GROUP BY state_code, donor_category
        ),
        top_categories AS (
            SELECT DISTINCT ON (state_code)
                state_code,
                donor_category as top_donor_category,
                category_total as top_category_amount
            FROM state_category_totals
            ORDER BY state_code, category_total DESC
        )
        SELECT 
            d.state_code,
            SUM(d.amount) as total_amount,
            COUNT(*) as donation_count,
            AVG(d.amount) as avg_amount,
            tc.top_donor_category,
            tc.top_category_amount
        FROM filtered_donations d
        LEFT JOIN top_categories tc ON d.state_code = tc.state_code
        GROUP BY d.state_code, tc.top_donor_category, tc.top_category_amount
        ORDER BY total_amount DESC
    """)
    
    result = await db.execute(sql, params)
    rows = result.mappings().all()
    
    # Build WHERE clauses for secondary queries
    pol_where = ["d.state_code IS NOT NULL"]
    donor_where = ["state_code IS NOT NULL"]
    cite_where = ["d.state_code IS NOT NULL"]
    
    if politician_ids:
        pol_where.append("d.politician_id = ANY(:politician_ids)")
        donor_where.append("politician_id = ANY(:politician_ids)")
        cite_where.append("d.politician_id = ANY(:politician_ids)")
    if category:
        pol_where.append("d.donor_category = :category")
        donor_where.append("donor_category = :category")
        cite_where.append("d.donor_category = :category")
    if start_date:
        pol_where.append("d.date >= :start_date")
        donor_where.append("date >= :start_date")
        cite_where.append("d.date >= :start_date")
    if end_date:
        pol_where.append("d.date <= :end_date")
        donor_where.append("date <= :end_date")
        cite_where.append("d.date <= :end_date")
    
    pol_where_str = " AND ".join(pol_where)
    donor_where_str = " AND ".join(donor_where)
    cite_where_str = " AND ".join(cite_where)
    
    # Get top politicians and donors per state
    top_politicians_sql = text(f"""
        SELECT 
            d.state_code,
            p.id as politician_id,
            p.name as politician_name,
            SUM(d.amount) as total_amount
        FROM donations d
        JOIN politicians p ON d.politician_id = p.id
        WHERE {pol_where_str}
        GROUP BY d.state_code, p.id, p.name
        HAVING SUM(d.amount) > 0
        ORDER BY d.state_code, total_amount DESC
    """)
    
    politicians_result = await db.execute(top_politicians_sql, params)
    politicians_rows = politicians_result.mappings().all()
    
    # Get top donors per state
    top_donors_sql = text(f"""
        SELECT 
            state_code,
            donor_name,
            SUM(amount) as total_amount,
            COUNT(*) as donation_count
        FROM donations
        WHERE {donor_where_str}
        GROUP BY state_code, donor_name
        HAVING SUM(amount) > 10000
        ORDER BY state_code, total_amount DESC
        LIMIT 100
    """)
    
    donors_result = await db.execute(top_donors_sql, params)
    donors_rows = donors_result.mappings().all()
    
    # Get citations (top sources) per state
    citations_sql = text(f"""
        SELECT DISTINCT ON (d.state_code, s.id)
            d.state_code,
            s.id as source_id,
            s.source_url,
            s.title,
            s.publisher,
            s.retrieved_at,
            COUNT(*) OVER (PARTITION BY d.state_code, s.id) as citation_count
        FROM donations d
        JOIN sources s ON d.source_id = s.id
        WHERE {cite_where_str}
        ORDER BY d.state_code, s.id, citation_count DESC
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

