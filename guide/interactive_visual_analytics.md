# Interactive Visual Analytics — Implementation Strategy

## Creative Approach for Geographic Maps, Temporal Timelines, and Network Graphs

---

## Overview

This document outlines a creative, user-centric approach to implementing interactive visual analytics in CivicLens. The goal is to transform raw political data into engaging, explorable visualizations that reveal patterns while maintaining our core principles: **citations required**, **no endorsements**, and **truth-focused storytelling**.

**Key Visualizations:**

1. **Geographic & Temporal Maps** — Choropleth maps and timelines for donations, votes, and bill sponsorship
2. **Network Graphs & Radial Charts** — Relationship networks between politicians, donors, and bills

---

## Recommended Tech Stack (Locked)

### Charts, Timelines & Radial Visualizations

- **Primary**: `echarts` + `echarts-for-react` — Unified charting system for timeline, radial, and standard charts
  - Best "wow" per effort: built-in time slider, zoom, tooltips, polar/radial charts, animations
  - Handles complex visualizations better than Recharts
- **Keep**: `recharts` (already in use) — Only for simple existing charts that are working well

### Maps

- **Recommended (WOW route)**: `mapbox-gl` + `react-map-gl` — Premium look, great performance
  - Optional: `deck.gl` for animated layers, arcs, heatmaps, flows
- **Alternative (Lightweight route)**: `react-leaflet` + `leaflet` — Easier setup, offline-friendly, but less premium appearance

### Network Graphs

- **Primary**: `react-force-graph` — WebGL-accelerated, performant, great for hackathon demos
  - Best for graphs < ~1,500 nodes
- **Alternative (if richer UX needed)**: `cytoscape.js` — Better interaction model (expand/collapse, layout controls)
- **Alternative (if large scale)**: `sigma.js` — For 5k–50k nodes (more work)

### Backend/Data Layer

- **Database**: Postgres + PostGIS (for geospatial queries, district/state joins)
- **Caching**: Redis (optional) for aggregation response caching
- **Precomputation**: Materialized views or precomputed tables for common aggregations
- **Job Runner**: Simple cron or BullMQ for precomputation jobs

### Key Architecture Rule

**Backend returns values, not shapes. Shapes live in frontend.**

- Frontend stores static GeoJSON/TopoJSON boundaries (states/districts) once
- Backend returns only data values keyed by region ID
- This prevents massive payloads and improves performance

---

## Design Philosophy

### Core Principles

- **Exploration, Not Advocacy**: Visualizations help users discover patterns, not push narratives
- **Citation Transparency**: Every data point links back to source documents
- **Accessibility First**: Screen reader support, keyboard navigation, alternative text formats
- **Progressive Disclosure**: Start simple, allow drilling down into complexity
- **Offline Resilience**: Visualizations work with demo seed data when APIs fail

### Creative Differentiators

- **"Follow the Thread" Interactions**: Click a state → see top donors → see related bills → see voting patterns
- **Time-Slider Storytelling**: Animated timelines that reveal how positions/relationships evolve
- **Comparative Layering**: Overlay multiple politicians' data on the same map for instant comparison
- **Citation Hotspots**: Click any visualization element to see the underlying evidence bundle

---

## Part 1: Geographic & Temporal Maps

### 1.1 Choropleth Maps — Donation Patterns by State

#### Concept

Interactive map where users can explore donation flows across geographic regions. Each state is color-coded by donation totals, with click interactions revealing detailed breakdowns.

**Note**: District-level mapping is de-prioritized for hackathon MVP. Focus on state-level choropleth with excellent drill-down first. District view becomes "nice-to-have" if time permits.

#### Technical Stack

- **Recommended**: `react-map-gl` + `mapbox-gl` (premium look, great performance)
  - Optional: `deck.gl` for animated layers, arcs, heatmaps
- **Alternative**: `react-leaflet` + `leaflet` (lightweight, offline-friendly, easier setup)
- **Map Data**: US state TopoJSON/GeoJSON (Census Bureau or `us-atlas`) — stored in frontend
- **Styling**: Custom CSS to match CivicLens design system (brutalist borders, accessible colors)

#### Creative Features

**A. Multi-Dimensional Filtering**

- Toggle between: Total donations, donations by category (Healthcare, Energy, Tech), donations per capita
- Time slider: Show how donation patterns shift across election cycles
- Party overlay: Switch view to show donations to Democrats vs. Republicans per region

**B. Interactive Drill-Down**

- Click state → Side panel shows:
  - Top 10 donors in that state
  - Top politicians receiving donations
  - Related bills with state-specific voting patterns
  - Citation links to OpenSecrets/ProPublica records
- **Future enhancement**: District-level zoom (de-prioritized for MVP)

**C. Comparative Mode**

- Select 2-3 politicians → Overlay their donation patterns on the same map
- Use different color schemes (e.g., blue vs. red) with opacity for overlapping regions
- Side-by-side state-level comparisons

**D. Temporal Animation**

- Play button animates map changes across election cycles (2018 → 2020 → 2022 → 2024)
- Pause/resume controls, scrub timeline for precise dates
- Show donation spikes around major events (elections, bill votes)

#### Data Requirements (Backend API)

**Key Rule**: Backend returns values only, not GeoJSON shapes. Frontend stores static boundaries.

```typescript
GET /api/visualizations/donations-map
Query params:
  - politician_ids?: string[]  // Optional: filter by politicians
  - category?: string          // Optional: filter by donor category
  - start_date?: ISO8601       // Optional: time range
  - end_date?: ISO8601
  - aggregation_level?: 'state'  // MVP: state only

Response:
{
  level: "state",
  values: {
    "CA": {
      total_amount: 1500000,
      donation_count: 250,
      top_donor_category: "Technology",
      citations: [{...}],    // Source citations (evidence bundle: 1-3 strongest)
      top_politicians: [...], // Related politicians
      top_donors: [...]      // Top donors in this state
    },
    "FL": {
      total_amount: 1200000,
      donation_count: 180,
      // ... same structure
    }
    // ... more states
  },
  metadata: {
    date_range: {...},
    citation_count: 45,
    aggregation_level: "state"
  }
}
```

**Frontend Implementation**:

- Load static US state TopoJSON/GeoJSON once (from `/public/data/us-states.json` or similar)
- Match backend `values` by state code (e.g., `values["CA"]` → GeoJSON feature with `id: "CA"`)
- Render choropleth by combining static shapes with dynamic values

#### Implementation Steps

1. **Phase 1 (MVP)**: Static choropleth map with state-level donation totals
2. **Phase 2**: Add click interactions and detail panel
3. **Phase 3**: Implement time slider and animation
4. **Phase 4**: Add comparative mode
5. **Phase 5 (Future)**: District-level zoom (if time permits)

---

### 1.2 Timeline Visualizations — Voting Patterns Over Time

#### Concept

Horizontal timeline that shows voting patterns, bill sponsorship, and donation milestones along a chronological axis. Users can zoom, filter, and interact with events.

#### Technical Stack

- **Primary**: `echarts` + `echarts-for-react` — Unified charting system with built-in timeline support, zoom, time slider, animations
- **Note**: `vis-timeline` only if you specifically need calendar-style timeline UI out of the box (unlikely for this use case)

#### Creative Features

**A. Multi-Layer Timeline**

- **Layer 1**: Voting record (yes/no/abstain indicators)
- **Layer 2**: Bill sponsorship (diamonds/points)
- **Layer 3**: Major donations (bar height = amount)
- **Layer 4**: Public statements (text callouts)
- Toggle layers on/off for focused exploration

**B. Contextual Event Groups**

- Group related events: "Healthcare Bills Cluster (2023)", "Election Cycle (2024)"
- Expandable groups reveal detailed events
- Color-code by topic/issue area

**C. Interactive Cross-Reference**

- Click a vote → Highlight related bills and donation spikes around that date
- Click a donation → Show subsequent votes that might correlate (with disclaimer: "correlation ≠ causation")
- **Evidence bundles**: Show 1-3 strongest citations inline, "View all evidence (n)" opens drawer

**D. Comparative Timeline View**

- Select multiple politicians → Stacked or side-by-side timelines
- Sync timeline zoom/pan across all politicians
- Highlight differences (e.g., "Politician A voted Yes, Politician B voted No")

#### Data Requirements (Backend API)

```typescript
GET /api/visualizations/politician-timeline/{politician_id}
Query params:
  - start_date?: ISO8601
  - end_date?: ISO8601
  - event_types?: ('vote' | 'bill_sponsor' | 'donation' | 'statement')[]

Response:
{
  events: [
    {
      id: "vote-123",
      type: "vote",
      date: "2024-03-15",
      title: "HR 1234 - Healthcare Reform Act",
      outcome: "yes",
      related_bills: [...],
      related_donations: [...],
      citations: [{...}],  // Evidence bundle: 1-3 strongest citations
      citation_count: 5    // Total count (opens drawer)
    },
    // ... more events
  ],
  clusters: [
    {
      name: "Healthcare Bills",
      start_date: "2024-03-01",
      end_date: "2024-03-30",
      event_ids: ["vote-123", "vote-124"]
    }
  ]
}
```

#### Implementation Steps

1. **Phase 1 (MVP)**: Simple timeline with voting events using ECharts
2. **Phase 2**: Add bill sponsorship and donation layers
3. **Phase 3**: Implement clustering and grouping
4. **Phase 4**: Add comparative multi-politician view

---

## Part 2: Network Graphs & Radial Charts

### 2.1 Network Graphs — Politician-Donor-Bill Relationships

#### Concept

Force-directed or hierarchical network graph showing connections between politicians, donors, and bills. Node sizes and edge weights represent influence/connection strength.

#### Technical Stack

- **Primary**: `react-force-graph` — WebGL-accelerated, performant, great for hackathon demos
  - Best for graphs < ~1,500 nodes
- **Alternative (if richer UX needed)**: `cytoscape.js` — Better interaction model (expand/collapse, layout controls, better selection)
- **Alternative (if large scale)**: `sigma.js` — For 5k–50k nodes (more work, not needed for MVP)

#### Creative Features

**A. Dynamic Node Types**

- **Politicians**: Circular nodes, color by party, size by vote count
- **Donors**: Diamond nodes, color by category, size by total donations
- **Bills**: Square nodes, color by topic, size by number of sponsors
- **Toggle visibility**: Show/hide node types for focused exploration

**B. Relationship Edge Types**

- **Politician ↔ Donor**: Thickness = donation amount, color = donor category
- **Politician ↔ Bill**: Sponsorship (solid) vs. Vote (dashed), color = vote outcome
- **Donor ↔ Bill**: Indirect connection (dotted) — **Behind toggle with disclaimer**
  - Default: Show only direct, source-backed edges
  - Toggle: "Show derived links (category-based)" with disclaimer: "These connections are inferred from category alignment, not direct evidence"

**C. Interactive Exploration Modes**

- **"Influence Path"**: Click a donor → Highlight all connected politicians → Show related bills
- **"Legislative Web"**: Click a bill → Show all sponsors → Show their donors → Reveal patterns
- **"Clustering View"**: Auto-group nodes by similarity (e.g., all Healthcare-related connections)

**D. Filtering & Search**

- Search bar: Find specific politicians, donors, or bills
- Slider filters: Minimum donation threshold, date range
- **Evidence bundles**: Click any connection → Show 1-3 strongest citations inline, "View all evidence (n)" opens drawer

#### Data Requirements (Backend API)

```typescript
GET /api/visualizations/network-graph
Query params:
  - politician_ids?: string[]      // Optional: focus on specific politicians
  - min_donation?: number          // Filter by donation threshold
  - bill_ids?: string[]            // Optional: include specific bills
  - connection_type?: ('direct' | 'indirect' | 'all')

Response:
{
  nodes: [
    {
      id: "pol-123",
      type: "politician",
      label: "Jane Smith",
      party: "D",
      size: 50,                    // Based on vote count
      color: "#1e40af",
      metadata: {...}
    },
    {
      id: "donor-456",
      type: "donor",
      label: "TechCorp PAC",
      category: "Technology",
      size: 30,                    // Based on total donations
      color: "#8b5cf6"
    },
    // ... more nodes
  ],
  edges: [
    {
      id: "edge-1",
      source: "donor-456",
      target: "pol-123",
      type: "donation",
      weight: 50000,               // Donation amount
      thickness: 5,                // Visual thickness
      citations: [{...}],          // Evidence bundle: 1-3 strongest citations
      citation_count: 3            // Total count (opens drawer)
    },
    // ... more edges
  ],
  clusters: [
    {
      id: "healthcare-cluster",
      name: "Healthcare",
      node_ids: ["pol-123", "bill-789"]
    }
  ]
}
```

#### Implementation Steps

1. **Phase 1 (MVP)**: Basic force-directed graph with politicians and donors (direct edges only)
2. **Phase 2**: Add bills and relationship types
3. **Phase 3**: Implement interactive modes and filtering
4. **Phase 4**: Add clustering and evidence bundle overlays
5. **Phase 5 (Optional)**: Add indirect edge toggle with disclaimer

---

### 2.2 Radial Charts — Donor Influence Patterns

#### Concept

Circular/radial layout where the center represents a politician, and concentric rings/spokes represent donor categories, bills, or voting patterns. Inspired by Graphicacy's donor-gap project.

#### Technical Stack

- **Primary**: `echarts` + `echarts-for-react` — Built-in polar/radial chart support with animations
- **Note**: ECharts handles radial charts natively, no need for custom D3/Visx work

#### Creative Features

**A. Multi-Ring Radial Layout**

- **Center**: Politician name/photo
- **Ring 1 (Inner)**: Donor categories (Healthcare, Energy, Tech, etc.)
  - Segment angle = proportion of donations
  - Segment length = total amount (radial distance)
- **Ring 2 (Middle)**: Related bills (spokes extending outward)
  - Connect donor category to related bills via curved lines
- **Ring 3 (Outer)**: Voting outcomes on those bills (yes/no indicators)

**B. Interactive Radial Interactions**

- **Hover segment**: Highlight related donor category, bills, and votes
- **Click segment**: Zoom into that category → Show detailed breakdown
- **Animation**: Rotate to align selected category at top (better readability)

**C. Comparative Radial View**

- Place 2-3 politicians' radial charts side-by-side
- **Synchronize categories**: Align donor category segments for easy comparison
- **Difference highlighting**: Highlight segments where politicians differ significantly

**D. "Influence Pathway" Visualization**

- Click a donor category → Animate pathway showing:
  - Donation flow (curved line)
  - Related bills (connected nodes)
  - Voting outcome (color-coded indicator)
  - Evidence bundle: Show 1-3 strongest citations, "View all evidence (n)" opens drawer

#### Data Requirements (Backend API)

```typescript
GET /api/visualizations/politician-radial/{politician_id}
Response:
{
  politician: {
    id: "pol-123",
    name: "Jane Smith",
    image_url: "..."
  },
  donor_categories: [
    {
      id: "healthcare",
      name: "Healthcare",
      total_amount: 200000,
      percentage: 35,
      angle_start: 0,
      angle_end: 126,
      related_bills: [
        {
          id: "bill-789",
          title: "HR 1234 - Healthcare Reform",
          vote_outcome: "yes",
          connection_strength: 0.8
        }
      ],
      citations: [{...}],  // Evidence bundle: 1-3 strongest citations
      citation_count: 4    // Total count (opens drawer)
    },
    // ... more categories
  ],
  total_donations: 571428
}
```

#### Implementation Steps

1. **Phase 1 (MVP)**: Single-ring radial chart with donor categories using ECharts polar charts
2. **Phase 2**: Add bill connections and voting outcomes
3. **Phase 3**: Implement interactive hover/click interactions
4. **Phase 4**: Add comparative view and animations

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)

- **Backend**:
  - Set up PostGIS extension for geospatial queries
  - Create visualization API endpoints with aggregation logic
  - Design materialized views for common aggregations (`donations_by_state_cycle`, `top_donors_by_region`, `graph_edges_by_politician`)
  - Implement Redis caching layer (optional but recommended)
- **Frontend**:
  - Install and configure `echarts`, `echarts-for-react`
  - Install `react-map-gl` (or `react-leaflet` for lightweight route)
  - Install `react-force-graph`
  - Set up visualization component library structure
  - Load static US state TopoJSON/GeoJSON boundaries
- **Data**: Ensure demo seed includes enough data for meaningful visualizations

**Deliverables:**

- `/backend/app/api/visualizations/` — API route stubs
- `/backend/app/core/postgis.py` — PostGIS setup
- `/backend/migrations/xxx_add_postgis.sql` — PostGIS extension
- `/frontend/components/visualizations/` — Component folder structure
- `/frontend/public/data/us-states.json` — Static state boundaries
- `/guide/visualization_data_schema.md` — Data shape documentation

### Phase 2: MVP Maps (Week 2)

- **Priority**: Choropleth map (state-level donations only)
- **Library**: `react-map-gl` (Mapbox) or `react-leaflet` (lightweight)
- **Integration**: Connect to donations-map API (values only, no GeoJSON)
- **Key**: Frontend combines static boundaries with backend values

**Deliverables:**

- `<ChoroplethMap />` component
- Basic click interactions and detail panel
- Evidence bundle integration (1-3 citations inline)

### Phase 3: MVP Timelines (Week 2-3)

- **Priority**: Simple timeline with voting events
- **Library**: `echarts` + `echarts-for-react` (unified charting)
- **Integration**: Connect to votes/bills API

**Deliverables:**

- `<Timeline />` component using ECharts
- Event grouping and multi-layer support
- Evidence bundle popovers

### Phase 4: Network Graphs (Week 3)

- **Priority**: Force-directed graph with politicians and donors (direct edges only)
- **Library**: `react-force-graph`
- **Integration**: Create network data aggregation endpoint
- **Scale**: Optimize for <1,500 nodes

**Deliverables:**

- `<NetworkGraph />` component
- Interactive filtering and search
- Evidence bundle overlays

### Phase 5: Radial Charts (Week 3-4)

- **Priority**: Single-ring donor category radial
- **Library**: `echarts` polar/radial charts
- **Integration**: Extend donation aggregation API

**Deliverables:**

- `<RadialChart />` component using ECharts
- Interactive pathways
- Comparative view

### Phase 6: Polish & Integration (Week 4)

- **Accessibility**: Screen reader support, keyboard navigation
- **Performance**: Optimize rendering, implement caching
- **Feature Flags**: Env flags for demo mode/offline mode
- **Error Tracking**: Optional Sentry integration for stability
- **Documentation**: User guides and citation explanations

---

## Technical Considerations

### Backend/Data Layer

**PostGIS Setup**

- Enable PostGIS extension for geospatial queries
- Use PostGIS for district/state joins and spatial aggregations
- Example: `SELECT state_code, SUM(amount) FROM donations JOIN districts USING (district_id) GROUP BY state_code`

**Materialized Views (Precomputed Aggregations)**

- `donations_by_state_cycle` — Pre-aggregated by state and election cycle
- `donations_by_district_cycle` — Pre-aggregated by district (if implementing districts)
- `top_donors_by_region` — Top N donors per state/district
- `graph_edges_by_politician` — Cached network edges for faster graph loading
- Refresh strategy: Daily cron job or event-driven refresh on new data ingestion

**Caching Strategy**

- Redis (optional but recommended) for caching aggregation API responses
- Cache keys: `viz:donations-map:{params_hash}`, `viz:network-graph:{politician_ids}`
- TTL: 1 hour for donation maps, 6 hours for network graphs (less frequently changing)
- Invalidate on new data ingestion

**Job Runner**

- Simple cron job or BullMQ (if Node.js) for precomputation tasks
- Schedule: Daily refresh of materialized views, weekly full recomputation

### Performance Optimization

- **Lazy Loading**: Load map tiles and graph nodes on demand
- **Data Virtualization**: Only render visible timeline events (ECharts handles this well)
- **Web Workers**: Offload heavy calculations (network layout, clustering) — react-force-graph uses WebGL
- **Caching**: Cache aggregated visualization data (Redis) and static boundaries (CDN/browser cache)
- **TopoJSON**: Use TopoJSON for boundaries (smaller than GeoJSON), convert to GeoJSON client-side if needed

### Accessibility

- **Screen Readers**: ARIA labels, semantic HTML for all interactive elements
- **Keyboard Navigation**: Tab through nodes, arrow keys for timeline scrubbing
- **Alternative Formats**: "Export as table" button for every visualization
- **Color Contrast**: Ensure WCAG AA compliance for all color schemes

### Citation Integration

- Every visualization element must link to source documents
- **Evidence Bundles**: Show 1-3 strongest citations inline (not citation overload)
- **Source Drawer**: "View all evidence (n)" button opens side drawer with full citation list
- **Citation Badge**: Clickable badge on each data point showing evidence bundle
- **Traceability**: Maintain data lineage from visualization → aggregation → raw data → source

### Offline Demo Support

- Visualizations must work with demo seed data
- **Graceful Degradation**: Show "Insufficient data" if demo dataset lacks required fields
- **Static Boundaries**: Include TopoJSON/GeoJSON boundaries in `/public/data/` for offline maps
- **Feature Flags**: Use env flags (`DEMO_MODE=true`) to enable offline fallbacks cleanly
- **Precomputed Demo Data**: Include pre-aggregated visualization data in demo seed

---

## Creative UX Patterns

### 1. "Discovery Mode" vs. "Analysis Mode"

- **Discovery Mode**: Guided tours, suggested explorations, tooltips
- **Analysis Mode**: Advanced filters, raw data export, citation deep-dives

### 2. "Storytelling Sequences"

- Pre-built narrative flows: "How donations influence votes" → Walk users through specific examples
- Interactive tutorial: "Click here to see how we trace this connection"

### 3. "Comparison Hubs"

- Dedicated comparison page with side-by-side visualizations
- "Spot the difference" mode highlighting key variations

### 4. "Citation Transparency Layer"

- Toggle overlay showing citation count for every data point
- "Trust indicator": Show data freshness, source quality scores

---

## Success Metrics

- **Engagement**: Users spend 2+ minutes exploring visualizations
- **Citation Clicks**: 30%+ of users click at least one citation link
- **Accessibility**: 100% WCAG AA compliance, keyboard navigation support
- **Performance**: Visualizations load in <2 seconds, interactions respond in <100ms
- **Demo Reliability**: All visualizations work offline with demo seed

---

## Open Questions & Decisions Needed

1. **Map Library**: `react-map-gl` (Mapbox) for WOW factor vs. `react-leaflet` for lightweight/offline? (Decision: Mapbox recommended for hackathon impact)
2. **Network Graph Scale**: Target <1,500 nodes (react-force-graph handles this well)
3. **Temporal Granularity**: Daily, weekly, or monthly aggregation for timelines? (Recommend: Weekly for performance, daily for detailed views)
4. **Evidence Bundle Size**: How many citations in inline bundle? (Recommend: 1-3 strongest)
5. **Mobile Responsiveness**: Simplified mobile views vs. full-featured responsive? (Recommend: Responsive with simplified controls)
6. **PostGIS vs. Manual Joins**: Use PostGIS for geospatial queries or manual state/district mapping? (Recommend: PostGIS for scalability)
7. **Redis Caching**: Implement Redis caching or rely on Postgres materialized views? (Recommend: Both — materialized views + Redis for API responses)

---

## References & Inspiration

- **Infogram Election Data Guide**: [infogram.com] — Best practices for election visualizations
- **Graphicacy Donor-Gap Project**: [medium.com] — Radial chart inspiration for donor relationships
- **ProPublica Visualizations**: Real-world examples of political data visualization
- **D3 Gallery**: Network graphs and timeline examples
- **Leaflet Examples**: Interactive map patterns

---

## Next Steps

1. **Team Alignment**: Review this document with frontend, backend, and design leads
2. **Library Installation**: Install `echarts`, `echarts-for-react`, `react-map-gl` (or `react-leaflet`), `react-force-graph`
3. **Backend Setup**: Enable PostGIS, create materialized views, set up Redis caching (optional)
4. **API Contracts**: Draft detailed API specifications for visualization endpoints (values only, no GeoJSON)
5. **Static Boundaries**: Download/prepare US state TopoJSON/GeoJSON for frontend
6. **Component Architecture**: Design reusable visualization component structure
7. **Feature Flags**: Set up env flags for demo mode/offline mode
8. **Accessibility Audit**: Plan WCAG compliance testing strategy

---

## Final Recommended Stack Summary

**If locking today:**

- **Maps**: `react-map-gl` (Mapbox) for WOW, or `react-leaflet` for lightweight/offline
- **Charts (timeline + radial + standard)**: `echarts` + `echarts-for-react`
- **Network**: `react-force-graph`
- **Data**: Postgres + PostGIS, optional Redis cache
- **Key Rule**: Backend returns values, not shapes; shapes live in frontend

---

**Document Status**: Implementation In Progress — See `IMPLEMENTATION_PLAN.md` for detailed steps  
**Last Updated**: January 2026  
**Owner**: Frontend/UX Team  
**Reviewers**: Backend, Data/Ingestion, AI/RAG Teams

---

## Implementation Progress

See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for:

- Detailed step-by-step implementation guide
- Sprint breakdown (5 sprints, ~2 weeks)
- File structure and component list
- Success criteria checklist

**Current MVP Components (Completed):**

- ✅ `DonationsMap.tsx` - Choropleth map with state details
- ✅ `TimelineChart.tsx` - ECharts timeline with multi-layer events
- ✅ `NetworkGraph.tsx` - Force-directed graph with react-force-graph
- ✅ `RadialChart.tsx` - Donut chart with category breakdown

**Next Steps:**

1. Add time slider to DonationsMap
2. Integrate SourceDrawer for citations
3. Implement comparative mode
