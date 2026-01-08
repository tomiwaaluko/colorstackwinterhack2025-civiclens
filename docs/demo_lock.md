# Demo Dataset Lock

## Overview

This document describes the demo dataset freeze point and version control strategy for CivicLens demo data.

## Demo Dataset Purpose

The demo dataset provides:
- **Offline functionality**: Works without API access
- **Consistent testing**: Same data for all tests/demos
- **Quick setup**: Easy deployment without data ingestion
- **Privacy**: No real-world data concerns

## Demo Dataset Contents

### Current Demo Data (Version 1.0)

**Politicians**: 6
- Joe Biden (DE, Senator, Democrat)
- Kamala Harris (CA, Senator, Democrat)
- Mitch McConnell (KY, Senator, Republican)
- Nancy Pelosi (CA, Representative, Democrat)
- Kevin McCarthy (CA, Representative, Republican)
- Alexandria Ocasio-Cortez (NY, Representative, Democrat)

**Bills**: 10
- Topics: Healthcare, Energy, Technology, Finance, etc.
- Linked to votes

**Votes**: 30+
- Date range: 2022-2024
- All linked to bills and politicians

**Statements**: 21
- With dates for timeline visualization

**Donations**: 32+
- 15+ states represented
- 10+ donor categories
- Date range: 2022-2024

**Sources**: All records linked to sources
- Demo source URLs
- Proper provenance tracking

### Data Files

1. **`backend/data/demo_seed_complete.sql`**
   - Main comprehensive seed file
   - Includes: Politicians, Bills, Votes, Statements, Sources

2. **`backend/data/demo_seed_donations.sql`**
   - Donation data seed
   - Can be run separately or included in complete seed

## Freeze Point

**Lock Date**: 2024-01-15

**Version**: 1.0

**Status**: ✅ Locked

## Version Control Strategy

### Versioning Format

`MAJOR.MINOR.PATCH`
- **MAJOR**: Schema changes requiring migrations
- **MINOR**: New data or significant additions
- **PATCH**: Bug fixes or data corrections

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-15 | Initial demo dataset lock |

### Versioning Rules

1. **Major Version (2.0)**: Requires schema changes
   - Add new tables
   - Modify existing table structure
   - Breaking changes

2. **Minor Version (1.1)**: Additions only
   - New politicians
   - New bills/votes
   - New statements
   - More donations

3. **Patch Version (1.0.1)**: Fixes only
   - Data corrections
   - Bug fixes
   - Typo corrections

## Demo Data Updates

### When to Update

**Do Update**:
- Fix data errors
- Correct typos
- Fix broken relationships
- Update demo data documentation

**Don't Update**:
- Add real-world politicians (use separate dataset)
- Change demo data arbitrarily
- Break existing relationships
- Remove demo data without migration path

### Update Procedure

1. **Create Branch**: `demo-data-v1.1` (example)
2. **Update SQL Files**: Modify seed files
3. **Test**: Verify data loads correctly
4. **Update Documentation**: Update this file
5. **Create Pull Request**: Review and merge
6. **Tag Release**: `git tag demo-data-v1.1`

### Testing Updates

Before updating demo data:

```bash
# 1. Load updated data
psql $DATABASE_URL -f backend/data/demo_seed_complete.sql

# 2. Verify data
python backend/scripts/verify_demo_data.py

# 3. Run QC checks
python backend/scripts/data_qc.py

# 4. Test frontend
# Ensure all visualizations work with updated data
```

## Demo Mode

### Backend Demo Mode

Set `DEMO_MODE=true` in `backend/.env`:
```bash
DEMO_MODE=true
DATABASE_URL=postgresql://...
```

Backend will use demo seed data from database.

### Frontend Demo Mode

Set `NEXT_PUBLIC_DEMO_MODE=true` in `frontend/.env.local`:
```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Frontend will use offline demo data (no API calls).

## Demo Data Integrity

### Checksums

Consider adding checksums for demo data files:

```bash
# Generate checksums
sha256sum backend/data/demo_seed_complete.sql > demo_seed_complete.sql.sha256
sha256sum backend/data/demo_seed_donations.sql > demo_seed_donations.sql.sha256

# Verify checksums
sha256sum -c demo_seed_complete.sql.sha256
```

### Validation

Run validation after loading demo data:
```bash
python backend/scripts/verify_demo_data.py
```

Expected output:
```
✅ All verification checks passed!
   Demo data is ready for visualization testing.
```

## Migration Between Versions

### Upgrading Demo Data

1. **Backup Current Data**:
   ```bash
   pg_dump $DATABASE_URL > backup_before_upgrade.sql
   ```

2. **Run New Seed File**:
   ```bash
   psql $DATABASE_URL -f backend/data/demo_seed_complete_v1.1.sql
   ```

3. **Verify**:
   ```bash
   python backend/scripts/verify_demo_data.py
   ```

4. **Rollback if Needed**:
   ```bash
   psql $DATABASE_URL < backup_before_upgrade.sql
   ```

### Downgrading Demo Data

1. **Backup Current Data**
2. **Load Previous Version Seed File**
3. **Verify Data**
4. **Test Functionality**

## Demo Data Best Practices

### Keep It Small
- Demo data should be minimal but complete
- Enough to test all features
- Not overwhelming for users

### Keep It Stable
- Don't change demo data frequently
- Document all changes
- Version control all updates

### Keep It Representative
- Include diverse examples
- Cover all use cases
- Realistic data patterns

### Keep It Clean
- No real-world privacy concerns
- No sensitive information
- Clearly marked as demo data

## Demo Data Location

- **SQL Files**: `backend/data/`
- **Documentation**: `docs/demo_data_scope.md`
- **Verification**: `backend/scripts/verify_demo_data.py`

## Future Enhancements

- [ ] Automated version checking
- [ ] Demo data diff tool
- [ ] Demo data generator
- [ ] Version migration scripts
- [ ] Demo data registry

## Related Files

- Demo Data: `backend/data/demo_seed_complete.sql`
- Documentation: `docs/demo_data_scope.md`
- Verification: `backend/scripts/verify_demo_data.py`
- Environment Setup: `docs/environment_setup.md`

