"""
Admin Endpoints

Endpoints for administrative tasks like refreshing materialized views.
These endpoints are useful for demo mode and manual maintenance.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])

# List of materialized views
MATERIALIZED_VIEWS = [
    "donations_by_state_cycle",
    "top_donors_by_region",
    "graph_edges_by_politician",
    "donations_by_politician_category",
    "top_politicians_by_state",
    "timeline_events_summary",
]


@router.post("/refresh-materialized-views")
async def refresh_materialized_views(
    view_name: str = None, concurrent: bool = True, db: AsyncSession = Depends(get_db)
):
    """
    Refresh materialized views.
    
    Query Parameters:
    - view_name: Optional specific view name to refresh (if None, refreshes all)
    - concurrent: Use CONCURRENTLY refresh (default: True, requires unique indexes)
    
    Returns:
    - List of refreshed views and status
    """
    views_to_refresh = [view_name] if view_name else MATERIALIZED_VIEWS

    # Validate view names
    invalid_views = [v for v in views_to_refresh if v not in MATERIALIZED_VIEWS]
    if invalid_views:
        raise HTTPException(
            status_code=400, detail=f"Invalid view names: {invalid_views}"
        )

    results = []
    errors = []

    for view in views_to_refresh:
        try:
            if concurrent:
                try:
                    await db.execute(
                        text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view}")
                    )
                    await db.commit()
                    results.append({"view": view, "status": "refreshed", "method": "concurrent"})
                except Exception as e:
                    # Rollback the failed transaction before trying fallback
                    await db.rollback()
                    # Fallback to non-concurrent if CONCURRENTLY fails
                    await db.execute(text(f"REFRESH MATERIALIZED VIEW {view}"))
                    await db.commit()
                    results.append(
                        {
                            "view": view,
                            "status": "refreshed",
                            "method": "non-concurrent",
                            "warning": str(e),
                        }
                    )
            else:
                await db.execute(text(f"REFRESH MATERIALIZED VIEW {view}"))
                await db.commit()
                results.append({"view": view, "status": "refreshed", "method": "non-concurrent"})

        except Exception as e:
            await db.rollback()
            errors.append({"view": view, "error": str(e)})
            results.append({"view": view, "status": "failed", "error": str(e)})

    return {
        "success": len(errors) == 0,
        "refreshed": len([r for r in results if r["status"] == "refreshed"]),
        "failed": len(errors),
        "results": results,
        "errors": errors,
    }


@router.get("/materialized-views/status")
async def get_materialized_views_status(db: AsyncSession = Depends(get_db)):
    """
    Get status and statistics for all materialized views.
    
    Returns:
    - List of materialized views with their sizes and row counts
    """
    try:
        query = text("""
            SELECT 
                schemaname,
                matviewname,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
                (SELECT COUNT(*) 
                 FROM information_schema.columns 
                 WHERE table_schema = schemaname AND table_name = matviewname) as column_count
            FROM pg_matviews
            WHERE matviewname IN :views
            ORDER BY matviewname;
        """)

        result = await db.execute(query, {"views": tuple(MATERIALIZED_VIEWS)})
        rows = result.mappings().all()

        # Get row counts for each view
        views_with_counts = []
        for row in rows:
            try:
                count_query = text(f'SELECT COUNT(*) as count FROM "{row["matviewname"]}"')
                count_result = await db.execute(count_query)
                count_row = count_result.scalar()
                views_with_counts.append(
                    {
                        "name": row["matviewname"],
                        "schema": row["schemaname"],
                        "size": row["size"],
                        "column_count": row["column_count"],
                        "row_count": count_row,
                    }
                )
            except Exception as e:
                views_with_counts.append(
                    {
                        "name": row["matviewname"],
                        "schema": row["schemaname"],
                        "size": row["size"],
                        "column_count": row["column_count"],
                        "row_count": None,
                        "error": str(e),
                    }
                )

        return {
            "total_views": len(views_with_counts),
            "views": views_with_counts,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting view status: {str(e)}")


__all__ = ["router"]

