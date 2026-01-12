# RAG Sources & Web Content Integration Guide

## Overview
This guide explains how to add web sources to your CivicLens database for more accurate AI answers with proper citations.

## Database Schema

### Tables Created

#### `rag_sources`
Stores metadata about documents/webpages:
- `source_url`: URL of the source
- `source_type`: Type (wikipedia, gov_website, news_article, etc.)
- `title`: Document title
- `publisher`: Publisher name
- `full_text`: Complete document text
- `politician_ids`: UUIDs of politicians mentioned
- `topics`: Array of topic tags
- `credibility_score`: 0-1 score indicating trustworthiness

#### `rag_chunks`
Stores text chunks with embeddings for semantic search:
- `source_id`: Links to rag_sources
- `text`: Chunk content
- `chunk_index`: Position in document
- `embedding`: Vector embedding (768 dimensions for Gemini)
- `politician_ids`: Politicians mentioned in chunk

## Setup Instructions

### 1. Run Migration

```bash
cd backend

# Connect to your Supabase database
psql $DATABASE_URL -f migrations/0009_add_rag_sources_and_chunks.sql
```

Or in Supabase dashboard:
1. Go to SQL Editor
2. Copy contents of `migrations/0009_add_rag_sources_and_chunks.sql`
3. Run the query

### 2. Install Additional Dependencies

```bash
pip install httpx beautifulsoup4
```

### 3. Ingest Web Sources

Use the `web_content_ingest.py` script:

```python
from ingest.web_content_ingest import ingest_source, get_db_connection

conn = await get_db_connection()

# Ingest a Wikipedia article
await ingest_source(
    conn,
    url="https://en.wikipedia.org/wiki/United_States_Congress",
    source_type="wikipedia",
    topics=["congress", "legislation"],
    credibility_score=0.8
)

# Ingest government website
await ingest_source(
    conn,
    url="https://www.congress.gov/bill/118th-congress/house-bill/1",
    source_type="official_document",
    topics=["legislation", "bills"],
    credibility_score=1.0
)

await conn.close()
```

## Source Types

| Type | Description | Example | Credibility |
|------|-------------|---------|-------------|
| `wikipedia` | Wikipedia articles | en.wikipedia.org | 0.7-0.8 |
| `gov_website` | Official .gov sites | congress.gov, whitehouse.gov | 0.9-1.0 |
| `official_document` | Bills, reports, transcripts | Congress bills, GAO reports | 1.0 |
| `news_article` | News articles | NYT, WSJ, Reuters | 0.6-0.8 |
| `academic_paper` | Research papers | journals, JSTOR | 0.8-0.9 |
| `api_data` | Data from APIs | ProPublica, OpenSecrets | 0.9-1.0 |
| `database` | CivicLens database | Existing data | 1.0 |
| `ai_general` | AI knowledge | No specific source | 0.5-0.7 |

## Frontend Integration

The frontend already handles different source types. The `/ask` page will display:

- **Database sources** → "Sources from CivicLens database"
- **AI general** → "Answer generated from AI's general knowledge"

## Example: Adding Healthcare Sources

```python
import asyncio
from ingest.web_content_ingest import ingest_source, get_db_connection

async def add_healthcare_sources():
    conn = await get_db_connection()
    
    sources = [
        {
            "url": "https://en.wikipedia.org/wiki/Healthcare_in_the_United_States",
            "source_type": "wikipedia",
            "topics": ["healthcare", "policy"],
            "credibility_score": 0.8
        },
        {
            "url": "https://en.wikipedia.org/wiki/Affordable_Care_Act",
            "source_type": "wikipedia",
            "topics": ["healthcare", "aca", "obamacare"],
            "credibility_score": 0.8
        },
        {
            "url": "https://en.wikipedia.org/wiki/Medicare_(United_States)",
            "source_type": "wikipedia",
            "topics": ["healthcare", "medicare", "seniors"],
            "credibility_score": 0.8
        },
        {
            "url": "https://en.wikipedia.org/wiki/Medicaid",
            "source_type": "wikipedia",
            "topics": ["healthcare", "medicaid", "welfare"],
            "credibility_score": 0.8
        }
    ]
    
    for source in sources:
        await ingest_source(conn, **source)
    
    await conn.close()
    print("Healthcare sources added!")

# Run
asyncio.run(add_healthcare_sources())
```

## Recommended Sources to Add

### High Priority (Government/Official)
- 🏛️ **Congress.gov** - Bills, votes, legislation
- 🇺🇸 **Senate.gov** - Senator information and votes
- 🏛️ **House.gov** - Representative information
- 💰 **OpenSecrets.org** - Campaign finance
- 📊 **FEC.gov** - Federal Election Commission data
- 📰 **ProPublica Congress API** - Voting records

### Medium Priority (Wikipedia)
- 📖 US political topics
- 📖 Major legislation (ACA, Infrastructure Act, etc.)
- 📖 Political parties and platforms
- 📖 Government institutions

### Lower Priority (News/Analysis)
- 📰 Major news outlets (NYT, WSJ, Reuters)
- 🎓 Think tanks (Brookings, CATO, etc.)
- 📊 Fact-checking sites (PolitiFact, FactCheck.org)

## Testing

### 1. Check Sources
```sql
SELECT 
    source_type,
    COUNT(*) as source_count,
    COUNT(DISTINCT rc.id) as chunk_count
FROM rag_sources rs
LEFT JOIN rag_chunks rc ON rs.id = rc.source_id
GROUP BY source_type;
```

### 2. Test Semantic Search
```python
# Ask a question that should match your sources
response = await client.post("/api/qa/ask", json={
    "question": "What is the Affordable Care Act?",
    "use_database": True
})

print(response.json())
# Should return sources with source_type="database"
```

### 3. Compare AI vs Database
```python
# Without database
response1 = await client.post("/api/qa/ask", json={
    "question": "What is healthcare policy?",
    "use_database": False
})
# source_type will be "ai_general"

# With database
response2 = await client.post("/api/qa/ask", json={
    "question": "What is healthcare policy?",
    "use_database": True
})
# source_type will be "database" if relevant sources found
```

## Monitoring

### Check Ingestion Status
```sql
-- View recent sources
SELECT title, source_type, created_at
FROM rag_sources
ORDER BY created_at DESC
LIMIT 10;

-- View source statistics
SELECT * FROM rag_source_stats
ORDER BY chunk_count DESC;
```

### Check Embeddings
```sql
-- Verify embeddings are created
SELECT 
    COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embedding,
    COUNT(*) FILTER (WHERE embedding IS NULL) as without_embedding
FROM rag_chunks;
```

## Troubleshooting

### Issue: No sources found in database
- Check if migration ran successfully
- Verify sources were ingested
- Check similarity threshold (default 0.3)

### Issue: Embeddings not working
- Ensure pgvector extension is installed
- Check GEMINI_API_KEY is set
- Verify embedding dimensions match (768 for Gemini)

### Issue: Slow searches
- Ensure HNSW index is created
- Consider using IVFFlat index for faster build time
- Adjust `m` and `ef_construction` parameters

## Next Steps

1. ✅ Run migration
2. ✅ Ingest 10-20 high-quality sources
3. ✅ Test with frontend
4. ✅ Monitor source quality
5. ✅ Add more sources over time
6. 🔄 Set up automated ingestion pipeline
7. 🔄 Implement source refresh/update logic

## Production Considerations

- **Rate limiting**: Be respectful of websites you scrape
- **Caching**: Cache embeddings to avoid regenerating
- **Updates**: Implement logic to refresh stale sources
- **Quality**: Monitor and score source quality
- **Legal**: Ensure you have rights to store/use content
- **Privacy**: Don't store sensitive/personal information
