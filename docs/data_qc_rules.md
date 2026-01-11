# Data Quality Control Rules

## Overview

This document describes the automated quality control (QC) checks performed on the CivicLens database to ensure data quality and integrity.

## QC Checks

### 1. Missing/Invalid URLs

**Check**: `missing_invalid_url`

**Severity**: Error

**Description**: Checks for sources with missing, empty, or invalid URLs (must start with `http`).

**Fix**: Manual review required - update source records with valid URLs.

---

### 2. Empty Raw Text

**Check**: `empty_raw_text`

**Severity**: Warning

**Description**: Flags sources with empty or very short raw_text (< 50 characters).

**Impact**: Sources without raw_text cannot be chunked for RAG.

**Fix**: Re-fetch or re-ingest source data.

---

### 3. Orphaned Chunks

**Check**: `orphaned_chunk`

**Severity**: Error

**Description**: Chunks that reference non-existent sources (foreign key violation).

**Fix**: Auto-fixable - deletes orphaned chunks.

---

### 4. Orphaned Embeddings

**Check**: `orphaned_embedding`

**Severity**: Error

**Description**: Embeddings that reference non-existent chunks (foreign key violation).

**Fix**: Auto-fixable - deletes orphaned embeddings.

---

### 5. Duplicate Sources

**Check**: `duplicate_source`

**Severity**: Warning

**Description**: Multiple source records with the same URL.

**Impact**: May indicate duplicate ingestion or data quality issue.

**Fix**: Manual review required - consolidate or remove duplicates.

---

### 6. Outdated Sources

**Check**: `outdated_source`

**Severity**: Info (flag only)

**Description**: Sources with `retrieved_at` older than 90 days.

**Purpose**: Identify sources that may need refreshing.

**Fix**: Re-run ingestion to update data.

---

### 7. Missing Required Fields

**Check**: `missing_required_field`

**Severity**: Error

**Description**: Sources missing required fields:
- `title`
- `publisher`
- `source_type`

**Fix**: Manual review required - update source records.

---

### 8. Invalid Foreign Keys

**Check**: `invalid_foreign_key`

**Severity**: Error

**Description**: Records referencing non-existent foreign keys:
- Votes → Politicians
- Votes → Bills
- Donations → Politicians
- Statements → Politicians

**Fix**: Manual review required - either delete invalid records or create missing referenced records.

---

## Usage

### Run All Checks

```bash
python backend/scripts/data_qc.py
```

### Export Report

```bash
python backend/scripts/data_qc.py --export qc_report.json
```

### Apply Fixes (Dry Run)

```bash
python backend/scripts/data_qc.py --fix --dry-run
```

### Apply Fixes (Execute)

```bash
python backend/scripts/data_qc.py --fix
```

## Output Format

### Console Output

- Summary statistics (errors, warnings, info)
- List of issues (first 10 of each severity)
- Detailed descriptions

### JSON Export

```json
{
  "timestamp": "2024-01-15T10:30:00",
  "total_issues": 42,
  "issues": [
    {
      "check_name": "missing_invalid_url",
      "severity": "error",
      "table": "sources",
      "record_id": 123,
      "description": "Invalid or missing URL: ...",
      "fixable": false,
      "fix_sql": null
    }
  ]
}
```

## Severity Levels

### Error
Critical issues that break functionality or violate data integrity. Should be fixed immediately.

### Warning
Issues that may cause problems but don't break functionality. Should be reviewed and fixed.

### Info
Informational flags that don't indicate problems but may be useful for maintenance (e.g., outdated sources).

## Auto-Fixable Issues

The following issues can be automatically fixed:
- Orphaned chunks (deleted)
- Orphaned embeddings (deleted)

**Note**: Auto-fixes are applied with `--fix` flag (use `--dry-run` to preview first).

## Best Practices

### Regular QC Runs
- Run QC checks after data ingestion
- Run QC checks before deployments
- Schedule regular QC runs (e.g., weekly)

### Fix Prioritization
1. Fix errors first (critical)
2. Address warnings (important)
3. Review info flags (maintenance)

### QC in CI/CD
- Include QC checks in CI/CD pipeline
- Fail builds if errors found (configurable)
- Export reports for tracking

## Future Enhancements

- [ ] Additional validation rules
- [ ] Custom QC rule configuration
- [ ] Integration with monitoring systems
- [ ] Automated notification on errors
- [ ] Data completeness scoring
- [ ] Citation validation
- [ ] URL accessibility checks

## Related Files

- QC Script: `backend/scripts/data_qc.py`
- Schema Definition: `docs/schema.md`

