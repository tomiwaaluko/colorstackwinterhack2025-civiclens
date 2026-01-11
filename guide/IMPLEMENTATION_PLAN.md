# Interactive Visual Analytics - Implementation Plan

## Current State Assessment

All 4 base visualization components exist with MVP functionality:

| Component           | MVP Status   | Missing Features                              |
| ------------------- | ------------ | --------------------------------------------- |
| `DonationsMap.tsx`  | ✅ Phase 1-2 | Time slider, comparative mode, party overlay  |
| `TimelineChart.tsx` | ✅ Phase 1-2 | Clustering, cross-reference, comparative view |
| `NetworkGraph.tsx`  | ✅ Phase 1-2 | Search, exploration modes, clustering         |
| `RadialChart.tsx`   | ✅ Phase 1   | Multi-ring, pathways, comparative view        |

---

## Implementation Phases

### Phase 1: Enhance DonationsMap (Priority: HIGH) ✅ COMPLETED

**Goal**: Add time slider, comparative mode, and party overlay to make the map truly interactive.

#### 1.1 Time Slider Animation ✅

- [x] Add ECharts-style time slider below map OR custom slider component
- [x] Implement play/pause controls for animated temporal view
- [x] Show donation changes across election cycles (2022 → 2023 → 2024)
- [x] Update map colors smoothly during animation

**Files modified:** ✅

- `frontend/components/DonationsMap.tsx` - Enhanced with time slider, view modes, comparative
- `frontend/lib/types.ts` - Added MapViewMode, PartyDonationValue, ComparativePoliticianData types
- `frontend/app/visualizations/page.tsx` - Added politician comparison selector UI

**New components created:** ✅

- `frontend/components/ui/TimeSlider.tsx` - Animated time slider with play/pause/scrub controls

**Implementation completed:**

- Added state for currentYear/dateRange
- Created TimeSlider component with play/pause/scrub
- Fetches data filtered by year from backend
- Map re-renders smoothly on year change
- Visual indicator shows current time period with progress bar

#### 1.2 Comparative Mode ✅

- [x] Add politician selector (multi-select dropdown)
- [x] Support overlay of 2-3 politicians' donation patterns
- [x] Use different color schemes with opacity for overlapping
- [x] Add side-by-side split view option (shows dominant politician per state)

**Implementation completed:**

- Created multi-politician selector with add/remove functionality
- Map shows which politician has most donations per state
- Legend shows all compared politicians with their colors
- State detail panel shows breakdown by politician

#### 1.3 Party Overlay View ✅

- [x] Add toggle for "Show by Party"
- [x] Aggregate donations by party (D/R/I) per state
- [x] Use party colors (blue/red/purple)

**Implementation completed:**

- Added view mode tabs (Total / By Party / Compare Politicians)
- Party view shows D/R/I breakdown with blended colors
- State detail panel shows party-specific amounts
- Legend shows party colors

---

### Phase 2: Enhance TimelineChart (Priority: HIGH) ✅ COMPLETED

**Goal**: Add clustering, cross-reference highlighting, and comparative timeline view.

#### 2.1 Event Clustering/Grouping ✅

- [x] Implement automatic event clustering by topic
- [x] Show expandable groups (e.g., "Healthcare Bills Cluster (2023)")
- [x] Color-code clusters by topic/issue area
- [x] Use ECharts visual grouping features

**Files modified:** ✅

- `frontend/components/TimelineChart.tsx` - Complete rewrite with all new features
- `frontend/lib/types.ts` - Added TimelineCluster, ComparativeTimelineData, TimelineComparisonResult
- `frontend/lib/api.ts` - Added generateDemoTimelineEvents() with topic-tagged events
- `frontend/app/visualizations/page.tsx` - Added timeline comparison UI

**Implementation completed:**

- Automatic clustering by topic (Healthcare, Energy, Technology, Finance, Environment, Defense)
- Expandable cluster panels showing grouped events
- Topic-based color coding with visual indicators
- Cluster markers shown on the ECharts timeline

#### 2.2 Interactive Cross-Reference ✅

- [x] Click vote → Highlight related donations around that date
- [x] Click donation → Show nearby votes (with "correlation ≠ causation" disclaimer)
- [x] Add visual connections between related events
- [x] Show evidence bundle popover on click

**Implementation completed:**

- Click handler on scatter points selects event
- Related events (within 14 days, different type) are highlighted
- Amber warning banner shows "Correlation does not imply causation" disclaimer
- Selected event detail panel shows citations with "View all evidence" link
- Related events shown as clickable badges

#### 2.3 Comparative Timeline View ✅

- [x] Support multi-politician selection
- [x] Create stacked or side-by-side timeline layout
- [x] Sync zoom/pan across all timelines
- [x] Highlight vote differences (A voted Yes, B voted No)

**Implementation completed:**

- Added politician comparison selector (up to 4 politicians)
- Comparative view mode shows all politicians on same timeline
- Politicians displayed on separate y-axis rows with distinct colors
- ECharts dataZoom syncs across all politician data
- Single/Compare toggle in component header
- Comparative data loaded in parallel for all selected politicians

---

### Phase 3: Enhance NetworkGraph (Priority: MEDIUM)

**Goal**: Add search, exploration modes, and clustering for richer interaction.

#### 3.1 Search & Filter

- [ ] Add search bar to find politicians, donors, bills
- [ ] Implement minimum donation threshold slider
- [ ] Add date range filter
- [ ] Highlight matching nodes on search

**Files to modify:**

- `frontend/components/NetworkGraph.tsx`

**New components to create:**

- `frontend/components/NetworkSearchBar.tsx`
- `frontend/components/NetworkFilters.tsx`

**Implementation steps:**

```
1. Create SearchBar component with autocomplete
2. Add filter controls (sliders, date pickers)
3. Implement node filtering logic
4. Add highlight/focus functionality for search results
5. Update graph data based on filters
```

#### 3.2 Exploration Modes

- [ ] **"Influence Path"**: Click donor → Highlight connected politicians → Show related bills
- [ ] **"Legislative Web"**: Click bill → Show sponsors → Show their donors
- [ ] Add mode toggle UI (buttons/tabs)
- [ ] Implement path highlighting with animations

**Implementation steps:**

```
1. Create ExplorationModeSelector component
2. Implement pathfinding algorithm for connected nodes
3. Add visual highlighting for active paths
4. Create animation for path traversal
5. Show intermediate connections step-by-step
```

#### 3.3 Clustering View

- [ ] Auto-group nodes by category/topic
- [ ] Add visual cluster boundaries
- [ ] Allow cluster expand/collapse
- [ ] Show cluster summary on hover

**Implementation steps:**

```
1. Use clusters from API response
2. Apply force-graph clustering forces
3. Add visual cluster hulls/boundaries
4. Implement expand/collapse interactions
```

---

### Phase 4: Enhance RadialChart (Priority: MEDIUM)

**Goal**: Create multi-ring layout with bill connections and pathway animations.

#### 4.1 Multi-Ring Layout

- [ ] **Ring 1 (Inner)**: Donor categories (current implementation)
- [ ] **Ring 2 (Middle)**: Related bills as spokes
- [ ] **Ring 3 (Outer)**: Voting outcomes on those bills
- [ ] Connect categories to bills via curved lines

**Files to modify:**

- `frontend/components/RadialChart.tsx`
- Backend: `radial.py` endpoint may need bill data

**Implementation steps:**

```
1. Extend backend to include related_bills per category
2. Convert from pie/donut to custom ECharts polar chart
3. Add bill layer with spoke connections
4. Add voting outcome indicators on outer ring
5. Style connections with category colors
```

#### 4.2 Interactive Segment Interactions

- [ ] Hover segment → Highlight connected bills and votes
- [ ] Click segment → Zoom into category detail view
- [ ] Add rotation animation to align selected segment at top

**Implementation steps:**

```
1. Add onMouseOver/onMouseOut handlers
2. Implement highlighting logic across rings
3. Create zoom transition animation
4. Add rotation animation for focus
```

#### 4.3 Comparative Radial View

- [ ] Side-by-side radial charts for 2-3 politicians
- [ ] Synchronize category alignment
- [ ] Highlight segments with significant differences

**New components to create:**

- `frontend/components/RadialComparison.tsx`

**Implementation steps:**

```
1. Create wrapper component for multiple charts
2. Normalize category ordering across charts
3. Add visual difference indicators
4. Create shared legend
```

#### 4.4 "Influence Pathway" Animation

- [ ] Click category → Animate donation flow line
- [ ] Show connected bills appearing
- [ ] Display voting outcome at end
- [ ] Show evidence bundle during animation

**Implementation steps:**

```
1. Create pathway animation sequence
2. Use ECharts graphic animations
3. Add step-by-step progression
4. Integrate citation display at each step
```

---

### Phase 5: Citation Integration (Priority: HIGH)

**Goal**: Every visualization element links to source documents with proper evidence bundles.

#### 5.1 SourceDrawer Integration

- [ ] Add SourceDrawer to DonationsMap (on state click)
- [ ] Add SourceDrawer to TimelineChart (on event click)
- [ ] Add SourceDrawer to NetworkGraph (on node/edge click)
- [ ] Add SourceDrawer to RadialChart (on segment click)

**Files to modify:**

- All 4 visualization components
- Import and use existing `SourceDrawer.tsx`

**Implementation steps:**

```
1. Add drawer state to each component
2. Collect citations for clicked element
3. Open SourceDrawer with relevant citations
4. Add "View all evidence (n)" button
```

#### 5.2 CitationBadge Integration

- [ ] Add citation count badges to map regions
- [ ] Add badges to timeline events
- [ ] Add badges to network nodes/edges
- [ ] Add badges to radial segments

**Implementation steps:**

```
1. Create CitationCount component (shows count, clickable)
2. Position badges appropriately in each visualization
3. Connect badge click to SourceDrawer
```

#### 5.3 Evidence Bundle Popovers

- [ ] Show 1-3 strongest citations inline on hover
- [ ] "View all evidence (n)" opens full drawer
- [ ] Style consistently across all visualizations

**New components to create:**

- `frontend/components/EvidencePopover.tsx`

---

### Phase 6: Accessibility & Polish (Priority: HIGH)

**Goal**: Ensure WCAG AA compliance and professional polish.

#### 6.1 Screen Reader Support

- [ ] Add ARIA labels to all interactive elements
- [ ] Provide alternative text for visualizations
- [ ] Ensure logical focus order

**Implementation steps:**

```
1. Audit all components for ARIA compliance
2. Add role, aria-label, aria-describedby attributes
3. Test with screen reader
```

#### 6.2 Keyboard Navigation

- [ ] Tab through map regions, timeline events, graph nodes
- [ ] Arrow keys for timeline scrubbing
- [ ] Enter/Space for selection
- [ ] Escape to close drawers/popovers

**Implementation steps:**

```
1. Add tabIndex to interactive elements
2. Implement onKeyDown handlers
3. Create focus indicators/styles
4. Test keyboard-only navigation
```

#### 6.3 Export as Table

- [ ] Add "Export as Table" button to each visualization
- [ ] Generate accessible table format of data
- [ ] Allow CSV download option

**New components to create:**

- `frontend/components/DataTableExport.tsx`

**Implementation steps:**

```
1. Create table generation logic per visualization
2. Add export button to each component
3. Implement CSV download
4. Style accessible data table
```

#### 6.4 Color Contrast & Themes

- [ ] Ensure all colors meet WCAG AA contrast
- [ ] Add high-contrast mode toggle
- [ ] Test with color blindness simulators

---

### Phase 7: Creative UX Patterns (Priority: MEDIUM)

**Goal**: Implement differentiating UX features for engagement.

#### 7.1 Discovery Mode

- [ ] Add guided tour overlay for first-time users
- [ ] Implement tooltips explaining visualization features
- [ ] Create "suggested explorations" prompts

**New components to create:**

- `frontend/components/DiscoveryTour.tsx`
- `frontend/components/SuggestedExplorations.tsx`

#### 7.2 Comparison Hubs

- [ ] Create dedicated comparison page with side-by-side visualizations
- [ ] Implement "Spot the Difference" mode
- [ ] Add comparison summary cards

**Files to modify:**

- `frontend/app/compare/page.tsx`
- Create new visualization comparison layouts

#### 7.3 Storytelling Sequences

- [ ] Create pre-built narrative flows
- [ ] "How donations influence votes" walkthrough
- [ ] Interactive tutorial with step highlighting

**New pages/components:**

- `frontend/app/stories/page.tsx`
- `frontend/components/StorySequence.tsx`

#### 7.4 Citation Transparency Layer

- [ ] Add toggle overlay showing citation count for every data point
- [ ] Implement "Trust indicator" showing data freshness
- [ ] Add source quality scores (if available)

---

## Implementation Order (Recommended)

### Sprint 1 (Days 1-3): Core Enhancements

1. ✅ **DonationsMap Time Slider** (1.1) - COMPLETED
2. **Citation Integration** (5.1, 5.2) - Critical for credibility
3. **TimelineChart Cross-Reference** (2.2) - High engagement value

### Sprint 2 (Days 4-6): Comparative Features

4. ✅ **DonationsMap Comparative Mode** (1.2) - COMPLETED
5. **TimelineChart Comparative View** (2.3) - Unique differentiator
6. **NetworkGraph Search** (3.1) - Essential usability

### Sprint 3 (Days 7-9): Accessibility & Polish

7. **Accessibility Audit** (6.1, 6.2) - Required for production
8. **Export as Table** (6.3) - Accessibility compliance
9. **Color Contrast** (6.4) - WCAG compliance

### Sprint 4 (Days 10-12): Advanced Features

10. **NetworkGraph Exploration Modes** (3.2) - WOW factor
11. **RadialChart Multi-Ring** (4.1) - Visual impact
12. **RadialChart Pathway Animation** (4.4) - Engagement

### Sprint 5 (Days 13-14): Creative UX

13. **Discovery Mode** (7.1) - Onboarding
14. **Comparison Hubs** (7.2) - Core feature
15. **Final Polish** - Bug fixes, performance

---

## File Structure After Implementation

```
frontend/components/
├── visualizations/
│   ├── DonationsMap.tsx (enhanced)
│   ├── TimelineChart.tsx (enhanced)
│   ├── NetworkGraph.tsx (enhanced)
│   ├── RadialChart.tsx (enhanced)
│   ├── RadialComparison.tsx (new)
│   ├── CompareTimeline.tsx (new)
│   └── shared/
│       ├── TimeSlider.tsx (new)
│       ├── EvidencePopover.tsx (new)
│       ├── NetworkSearchBar.tsx (new)
│       ├── NetworkFilters.tsx (new)
│       ├── DataTableExport.tsx (new)
│       └── DiscoveryTour.tsx (new)
├── SourceDrawer.tsx (existing)
├── CitationBadge.tsx (existing)
└── ...
```

---

## Success Criteria

- [ ] All 4 visualizations have time/filtering controls
- [ ] Comparative mode works for maps and timelines
- [ ] Search works in network graph
- [ ] Every clickable element shows citations
- [ ] WCAG AA compliance verified
- [ ] Keyboard navigation works throughout
- [ ] Export to table available
- [ ] Discovery mode guides new users
- [ ] Performance: <2s load, <100ms interactions
- [ ] Works offline with demo data

---

## Dependencies & Prerequisites

All prerequisites verified complete (see `pre-interactive-visual-analytics.md`):

- ✅ PostgreSQL + PostGIS running
- ✅ Database schema complete
- ✅ Frontend libraries installed (ECharts, Leaflet, react-force-graph)
- ✅ Static map data available
- ✅ Backend aggregation endpoints working
- ✅ Demo seed data ready

---

**Document Status**: Implementation Plan  
**Created**: January 2026  
**Owner**: Frontend Team  
**Estimated Duration**: 2-3 weeks
