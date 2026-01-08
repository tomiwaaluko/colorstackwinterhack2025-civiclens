# Chunking Rules Documentation

## Overview

This document describes the chunking strategy for preparing source text for RAG (Retrieval-Augmented Generation). Chunks are stored in the `source_chunks` table. Embeddings are stored in the `embeddings` table only when generated (they are optional and can be skipped using the `--no-embeddings` flag).

## Chunking Strategy

### Target Size
- **Target Chunk Size**: 600 tokens
- **Minimum Chunk Size**: 300 tokens
- **Maximum Chunk Size**: 800 tokens
- **Overlap**: 100 tokens between chunks

### Token Counting
- Uses `tiktoken` with `cl100k_base` encoding (GPT-3.5/4 tokenizer)
- Fallback: Character-based approximation (1 token ≈ 4 characters) if tiktoken unavailable

### Chunking Algorithm

1. **Sentence Splitting**: Split text by sentence boundaries (`.`, `!`, `?`)
2. **Chunk Building**: Build chunks by adding sentences until target size reached
3. **Boundary Respect**: Respect sentence boundaries (don't split mid-sentence)
4. **Overlap**: Include overlap text from previous chunk for context
5. **Minimum Size**: Ensure chunks meet minimum size requirement before finalizing

### Overlap Strategy

- **Purpose**: Maintain context across chunk boundaries
- **Size**: 100 tokens from end of previous chunk
- **Implementation**: Include overlap text at start of new chunk

## Data Storage

### source_chunks Table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| source_id | INTEGER | Foreign key to sources table |
| chunk_text | TEXT | The chunk text |
| chunk_index | INTEGER | Order of chunk in source (0-based) |
| start_offset | INTEGER | Character offset in original text |
| end_offset | INTEGER | Character offset in original text |

**Constraints**:
- `UNIQUE(source_id, chunk_index)`: One chunk per index per source
- Foreign key to `sources(id)` with CASCADE delete

### embeddings Table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| chunk_id | INTEGER | Foreign key to source_chunks table |
| embedding | vector | Vector embedding (dimension varies by model) |
| model_name | TEXT | Embedding model used |
| created_at | TIMESTAMP | Creation timestamp |

**Constraints**:
- `UNIQUE(chunk_id)`: One embedding per chunk
- Foreign key to `source_chunks(id)` with CASCADE delete
- Uses pgvector extension for vector operations

## Embedding Generation

### Model
- **Default**: `gemini-embedding-001` (Google Gemini)
- **Dimension**: Varies by model (dimension is determined by the embedding model used)
- **API**: Google Gen AI Python SDK

**Note**: The embeddings table uses a flexible vector type that accommodates different model dimensions. The actual dimension depends on the embedding model specified in `model_name`.

### Process
1. Generate embedding for each chunk text
2. Store embedding as pgvector type
3. Track model name for versioning

## Chunking Rules

### 1:1 Mapping
- Each source maps to multiple chunks (one-to-many)
- Each chunk maps to exactly one source
- Each chunk maps to exactly one embedding (1:1)

### No Politician Leakage
- Chunks are linked to sources, not directly to politicians
- Politician information extracted from source metadata
- Ensures citation accuracy

### Offset Preservation
- `start_offset` and `end_offset` track character positions
- Enables exact citation extraction
- Supports highlighting in UI

### Chunk Index
- Sequential index starting at 0
- Represents order in original source
- Enables reconstruction of original text

## Usage

### Process All Sources

```bash
python backend/scripts/chunk_sources.py
```

### Process Specific Source

```bash
python backend/scripts/chunk_sources.py --source-id 123
```

### Process by Type

```bash
python backend/scripts/chunk_sources.py --source-type "statement"
```

### Regenerate Chunks

```bash
python backend/scripts/chunk_sources.py --regenerate
```

### Chunks Only (No Embeddings)

```bash
python backend/scripts/chunk_sources.py --no-embeddings
```

**Note**: When using `--no-embeddings`, chunks are created in the `source_chunks` table but no embeddings are generated or stored in the `embeddings` table. This is useful for testing chunking logic or when embeddings are not needed.

## Quality Control

### Chunk Quality Checks
- ✅ Minimum size met (300 tokens)
- ✅ Maximum size not exceeded (800 tokens)
- ✅ Sentence boundaries respected
- ✅ Overlap maintained
- ✅ Offsets accurate

### Embedding Quality Checks
- ✅ Embedding vector matches expected dimension
- ✅ All chunks have embeddings (if enabled)
- ✅ Model name tracked
- ✅ No duplicate embeddings per chunk

## Best Practices

### Chunk Size Tuning
- Adjust `CHUNK_SIZE_TOKENS` based on use case
- Smaller chunks: More precise retrieval, more chunks
- Larger chunks: More context, fewer chunks

### Overlap Tuning
- Adjust `CHUNK_OVERLAP_TOKENS` based on context needs
- More overlap: Better context continuity
- Less overlap: Fewer redundant chunks

### Source Selection
- Only chunk sources with sufficient text (≥100 characters)
- Skip empty or very short sources
- Consider source type when chunking

## Future Enhancements

- [ ] Semantic chunking (topic-based boundaries)
- [ ] Multi-level chunking (hierarchical)
- [ ] Chunk metadata (topic tags, entities)
- [ ] Chunk quality scoring
- [ ] Automatic chunk size optimization
- [ ] Support for code/structured content

## Related Files

- Chunking Script: `backend/scripts/chunk_sources.py`
- Schema Definition: `docs/schema.md`
- Retrieval Code: `backend/app/ai/retrieval.py`

