# Manual Data Curation - Quick Start

## What We're Doing

✅ **Manual data entry** - Copy/paste content from trusted websites  
✅ **No web scraping** - You control what goes in  
✅ **Same AI features** - Still uses embeddings and semantic search  
✅ **Better quality** - Curated, verified information  

## Schema (Already Created!)

Your database already has the right structure:

**rag_sources table:**
- `id` - Unique identifier
- `source_url` - Where you got the content
- `title` - Content title
- `publisher` - Who published it
- `full_text` - The actual content
- `source_type` - Type (gov_website, official_document, etc.)
- `topics` - Array of topic tags
- `credibility_score` - 0-1 trustworthiness score

**rag_chunks table:**
- `source_id` - Links to rag_sources
- `text` - Chunk of text (~500 chars)
- `embedding` - Vector embedding (768 dimensions)
- `chunk_index` - Position in document

## Quick Start (3 Steps)

### 1. Add Your First Sources

```powershell
cd backend
python scripts/add_manual_source.py
```

This adds 3 example sources about:
- Congress.gov
- GovTrack.us  
- How laws are made

### 2. Test It Works

1. Go to http://localhost:3000/ask
2. Ask: **"How are laws made in Congress?"**
3. Check the citations - should show `database` sources!

### 3. Add More Content

Edit [scripts/add_manual_source.py](scripts/add_manual_source.py) and add more to the `sources` list:

```python
{
    "url": "https://www.congress.gov/legislative-process",
    "title": "The Legislative Process",
    "publisher": "U.S. Congress",
    "source_type": "gov_website",
    "topics": ["legislation", "bills"],
    "credibility_score": 1.0,
    "content": """
    YOUR CURATED CONTENT HERE
    
    Copy from the website, clean it up, paste here.
    Remove navigation, ads, etc. Keep only facts.
    """
}
```

## Your Trusted Sources

| Website | Type | Credibility | What to Add |
|---------|------|-------------|-------------|
| congress.gov | Official | 1.0 | Bills, votes, process |
| senate.gov | Official | 1.0 | Senate info |
| house.gov | Official | 1.0 | House info |
| usa.gov | Official | 1.0 | General gov info |
| govtrack.us | Tracking | 0.9 | Vote tracking |

## How It Works

1. **You paste content** → Script chunks it into ~500 char pieces
2. **Gemini generates embeddings** → Creates vector representations
3. **Stored in database** → With metadata and topics
4. **User asks question** → AI searches with semantic similarity
5. **Finds relevant chunks** → Returns answer with citations

## Content Tips

### ✅ Good Content
- Official descriptions of processes
- Bill summaries from congress.gov
- How government works
- Legislative procedures
- Official biographies

### ❌ Skip
- Navigation menus
- Ads and promotions
- Social media widgets
- User comments
- Copyright notices

### Best Length
- **Sweet spot**: 1,000 - 3,000 characters
- **Too short**: < 300 chars
- **Too long**: > 10,000 chars (split into multiple sources)

## What Changed (For Reference)

**Removed:**
- ❌ Web scraping with httpx/BeautifulSoup
- ❌ Automatic Wikipedia ingestion
- ❌ fetch_webpage_content() function
- ❌ ingest_example_sources.py script

**Kept:**
- ✅ Database schema (rag_sources, rag_chunks)
- ✅ Embedding generation (Gemini)
- ✅ Text chunking utilities
- ✅ QA endpoint with database search
- ✅ Frontend citation display
- ✅ Manual source addition script

## Files You'll Use

| File | Purpose |
|------|---------|
| [scripts/add_manual_source.py](scripts/add_manual_source.py) | Main script to add sources |
| [ingest/web_content_ingest.py](ingest/web_content_ingest.py) | Utilities (chunk, embed) |
| [DATA_CURATION_GUIDE.md](DATA_CURATION_GUIDE.md) | Detailed guide |
| [migrations/0009_add_rag_sources_and_chunks.sql](migrations/0009_add_rag_sources_and_chunks.sql) | Database schema |

## Next Steps

1. ✅ Run `python scripts/add_manual_source.py`
2. ✅ Test at http://localhost:3000/ask
3. 📝 Pick 5-10 important pages from congress.gov
4. 📄 Copy/paste their content into the script
5. 💾 Run the script again
6. 🧪 Test with questions
7. 🔄 Repeat!

## Common Questions

**Q: How many sources should I add?**  
A: Start with 10-20 key pages. Add more based on what questions users ask.

**Q: Can I update content later?**  
A: Yes! Delete the old source and re-add with updated content.

**Q: What if the AI can't find an answer?**  
A: It falls back to Gemini's general knowledge, but add that topic to your sources!

**Q: Do I need to clean up HTML?**  
A: Yes - copy the text content only, not HTML tags or navigation.

For detailed instructions, see [DATA_CURATION_GUIDE.md](DATA_CURATION_GUIDE.md)
