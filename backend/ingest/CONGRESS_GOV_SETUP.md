# Congress.gov API Setup Guide

## Why Congress.gov Instead of ProPublica?

ProPublica's Congress API was **deprecated in 2025** and is no longer available. The official **Congress.gov API** is now the recommended source for U.S. Congressional data.

## Getting Your FREE API Key (Takes 2 Minutes)

### Step 1: Sign Up
Visit: **https://api.congress.gov/sign-up/**

Fill out the form:
- **First Name**: Your first name
- **Last Name**: Your last name
- **Email**: Your email address
- **Organization**: Your company/project name (can be "Personal Project")
- **Use Case**: Select "Research/Education" or "Application Development"

### Step 2: Check Your Email
You'll receive an API key instantly via email. It looks like:
```
abcdefgh-1234-5678-90ab-cdef12345678
```

### Step 3: Add to Your .env File
```bash
cd /Users/aridsondez/Desktop/colorstackwinterhack2025-civiclens/backend

# Add the API key to your .env file
echo "CONGRESS_GOV_API_KEY=your_key_here" >> .env
```

## Verify It Works

```bash
cd /Users/aridsondez/Desktop/colorstackwinterhack2025-civiclens/backend/ingest

# Test with a simple check
python populate_politician_data.py --check-only
```

If you see database stats without API key errors, you're all set!

## What Data You'll Get

The Congress.gov API provides:

### ✅ Members of Congress
- Names, parties, states, districts
- Current and historical members
- Committee assignments

### ✅ Bills & Legislation
- House Bills (HR), Senate Bills (S)
- Resolutions, Joint Resolutions
- Bill titles, summaries, status
- Sponsors and cosponsors

### ✅ Votes & Roll Calls
- Individual member votes (Yes/No/Abstain/Not Voting)
- Vote dates and outcomes
- Associated bills for each vote

### ✅ Committees & Hearings
- Committee rosters
- Subcommittees
- Hearing schedules

## Rate Limits

### Free Tier
- **1,000 requests per hour**
- **10,000 requests per day**
- Automatic rate limiting in our scripts

### Higher Limits
- Contact api@loc.gov for increased limits
- Free for educational/research use
- Higher limits available for verified applications

## Usage Examples

### Populate Everything
```bash
# Get 100 bills with votes (recommended for testing)
python populate_politician_data.py --populate-all --max-bills 100

# This fetches:
# - ~750 bills (3 pages × 250 per page)
# - Associated vote data for each bill
# - Member information
# - Sample statements
```

### Members Only
```bash
# Just get current Congress members
python congress_gov_ingest.py --congress 118 --chamber both --members-only
```

### Bills Only
```bash
# Get House bills
python congress_gov_ingest.py --congress 118 --chamber house --bills-only --max-pages 5

# Get Senate bills
python congress_gov_ingest.py --congress 118 --chamber senate --bills-only --max-pages 5
```

## What About Historical Data?

You can fetch data from previous Congresses:

```bash
# 117th Congress (2021-2022)
python populate_politician_data.py --votes-only --congress 117

# 116th Congress (2019-2020)
python populate_politician_data.py --votes-only --congress 116
```

Current Congress numbers:
- **118th** (2023-2024) - Current
- **117th** (2021-2022)
- **116th** (2019-2020)
- **115th** (2017-2018)

## Troubleshooting

### "Invalid API key"
- Double-check the key in your .env file
- Make sure there are no extra spaces
- Try requesting a new key

### "Rate limited"
- Wait 1 hour and try again
- Reduce `--max-bills` value
- Scripts automatically retry after rate limits

### "No data returned"
- Check if your Congress number is correct (default: 118)
- Verify the chamber name (house/senate/both)
- Check the logs: `congress_gov_ingest.log`

## API Documentation

Official docs: https://github.com/LibraryOfCongress/api.congress.gov/

Key endpoints we use:
- `/member` - Members of Congress
- `/bill/{congress}/{billType}` - Bills and legislation
- `/vote/{congress}/{chamber}` - Roll call votes

## Comparison: Congress.gov vs ProPublica

| Feature | Congress.gov | ProPublica (Deprecated) |
|---------|--------------|------------------------|
| Status | ✅ Active | ❌ Shutdown (2025) |
| Cost | FREE | Was FREE |
| Rate Limit | 1,000/hour | Was 1,000/hour |
| Data Coverage | 1973-Present | Was recent Congresses only |
| Official | ✅ U.S. Government | Third-party |
| Documentation | Excellent | Was good |

## Next Steps

1. ✅ Get your API key: https://api.congress.gov/sign-up/
2. ✅ Add to .env file
3. ✅ Run quick populate script
4. ✅ Check your database for new data

```bash
# Quick start
cd backend/ingest
./quick_populate.sh
```

Choose option 6 for a quick test run!
