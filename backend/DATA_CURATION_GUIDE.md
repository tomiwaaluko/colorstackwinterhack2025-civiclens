# Manual Data Curation Guide

## Overview
This guide explains how to manually add curated content from trusted government websites to improve AI accuracy without web scraping.

## Why Manual Curation?

✅ **Higher Quality**: You control exactly what content is stored  
✅ **Better Accuracy**: Curated facts are more reliable than scraped content  
✅ **No Scraping Issues**: Avoid 403 errors, rate limiting, and parsing problems  
✅ **Verified Sources**: Only add content from trusted .gov sites  

## Trusted Sources

### Primary Sources (Credibility: 1.0)
- 🏛️ **congress.gov** - Official legislative information
- 🇺🇸 **usa.gov** - Official U.S. government information
- 📊 **house.gov** - House of Representatives official site
- 📊 **senate.gov** - Senate official site

### Secondary Sources (Credibility: 0.9)
- 📈 **govtrack.us** - Legislative tracking and analysis
- 📊 **ballotpedia.org** - Political information wiki

## How to Add Sources

### Method 1: Using the Python Script (Recommended)

1. **Edit the script**: Open [scripts/add_manual_source.py](scripts/add_manual_source.py)

2. **Add your source** to the `sources` list:

```python
{
    "url": "https://www.congress.gov/your-page",
    "title": "Your Page Title",
    "publisher": "U.S. Congress",
    "source_type": "gov_website",  # or "official_document"
    "topics": ["topic1", "topic2"],
    "credibility_score": 1.0,
    "content": """
    Paste your curated content here.
    
    You can copy/paste from the website and clean it up.
    Remove navigation, ads, and irrelevant sections.
    Keep only the factual content you want the AI to reference.
    """
}
```

3. **Run the script**:
```powershell
python scripts/add_manual_source.py
```

### Method 2: Direct SQL Insert (Advanced)

For quick one-off additions, use Supabase SQL Editor:

```sql
-- 1. Insert the source
INSERT INTO rag_sources (
    source_url, 
    source_type, 
    title, 
    publisher, 
    full_text,
    topics,
    credibility_score,
    retrieved_at
) VALUES (
    'https://www.congress.gov/about',
    'gov_website',
    'About Congress',
    'U.S. Congress',
    'Your content here...',
    ARRAY['congress', 'legislation'],
    1.0,
    NOW()
) RETURNING id;

-- 2. Note the returned ID, then manually add chunks (or use the Python script)
```

## Content Curation Tips

### What to Include ✅
- **Factual information** about government processes
- **Official descriptions** of laws, bills, and legislation
- **Biographical information** about politicians (from official sources)
- **Voting records** and legislative history
- **Committee information** and structure
- **Official government procedures**

### What to Exclude ❌
- Navigation menus and headers
- Advertisements and promotional content
- User comments and discussions
- Social media widgets
- Irrelevant sidebars
- Copyright notices and footers

### Content Length
- **Optimal**: 500-5000 characters per source
- **Too short**: Less than 200 characters won't chunk well
- **Too long**: Over 10,000 characters may be too broad

The script will automatically chunk your content into ~500 character pieces with 50 character overlap for better retrieval.

## Example Workflow

### Adding Congress.gov Content

1. **Visit** https://www.congress.gov/about
2. **Read and understand** the content
3. **Copy the main content** (skip navigation, headers, footers)
4. **Clean up** the text:
   - Remove extra whitespace
   - Fix line breaks
   - Remove "Click here" and navigation text
5. **Paste into script** with metadata:
   ```python
   {
       "url": "https://www.congress.gov/about",
       "title": "About Congress.gov",
       "publisher": "U.S. Congress",
       "source_type": "gov_website",
       "topics": ["congress", "legislation"],
       "credibility_score": 1.0,
       "content": "Your cleaned content..."
   }
   ```
6. **Run**: `python scripts/add_manual_source.py`

## Recommended Topics to Cover

### Legislative Process (Priority 1)
- [ ] How a bill becomes a law
- [ ] Committee system
- [ ] Floor procedures
- [ ] Conference committees
- [ ] Presidential veto and override

### Congress Structure (Priority 2)
- [ ] House of Representatives structure
- [ ] Senate structure
- [ ] Leadership positions
- [ ] Party caucuses
- [ ] Congressional staff

### Member Information (Priority 3)
- [ ] How to contact representatives
- [ ] Member duties and responsibilities
- [ ] Election processes
- [ ] Term limits and terms of office

### Legislation Types (Priority 4)
- [ ] Bills vs. resolutions
- [ ] Public vs. private laws
- [ ] Joint resolutions
- [ ] Concurrent resolutions
- [ ] Simple resolutions

## Source Types

| Type | Description | Example |
|------|-------------|---------|
| `gov_website` | Official .gov site content | congress.gov pages |
| `official_document` | Official government documents | Bill summaries, reports |
| `api_data` | Data from official APIs | ProPublica Congress API |
| `database` | CivicLens database records | Existing politician data |

## Testing Your Sources

After adding sources, test them:

1. **Start the backend**:
   ```powershell
   cd backend
   uvicorn app.main:main --reload
   ```

2. **Go to Ask AI page**: http://localhost:3000/ask

3. **Ask related questions**:
   - "How does Congress work?"
   - "What is the legislative process?"
   - "How are bills passed?"

4. **Check citations**: Should show `source_type: "database"` and include your URL

## Viewing Your Data

### In Supabase Dashboard

```sql
-- View all sources
SELECT 
    title, 
    source_url, 
    source_type,
    credibility_score,
    array_length(topics, 1) as topic_count
FROM rag_sources
ORDER BY retrieved_at DESC;

-- View chunks for a source
SELECT 
    chunk_index,
    LEFT(text, 100) || '...' as preview,
    array_length(politician_ids, 1) as politician_count
FROM rag_chunks
WHERE source_id = 'YOUR-SOURCE-UUID'
ORDER BY chunk_index;

-- Search by topic
SELECT 
    title,
    source_url,
    topics
FROM rag_sources
WHERE 'congress' = ANY(topics);
```

### Check Statistics

```sql
SELECT * FROM rag_source_stats
ORDER BY chunk_count DESC;
```

## Maintenance

### Updating Content

If a source changes:
1. Delete the old source: `DELETE FROM rag_sources WHERE source_url = '...'`
2. Re-add with updated content using the script

### Removing Sources

```sql
-- Delete a source (cascades to chunks)
DELETE FROM rag_sources WHERE id = 'UUID';

-- Or by URL
DELETE FROM rag_sources WHERE source_url = 'https://...';
```

## Batch Import Template

Create a JSON file with multiple sources:

```json
[
  {
    "url": "https://www.congress.gov/page1",
    "title": "Page 1",
    "content": "Content here..."
  },
  {
    "url": "https://www.congress.gov/page2",
    "title": "Page 2",
    "content": "Content here..."
  }
]
```

Then load and process in Python:

```python
import json
import asyncio
from scripts.add_manual_source import add_manual_source

async def import_from_json(filename):
    with open(filename) as f:
        sources = json.load(f)
    
    for source in sources:
        await add_manual_source(**source)

asyncio.run(import_from_json('sources.json'))
```

## Next Steps

1. ✅ Run the example script to add 3 starter sources
2. 📝 Identify 10-20 key pages from congress.gov and usa.gov
3. 📄 Curate and clean the content
4. 💾 Add sources using the script
5. 🧪 Test with relevant questions
6. 📈 Monitor what questions users ask
7. 🔄 Add more sources based on gaps in coverage

## Quality Checklist

Before adding a source, ensure:
- ✅ Content is from a trusted .gov or official source
- ✅ Text is cleaned (no navigation, menus, ads)
- ✅ Topics are relevant and specific
- ✅ Title accurately describes the content
- ✅ Credibility score reflects source trustworthiness
- ✅ Content length is appropriate (500-5000 chars)
- ✅ Text is readable and well-formatted
