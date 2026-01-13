# About CivicLens: Building Transparency Through Data

## 💡 What Inspired This Project

During the 2024 election cycle, I spent hours trying to understand who was funding political campaigns. I'd jump between the FEC website, OpenSecrets, Congress.gov, and various news articles, trying to piece together a complete picture. Each source used different formats, IDs didn't match across databases, and there was no easy way to visualize connections.

I thought: _"In an age where I can get real-time stock analysis and sports statistics in beautiful visualizations, why is political transparency stuck in the dark ages?"_

### The Vision

We wanted to democratize access to political data by:

- **Aggregating scattered sources** into one unified platform
- **Visualizing complex relationships** through interactive maps, timelines, and network graphs
- **Using AI responsibly** with verified citations to prevent hallucinations
- **Making it accessible** to everyone from high school students to veteran journalists

**Core Principle**: _Sunlight is the best disinfectant_ - Justice Louis Brandeis. We believe transparency strengthens democracy, and technology should make that transparency accessible.

---

## 📚 What We Learned

### 1. RAG Architecture & Fighting Hallucinations

Early iterations of our AI would confidently state "facts" that were completely wrong - claiming politicians voted for bills they opposed, or inventing donation amounts.

**Our Solution**: We built a multi-stage verification pipeline that:

- Checks similarity scores between AI responses and source documents (threshold: 0.20)
- Requires citations for every numerical claim
- Fact-checks against our database directly
- Says "I don't have enough information" rather than making up facts

**Result**: Citation accuracy went from 85% to **99.2%**.

### 2. Data Normalization Is Most of the Work

Politicians have different IDs across databases:

- FEC: `H4NY14083`
- Congress.gov: `O000172`
- OpenSecrets: `N00040662`

Plus their names appear differently: "Alexandria Ocasio-Cortez" vs "OCASIO-CORTEZ, ALEXANDRIA" vs "AOC"

**Solution**: Built fuzzy matching with Levenshtein distance algorithm to match politicians across sources with 85% similarity threshold.

**Lesson**: Budget 2-3x more time for data cleaning than you think you'll need.

### 3. Performance Matters at Scale

Our 3D network graph looked great with 20 nodes, then crashed browsers with 463 nodes and 700 edges. The force-directed physics simulation was computing 213,906 calculations per frame!

**Solution**:

- Start with empty graph until user selects a politician
- Show only 1st-degree connections initially (limit: 50 nodes)
- Progressive disclosure with depth slider (1-3 degrees)
- Use WebGL rendering instead of canvas

**Result**: Load time dropped from 3s to 0.5s, frame rate improved from 5 FPS to 60 FPS.

### 4. Caching Strategy for API Rate Limits

FEC allows 1,000 requests/hour. For 100 politicians × 10 categories × 3 years = 3,000 API calls just for the donations map.

**Solution**: Multi-layer caching

1. Database cache in PostgreSQL (24h expiry)
2. In-memory LRU cache in FastAPI (1000 entries)
3. Client-side cache with SWR (5 min stale time, background revalidation)

**Result**: Reduced API calls by 85%, improved response time from 3s to 300ms.

### 5. Trust Is The Product

For civic tech, accuracy isn't enough - users need to **trust** that it's accurate.

**Trust-building features**:

- Citation links on every claim
- Confidence scores showing when AI is uncertain
- "Show AI reasoning" feature explaining which documents were used
- Transparent methodology documentation

---

## 🛠️ How We Built It

### Technology Stack

**Frontend**: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Mapbox GL, react-force-graph, Recharts

**Backend**: FastAPI (Python), PostgreSQL via Supabase, SQLAlchemy 2.0, Alembic

**AI/ML**: Google Gemini 2.5 Flash, Gemini Embedding Model, pgvector for similarity search

**Data Sources**: Congress.gov API, FEC API, OpenSecrets, OpenStates API

### Key Features

1. **Interactive Visualizations**

   - Choropleth maps showing donations by state
   - Timeline charts with clustering by topic
   - 3D network graphs of politician-donor relationships
   - Radial charts breaking down donations by category

2. **Responsible AI Chat**

   - RAG pipeline with semantic search
   - Citation tracking and verification
   - Direct database fact-checking
   - Confidence scoring

3. **Real-time Search & Compare**

   - Search politicians by name, state, or party
   - Side-by-side comparison of multiple politicians
   - Filter by date ranges and categories

4. **Performance Optimizations**
   - Multi-layer caching (database, server, client)
   - Progressive disclosure for complex visualizations
   - Pagination and lazy loading
   - Background revalidation with stale-while-revalidate

---

## 🎯 Technical Challenges We Overcame

### RAG Hallucination Prevention

Built a verification pipeline that cross-checks every AI-generated claim against source documents and our database. Achieved 99.2% citation accuracy by implementing strict similarity thresholds and requiring explicit citations for all numerical claims.

### Cross-Database Identity Resolution

Created a fuzzy matching system to unify politician identities across FEC, Congress.gov, OpenSecrets, and OpenStates - each using different ID systems and name formats.

### Visualization Performance

Optimized 3D network graphs from crashing browsers (463 nodes, 700 edges) to smooth 60 FPS by implementing progressive disclosure, WebGL rendering, and connection depth limiting.

### API Rate Limit Management

Implemented a three-tier caching strategy (PostgreSQL, in-memory LRU, client-side SWR) that reduced external API calls by 85% while maintaining data freshness.

---

## 🌟 What We're Proud Of

- **Transparency through technology**: Making scattered government data accessible and understandable
- **Responsible AI**: Built verification systems achieving 99.2% citation accuracy
- **Technical complexity**: Integrated 4+ APIs, RAG system, 3D visualizations, and real-time filtering
- **User experience**: Made campaign finance data engaging and easy to understand
- **Open source**: Everything is public for community scrutiny and contributions

---

## 🎓 Key Takeaways

1. **Data quality is 70% of the work** - Don't underestimate cleaning and normalization
2. **AI needs guardrails** - RAG without verification enables hallucinations
3. **Performance compounds** - Small slowdowns multiply across features
4. **Progressive disclosure beats information overload** - Start simple, let users add complexity
5. **Citations build trust** - Verifiable sources are essential for civic tech

---

**Built with ❤️ for civic engagement and democratic transparency**

_Because everyone deserves to know who's funding our representatives._
