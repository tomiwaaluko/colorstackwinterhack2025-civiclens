"""
Politician Radial Chart Endpoint

Returns donation data by category for a politician (for radial/pie chart).
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from app.core.database import get_db
from app.schemas.visualizations import RadialResponse, CategoryValue, Citation

router = APIRouter(prefix="/api/visualizations", tags=["visualizations"])


@router.get("/politician-radial/{politician_id}", response_model=RadialResponse)
async def get_politician_radial(
    politician_id: int,
    start_date: Optional[date] = Query(None, description="Start date (ISO8601)"),
    end_date: Optional[date] = Query(None, description="End date (ISO8601)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get donation data aggregated by category for a politician (for radial chart).
    
    Returns donations grouped by donor category with totals and citations.
    
    Path Parameters:
    - politician_id: ID of the politician
    
    Query Parameters:
    - start_date: Filter donations from this date onwards
    - end_date: Filter donations up to this date
    
    Response Format:
    {
        "categories": [
            {
                "category": "Technology",
                "total_amount": 400000,
                "donation_count": 45,
                "avg_amount": 8888.89,
                "citations": [...]
            },
            ...
        ],
        "total_amount": 1500000,
        "total_count": 250
    }
    """
    # Verify politician exists
    politician_check = await db.execute(
        text("SELECT id, name FROM politicians WHERE id = :politician_id"),
        {"politician_id": politician_id}
    )
    pol_row = politician_check.mappings().first()
    if not pol_row:
        raise HTTPException(status_code=404, detail=f"Politician {politician_id} not found")
    
    # Build date filter
    date_filter = ""
    params = {"politician_id": politician_id}
    
    if start_date:
        date_filter += " AND d.date >= :start_date"
        params["start_date"] = start_date
    
    if end_date:
        date_filter += " AND d.date <= :end_date"
        params["end_date"] = end_date
    
    # Get donations aggregated by category
    categories_sql = text(f"""
        SELECT 
            d.donor_category,
            SUM(d.amount) as total_amount,
            COUNT(*) as donation_count,
            AVG(d.amount) as avg_amount
        FROM donations d
        WHERE d.politician_id = :politician_id
          {date_filter}
        GROUP BY d.donor_category
        ORDER BY total_amount DESC
    """)
    
    categories_result = await db.execute(categories_sql, params)
    categories_rows = categories_result.mappings().all()
    
    # Get citations for each category
    citations_sql = text(f"""
        SELECT DISTINCT ON (d.donor_category, s.id)
            d.donor_category,
            s.id as source_id,
            s.source_url,
            s.title,
            s.publisher,
            s.retrieved_at,
            COUNT(*) OVER (PARTITION BY d.donor_category, s.id) as citation_count
        FROM donations d
        JOIN sources s ON d.source_id = s.id
        WHERE d.politician_id = :politician_id
          {date_filter}
        ORDER BY d.donor_category, citation_count DESC, s.id
    """)
    
    citations_result = await db.execute(citations_sql, params)
    citations_rows = citations_result.mappings().all()
    
    # Organize citations by category
    category_citations = {}
    for row in citations_rows:
        category = row["donor_category"]
        if category not in category_citations:
            category_citations[category] = []
        if len(category_citations[category]) < 3:  # Top 3 citations per category
            category_citations[category].append(Citation(
                source_id=row["source_id"],
                source_url=row["source_url"] or "",
                title=row["title"] or "",
                publisher=row["publisher"] or "",
                retrieved_at=str(row["retrieved_at"]) if row["retrieved_at"] else ""
            ))
    
    # Build response
    categories = []
    total_amount = 0.0
    total_count = 0
    
    for row in categories_rows:
        category = row["donor_category"]
        amount = float(row["total_amount"] or 0)
        count = row["donation_count"] or 0
        
        categories.append(CategoryValue(
            category=category,
            total_amount=amount,
            donation_count=count,
            avg_amount=float(row["avg_amount"]) if row["avg_amount"] else None,
            citations=category_citations.get(category, [])
        ))
        
        total_amount += amount
        total_count += count
    
    return RadialResponse(
        categories=categories,
        total_amount=total_amount,
        total_count=total_count
    )


__all__ = ["router"]

