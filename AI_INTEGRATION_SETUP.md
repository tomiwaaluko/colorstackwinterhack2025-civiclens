# AI Integration Setup Guide

## Overview
The CivicLens AI feature uses Google's Gemini API to answer questions about politicians and politics. This is a simplified version that works without database integration for quick demos.

## Backend Setup

### 1. Install Dependencies
```powershell
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory:

```env
# Get your API key from: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_actual_api_key_here

# Optional: Gemini model configuration
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

### 3. Start the Backend Server
```powershell
cd backend
uvicorn app.main:app --reload
```

The server will run at `http://localhost:8000`

## Frontend Setup

### 1. Install Dependencies
```powershell
cd frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEMO_MODE=false
```

### 3. Start the Frontend
```powershell
cd frontend
npm run dev
```

The frontend will run at `http://localhost:3000`

## Using the AI Feature

1. Navigate to `http://localhost:3000/ask` in your browser
2. Type your question in the input field
3. Click "Ask Question" or press Enter
4. Wait for the AI-generated response with citations

### Example Questions:
- "What is healthcare policy in the United States?"
- "How does the legislative process work?"
- "What are common political party platforms?"

## API Endpoints

### POST `/api/qa/ask`
Simplified AI Q&A endpoint (no database required)

**Request:**
```json
{
  "question": "What is healthcare policy?",
  "politician_ids": ["optional-id-1", "optional-id-2"]
}
```

**Response:**
```json
{
  "answer": "Healthcare policy in the United States...",
  "claims": [
    {
      "text": "Key claim with evidence",
      "citations": ["gemini-ai-1"],
      "confidence": 0.7
    }
  ],
  "citations": [
    {
      "source_id": "gemini-ai-1",
      "url": "https://ai.google.dev/gemini-api",
      "title": "Gemini AI Response",
      "publisher": "Google AI",
      "retrieved_at": "2026-01-08T00:00:00Z",
      "snippet": "AI-generated response"
    }
  ],
  "limitations": "Demo response without database integration",
  "disclosure": "Always verify information independently"
}
```

## Architecture

```
Frontend (Next.js)
    ↓
API Call to /api/qa/ask
    ↓
Backend FastAPI
    ↓
Gemini AI API
    ↓
Response with Citations
```

## Troubleshooting

### Backend Issues

**"GEMINI_API_KEY not configured"**
- Make sure you've created a `.env` file in the `backend/` directory
- Add your Gemini API key to the file
- Restart the backend server

**Import errors for google.genai**
- Run `pip install -r requirements.txt` again
- Make sure you're using the correct Python environment

**Port 8000 already in use**
- Stop any other processes using port 8000
- Or change the port: `uvicorn app.main:app --port 8001 --reload`

### Frontend Issues

**"Unable to connect to the API"**
- Make sure the backend server is running on port 8000
- Check that `NEXT_PUBLIC_API_URL` in `.env.local` is correct
- Try opening `http://localhost:8000/health` in your browser

**CORS errors**
- The backend should already have CORS configured
- If issues persist, check the FastAPI CORS middleware settings

## Next Steps

For production deployment with full database integration:

1. **Set up PostgreSQL with pgvector** for semantic search
2. **Migrate to `/api/rag/answer`** endpoint for full RAG pipeline
3. **Add guardrails** for content moderation
4. **Implement citation validation** to verify sources
5. **Add caching** for frequently asked questions

See `backend/app/api/rag.py` for the full RAG implementation.

## Testing

Test the backend directly:
```powershell
curl -X POST http://localhost:8000/api/qa/ask `
  -H "Content-Type: application/json" `
  -d '{\"question\": \"What is healthcare policy?\"}'
```

Or use the test script:
```powershell
cd backend/app/ai
python test_gemini.py
```
