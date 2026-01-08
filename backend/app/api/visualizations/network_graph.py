"""
Network Graph Endpoint

Returns nodes and edges for network graph visualization.
Shows relationships between politicians, donors, and bills.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.core.database import get_db
from app.schemas.visualizations import NetworkGraphResponse, NetworkNode, NetworkEdge

router = APIRouter(prefix="/api/visualizations", tags=["visualizations"])


@router.get("/network-graph", response_model=NetworkGraphResponse)
async def get_network_graph(
    politician_ids: Optional[List[int]] = Query(None, description="Filter by politician IDs"),
    include_indirect: bool = Query(False, description="Include indirect relationships via categories"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get network graph data showing relationships between politicians, donors, and bills.
    
    Returns nodes (politicians, donors, bills) and edges (donations, votes).
    
    Query Parameters:
    - politician_ids: Filter to specific politicians (if None, includes all)
    - include_indirect: Include indirect donor-bill relationships via category alignment
    
    Response Format:
    {
        "nodes": [
            {"id": "politician-1", "label": "Joe Biden", "type": "politician", ...},
            {"id": "donor-Google", "label": "Google PAC", "type": "donor", ...},
            ...
        ],
        "edges": [
            {"source": "donor-Google", "target": "politician-2", "weight": 40000, "type": "donation", ...},
            ...
        ]
    }
    """
    nodes = []
    edges = []
    node_ids = set()
    
    # Build politician filter
    politician_filter = ""
    params = {}
    if politician_ids:
        politician_filter = "AND d.politician_id = ANY(:politician_ids)"
        params["politician_ids"] = politician_ids
    
    # Get politician nodes and donation edges
    donations_sql = text(f"""
        SELECT DISTINCT
            p.id as politician_id,
            p.name as politician_name,
            d.donor_name,
            d.donor_category,
            SUM(d.amount) as total_amount,
            COUNT(*) as donation_count
        FROM donations d
        JOIN politicians p ON d.politician_id = p.id
        WHERE 1=1 {politician_filter}
        GROUP BY p.id, p.name, d.donor_name, d.donor_category
        ORDER BY total_amount DESC
        LIMIT 500
    """)
    
    donations_result = await db.execute(donations_sql, params)
    for row in donations_result.mappings().all():
        # Add politician node
        pol_id = f"politician-{row['politician_id']}"
        if pol_id not in node_ids:
            nodes.append(NetworkNode(
                id=pol_id,
                label=row['politician_name'],
                type="politician",
                metadata={"politician_id": row['politician_id']}
            ))
            node_ids.add(pol_id)
        
        # Add donor node
        donor_id = f"donor-{row['donor_name']}"
        if donor_id not in node_ids:
            nodes.append(NetworkNode(
                id=donor_id,
                label=row['donor_name'],
                type="donor",
                metadata={"category": row['donor_category']}
            ))
            node_ids.add(donor_id)
        
        # Add donation edge
        edges.append(NetworkEdge(
            source=donor_id,
            target=pol_id,
            weight=float(row['total_amount']),
            type="donation",
            metadata={
                "category": row['donor_category'],
                "donation_count": row['donation_count']
            }
        ))
    
    # Get bill nodes and vote edges
    votes_sql = text(f"""
        SELECT DISTINCT
            p.id as politician_id,
            p.name as politician_name,
            b.id as bill_id,
            b.bill_number,
            b.title as bill_title,
            COUNT(*) as vote_count
        FROM votes v
        JOIN politicians p ON v.politician_id = p.id
        JOIN bills b ON v.bill_id = b.id
        WHERE 1=1 {politician_filter}
        GROUP BY p.id, p.name, b.id, b.bill_number, b.title
        ORDER BY vote_count DESC
        LIMIT 200
    """)
    
    votes_result = await db.execute(votes_sql, params)
    for row in votes_result.mappings().all():
        # Add politician node (may already exist)
        pol_id = f"politician-{row['politician_id']}"
        if pol_id not in node_ids:
            nodes.append(NetworkNode(
                id=pol_id,
                label=row['politician_name'],
                type="politician",
                metadata={"politician_id": row['politician_id']}
            ))
            node_ids.add(pol_id)
        
        # Add bill node
        bill_id = f"bill-{row['bill_id']}"
        if bill_id not in node_ids:
            bill_label = f"{row['bill_number']}" if row['bill_number'] else f"Bill {row['bill_id']}"
            nodes.append(NetworkNode(
                id=bill_id,
                label=bill_label,
                type="bill",
                metadata={
                    "bill_id": row['bill_id'],
                    "title": row['bill_title']
                }
            ))
            node_ids.add(bill_id)
        
        # Add vote edge
        edges.append(NetworkEdge(
            source=pol_id,
            target=bill_id,
            weight=float(row['vote_count']),
            type="vote",
            metadata={"vote_count": row['vote_count']}
        ))
    
    # Optional: Add indirect donor-bill edges via category alignment
    if include_indirect:
        indirect_sql = text(f"""
            SELECT DISTINCT
                d.donor_name,
                d.donor_category,
                b.id as bill_id,
                b.bill_number,
                COUNT(DISTINCT d.id) as edge_count
            FROM donations d
            JOIN politicians p1 ON d.politician_id = p1.id
            JOIN votes v ON v.politician_id = p1.id
            JOIN bills b ON v.bill_id = b.id
            WHERE 1=1 {politician_filter}
              AND b.topic = d.donor_category  -- Match bill topic to donor category
            GROUP BY d.donor_name, d.donor_category, b.id, b.bill_number
            HAVING COUNT(DISTINCT d.id) > 0
            LIMIT 100
        """)
        
        indirect_result = await db.execute(indirect_sql, params)
        for row in indirect_result.mappings().all():
            donor_id = f"donor-{row['donor_name']}"
            bill_id = f"bill-{row['bill_id']}"
            
            # Only add edge if both nodes exist
            if donor_id in node_ids and bill_id in node_ids:
                edges.append(NetworkEdge(
                    source=donor_id,
                    target=bill_id,
                    weight=float(row['edge_count']),
                    type="indirect",
                    metadata={
                        "category": row['donor_category'],
                        "note": "Category-based relationship"
                    }
                ))
    
    return NetworkGraphResponse(
        nodes=nodes,
        edges=edges
    )


__all__ = ["router"]

