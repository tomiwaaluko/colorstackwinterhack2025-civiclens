# 🏛️ CivicLens

**Transparent Political Data Visualization & Analysis Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-green)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-brightgreen)](https://supabase.com/)

CivicLens brings transparency to political donations, legislative activities, and politician networks by aggregating government data and presenting it through interactive visualizations powered by AI.

---

## The Problem

Political donations and legislative activities are scattered across multiple government databases, making it difficult for citizens, journalists, and researchers to understand the financial interests behind political decisions.

## Our Solution

A unified platform that provides:
- **Interactive visualizations** - Maps, timelines, network graphs, and radial charts
- **AI-powered insights** - RAG using Google Gemini for contextual analysis
- **Comparative analysis** - Compare up to 5 politicians side-by-side
- **Citation tracking** - Links to original government sources

---

## Key Features

### Visualizations
- **Donations Map** - State-by-state choropleth showing campaign contributions
- **Timeline Chart** - Chronological events with bills, votes, and statements
- **Network Graph** - 3D force-directed graph revealing donor-politician relationships
- **Radial Chart** - Hierarchical view of donations by industry

### AI Features
- **Context-aware chat** with data-grounded responses
- **Smart suggestions** based on exploration patterns
- **Natural language queries** about political data
- **Citation tracking** for transparency

---

## Tech Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui  
**Backend:** FastAPI, Python, SQLAlchemy  
**Database:** Supabase (PostgreSQL)  
**AI/ML:** Google Gemini (RAG + embeddings)  
**Visualizations:** react-force-graph, Mapbox GL, Recharts  
**Data Sources:** Congress.gov API, FEC API, OpenSecrets

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL (via Supabase)

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local  # Add your API keys
npm run dev  # Runs on http://localhost:3000
```

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your API keys
alembic upgrade head
uvicorn app.main:app --reload --port 8000  # Runs on http://localhost:8000
```

### Environment Variables

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend (.env)**
```env
DATABASE_URL=postgresql+asyncpg://postgres:password@host:5432/postgres
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

---

## 📖 Usage Guide

### Getting Started
1. Navigate to **Visualizations** in the top navigation
2. Choose a visualization: Donations Map, Timeline, Network Graph, or Radial Chart
3. Select filters (date ranges, categories, politicians)
4. Use the **AI Chat** to ask questions about the data

### Example Questions for AI
- "Who are the top donors to climate legislation?"
- "How has this politician's voting record changed?"
- "What industries fund this committee?"

---

## Architecture

```
Frontend (Next.js + React)
    ↓
Backend API (FastAPI)
    ↓
Supabase PostgreSQL
    ↓
External APIs (Congress.gov, FEC, OpenSecrets)
```

---

## Impact

CivicLens helps:
- **Journalists** uncover hidden donor relationships
- **Researchers** analyze political science data
- **Citizens** make informed voting decisions
- **Advocacy groups** track politician actions
- **Campaigns** conduct opposition research

---

## Future Enhancements

- Mobile app (React Native)
- Email alerts for politician activity
- State legislature data (all 50 states)
- Machine learning predictions for vote outcomes
- Public API for third-party developers

---

## Contributing

We welcome contributions! To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Submit a Pull Request

**Areas we need help:**
- Data engineering and ETL pipelines
- UI/UX design improvements
- Accessibility features
- Test coverage
- Documentation

---

## License

MIT License - see [LICENSE](LICENSE) file for details
