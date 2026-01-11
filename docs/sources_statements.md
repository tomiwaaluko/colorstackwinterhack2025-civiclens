# Statements Ingestion Source Documentation

## Overview

The Statements Ingestion system allows for curated ingestion of official statements from politicians with reliable citations. This supports multiple sources including official websites, press releases, and transcripts.

## Approach

**Curated and Quality-Focused**:
- This system is designed for curated, high-quality statement collections suitable for demo and production use
- Only official pages (press releases, transcripts)
- Manual review recommended for quality control
- Focus on verifiable, authoritative sources

## Supported Sources

### 1. Official Websites
- Politician's official website
- Press release sections
- News/statements pages

### 2. Government Sources
- Congressional press releases
- Official transcripts
- Government websites

### 3. Manual Entry
- Curated statements with direct text input
- Useful for quality control and verification

## Data Captured

### Statement Fields
- **Text**: Clean, extracted text from source
- **Date**: Publication or statement date
- **Politician ID**: Links to politicians table
- **Source URL**: Original source URL
- **Publisher**: Source organization
- **Title**: Statement title

### Provenance
- **Source URL**: Original statement URL
- **Publisher**: Source organization name
- **Source Type**: "statement"
- **Raw Text**: Full HTML or original text
- **Retrieved At**: Timestamp of ingestion

## Ingestion Methods

### 1. From URL (Automatic)

Automatically fetches and parses statements from URLs:

```bash
python backend/ingest/statements_ingest.py \
  --url "https://example.com/press-release" \
  --politician "Joe Biden" \
  --publisher "Official Website" \
  --title "Press Release Title" \
  --date "2024-01-15"
```

### 2. From JSON File (Batch)

Process multiple statements from a curated JSON file:

```json
[
  {
    "politician_name": "Joe Biden",
    "url": "https://example.com/statement1",
    "publisher": "Official Website",
    "title": "Statement on Climate Change",
    "date": "2024-01-15"
  },
  {
    "politician_name": "Kamala Harris",
    "url": "https://example.com/statement2",
    "publisher": "Senate Website",
    "title": "Remarks on Healthcare",
    "date": "2024-02-20"
  }
]
```

Usage:
```bash
python backend/ingest/statements_ingest.py --json-file statements.json
```

### 3. Manual Entry

Direct text input for maximum control:

```bash
python backend/ingest/statements_ingest.py \
  --text "Full statement text here..." \
  --url "https://example.com/source" \
  --politician "Joe Biden" \
  --publisher "Manual Entry" \
  --title "Statement Title" \
  --date "2024-01-15"
```

## Text Extraction

### HTML Content
- Uses BeautifulSoup4 for HTML parsing (recommended dependency)
- Falls back to regex-based extraction if BeautifulSoup4 is unavailable
- Removes scripts, styles, and unnecessary markup
- Preserves paragraph structure where possible

### Date Extraction
- Attempts to extract dates from:
  - Statement text (multiple formats)
  - URL patterns (YYYY/MM/DD)
  - Metadata tags
- Common date formats supported:
  - YYYY-MM-DD
  - MM/DD/YYYY
  - "Month Day, Year" (e.g., "January 15, 2024")

### PDF Support
- PDF handling requires additional libraries (pdfplumber, PyPDF2)
- Currently logs warning for PDF content
- Future enhancement: Full PDF text extraction

## Data Quality

### Validation
- Politician must exist in database
- Text must not be empty
- URLs must be valid and accessible
- Dates are validated when provided

### Quality Control
- **Manual Review Recommended**: Review extracted text for accuracy
- **Source Verification**: Verify URLs are official and authoritative
- **Date Verification**: Confirm dates match statement content
- **Text Cleanup**: May require manual cleanup of extracted text

## Error Handling

The ingestion script includes:
- **URL Fetching**: Timeout and retry logic
- **HTML Parsing**: Graceful degradation if libraries unavailable
- **Date Parsing**: Multiple format attempts with fallbacks
- **Transaction Rollback**: Database rollback on failure
- **Individual Record Handling**: Continue processing if one record fails
- **Logging**: Detailed logs to `statements_ingest.log`

## Best Practices

### Source Selection
1. **Official Sources Only**: Use official websites and government sources
2. **Verifiable URLs**: Ensure URLs are stable and will persist
3. **Authoritative Publishers**: Use known, credible sources
4. **Complete Statements**: Avoid snippets or partial quotes

### Date Handling
1. **Use Publication Date**: Use the date the statement was published
2. **Be Consistent**: Use consistent date formats
3. **Verify Dates**: Cross-reference dates when possible

### Text Quality
1. **Review Extracted Text**: Always review automatically extracted text
2. **Clean Up Formatting**: Remove extra whitespace and formatting artifacts
3. **Preserve Meaning**: Ensure extracted text preserves original meaning
4. **Handle Special Characters**: Ensure proper encoding

## Security Considerations

When using URL-based ingestion (the `--url` flag with `backend/ingest/statements_ingest.py`), implement the following security measures:

### URL Validation and Domain Whitelisting
- **Require URL validation**: Validate all URLs before fetching
- **Domain whitelisting**: Restrict to official government/politician domains (e.g., `.gov`, `.house.gov`, `.senate.gov`, official politician websites)
- **URL format validation**: Ensure URLs use `http://` or `https://` protocols only

### SSRF Prevention
- **Validate and sanitize URLs**: Reject URLs with internal IP ranges (127.0.0.1, 10.x.x.x, 192.168.x.x, etc.)
- **Resolve hosts**: Check resolved IP addresses and block internal/private ranges
- **Block file:// and other dangerous protocols**: Only allow http/https

### Operational Controls
- **Rate limiting**: Configure rate limits to prevent abuse (e.g., max requests per minute)
- **Polite request headers**: Use custom User-Agent identifying your application (e.g., 'CivicLens/1.0 (Educational/Research)')
- **Inter-request delays**: Add delays between requests to be respectful to servers
- **Exponential backoff**: Implement retry logic with exponential backoff for transient failures
- **Error handling and logging**: Log all URL fetch attempts, failures, and suspicious patterns
- **Feature flags**: Provide configuration settings to disable remote fetching entirely if needed

### Configuration
These behaviors can be configured via environment variables or configuration files used by `statements_ingest.py`. Check the script's configuration section for:
- `ALLOWED_DOMAINS`: List of allowed domain patterns
- `RATE_LIMIT_DELAY`: Delay between requests (seconds)
- `MAX_RETRIES`: Maximum retry attempts
- `ENABLE_REMOTE_FETCH`: Feature flag to enable/disable URL fetching

## Demo Mode Compatibility

The ingestion script works with demo mode. Demo statements can be loaded separately via SQL seed files without requiring URL access.

## Example JSON File Format

```json
[
  {
    "politician_name": "Joe Biden",
    "url": "https://www.whitehouse.gov/briefing-room/statements-releases/2024/01/15/statement-on-climate/",
    "publisher": "White House",
    "title": "Statement on Climate Change Action",
    "date": "2024-01-15"
  },
  {
    "politician_name": "Nancy Pelosi",
    "url": "https://pelosi.house.gov/news/press-releases/statement-on-healthcare",
    "publisher": "House of Representatives",
    "title": "Statement on Healthcare Legislation",
    "date": "2024-02-10"
  }
]
```

## Future Enhancements

- [ ] PDF text extraction support
- [ ] Automated statement discovery
- [ ] Sentiment analysis integration
- [ ] Topic categorization
- [ ] Duplicate detection
- [ ] Statement clustering
- [ ] Video transcript support
- [ ] Multi-language support

## Dependencies

```bash
pip install requests psycopg2-binary python-dotenv beautifulsoup4 html2text
```

Optional (for PDF support):
```bash
pip install pdfplumber  # or PyPDF2
```

## Related Files

- Ingestion Script: `backend/ingest/statements_ingest.py`
- Schema Definition: `docs/schema.md`
- Demo Data: `backend/data/demo_seed_complete.sql`

**Note on `backend/data/demo_seed_complete.sql`**: This seed file contains demo statements that can be loaded to populate the database for local testing. This allows you to run the ingestion demo without needing live URL access. The seed file can be applied via the project DB seed routine or a provided SQL client. Use this when setting up a local development environment or testing the statements ingestion functionality without fetching from external URLs.

