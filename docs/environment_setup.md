# Environment Configuration Guide

Complete guide for setting up environment variables for CivicLens.

---

## Overview

CivicLens uses environment variables for configuration. These variables control:
- Database connections (PostgreSQL/Supabase)
- Demo/offline mode
- Mapbox integration (optional)
- Redis caching (optional)
- AI features (optional)

---

## Quick Start

1. **Backend**: Copy the template below to `backend/.env`
2. **Frontend**: Copy the template below to `frontend/.env.local`
3. Fill in your actual values
4. Restart your servers

---

## Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# ============================================================================
# Backend Environment Variables
# ============================================================================

# ----------------------------------------------------------------------------
# Database Configuration
# ----------------------------------------------------------------------------
# For Supabase PostgreSQL:
# Get connection string from: Supabase Dashboard > Project Settings > Database
# 
# Option A: Direct Connection (Recommended for development)
# DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
#
# Option B: Connection Pooling (Better for production)
# DATABASE_URL=postgresql+asyncpg://postgres.[YOUR-PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
#
# For local PostgreSQL:
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/civic_lens
#
# For local SQLite (development fallback):
# DATABASE_URL=sqlite+aiosqlite:///./civic_lens.db
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/civic_lens

# ----------------------------------------------------------------------------
# Demo/Offline Mode
# ----------------------------------------------------------------------------
# Set to true to enable demo mode (uses demo seed data, disables external API calls)
# Set to false for production with real data
DEMO_MODE=false

# ----------------------------------------------------------------------------
# Redis Configuration (Optional - for caching)
# ----------------------------------------------------------------------------
# Redis URL for caching aggregation results
# Leave empty if not using Redis caching
# REDIS_URL=redis://localhost:6379
# REDIS_URL=redis://username:password@host:port

# ----------------------------------------------------------------------------
# Gemini AI Configuration (Optional - for AI features)
# ----------------------------------------------------------------------------
# Google Gemini API key for AI-powered features (RAG, Q&A)
# Leave empty if not using AI features
# GEMINI_API_KEY=your_gemini_api_key_here
# GEMINI_EMBEDDING_MODEL=gemini-embedding-001
# RAG_TOP_K=8
# RAG_MIN_SIMILARITY=0.20

# ----------------------------------------------------------------------------
# Application Settings
# ----------------------------------------------------------------------------
# API host and port (default: 0.0.0.0:8000)
# API_HOST=0.0.0.0
# API_PORT=8000

# Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
# LOG_LEVEL=INFO
```

---

## Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory (Next.js auto-loads `.env.local`):

```bash
# ============================================================================
# Frontend Environment Variables
# ============================================================================
# Note: All frontend variables must be prefixed with NEXT_PUBLIC_ to be available in browser

# ----------------------------------------------------------------------------
# API Configuration
# ----------------------------------------------------------------------------
# Backend API base URL
# Default: http://localhost:8000
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# ----------------------------------------------------------------------------
# Demo/Offline Mode
# ----------------------------------------------------------------------------
# Set to true to enable demo mode (uses offline demo data, no API calls)
# Set to false to connect to backend API
NEXT_PUBLIC_DEMO_MODE=false

# ----------------------------------------------------------------------------
# Mapbox Configuration (Optional - for map visualizations)
# ----------------------------------------------------------------------------
# Mapbox access token for interactive maps
# Get your token from: https://account.mapbox.com/access-tokens/
# Leave empty if using Leaflet (offline) instead of Mapbox
# NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNycXh4eHh4eDB4MDAycG84eHh4eHh4eHh4In0.example_token_here

# ----------------------------------------------------------------------------
# Application Settings
# ----------------------------------------------------------------------------
# App name and description (for SEO, meta tags)
# NEXT_PUBLIC_APP_NAME=CivicLens
# NEXT_PUBLIC_APP_DESCRIPTION=Transparent political data and visualizations

# ----------------------------------------------------------------------------
# Feature Flags (Optional)
# ----------------------------------------------------------------------------
# Enable/disable specific features
# NEXT_PUBLIC_ENABLE_AI_FEATURES=true
# NEXT_PUBLIC_ENABLE_VISUALIZATIONS=true
```

---

## Variable Reference

### Backend Variables

#### `DATABASE_URL` (Required)
- **Description**: PostgreSQL database connection string
- **Format**: `postgresql+asyncpg://user:password@host:port/database`
- **Default**: `sqlite+aiosqlite:///./civic_lens.db` (SQLite fallback)
- **Example**: `postgresql+asyncpg://postgres:password@localhost:5432/civic_lens`
- **Supabase**: Get from Project Settings > Database > Connection String

#### `DEMO_MODE` (Optional)
- **Description**: Enable demo/offline mode
- **Values**: `true` | `false`
- **Default**: `false`
- **Behavior**: When `true`, uses demo seed data and disables external API calls

#### `REDIS_URL` (Optional)
- **Description**: Redis connection URL for caching
- **Format**: `redis://host:port` or `redis://username:password@host:port`
- **Default**: `None` (caching disabled)
- **Example**: `redis://localhost:6379`

#### `GEMINI_API_KEY` (Optional)
- **Description**: Google Gemini API key for AI features
- **Required**: Only if using AI features (RAG, Q&A)
- **Get**: https://makersuite.google.com/app/apikey

#### `GEMINI_EMBEDDING_MODEL` (Optional)
- **Description**: Gemini embedding model name
- **Default**: `gemini-embedding-001`

#### `RAG_TOP_K` (Optional)
- **Description**: Number of top chunks to retrieve for RAG
- **Default**: `8`

#### `RAG_MIN_SIMILARITY` (Optional)
- **Description**: Minimum similarity threshold for RAG retrieval
- **Default**: `0.20`

#### `API_HOST` (Optional)
- **Description**: API server host
- **Default**: `0.0.0.0`

#### `API_PORT` (Optional)
- **Description**: API server port
- **Default**: `8000`

#### `LOG_LEVEL` (Optional)
- **Description**: Logging level
- **Values**: `DEBUG` | `INFO` | `WARNING` | `ERROR` | `CRITICAL`
- **Default**: `INFO`

---

### Frontend Variables

**Important**: All frontend environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

#### `NEXT_PUBLIC_API_URL` (Optional)
- **Description**: Backend API base URL
- **Default**: `http://localhost:8000`
- **Example**: `https://api.yourdomain.com`

#### `NEXT_PUBLIC_DEMO_MODE` (Optional)
- **Description**: Enable demo/offline mode in frontend
- **Values**: `true` | `false`
- **Default**: `false`
- **Behavior**: When `true`, uses offline demo data instead of API calls

#### `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (Optional)
- **Description**: Mapbox access token for map visualizations
- **Required**: Only if using Mapbox (instead of Leaflet)
- **Get**: https://account.mapbox.com/access-tokens/
- **Format**: `pk.eyJ1...`

#### `NEXT_PUBLIC_APP_NAME` (Optional)
- **Description**: Application name for SEO
- **Default**: `CivicLens`

#### `NEXT_PUBLIC_APP_DESCRIPTION` (Optional)
- **Description**: Application description for SEO
- **Default**: `Transparent political data and visualizations`

---

## Getting Your Supabase Connection String

### Step 1: Access Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project

### Step 2: Get Connection String

1. Navigate to **Project Settings** > **Database**
2. Find the **Connection String** section
3. Choose one of the following:

#### Option A: Direct Connection (Recommended for Development)

- Select "Connection string" > "URI"
- Copy the connection string
- It will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`
- **Important**: Replace `postgresql://` with `postgresql+asyncpg://` for SQLAlchemy async
- Final format: `postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`

#### Option B: Connection Pooling (Better for Production)

- Use the "Session" mode connection pooler
- Format: `postgresql+asyncpg://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
- **Note**: Port `6543` indicates connection pooling

### Step 3: Add to `.env` File

Paste the connection string into your `backend/.env` file:

```bash
DATABASE_URL=postgresql+asyncpg://postgres:your_password_here@db.xxx.supabase.co:5432/postgres
```

---

## Getting Your Mapbox Access Token

### Step 1: Create Mapbox Account

1. Go to https://account.mapbox.com/
2. Sign up or log in

### Step 2: Get Access Token

1. Navigate to **Access tokens** section
2. Copy your default public token (starts with `pk.eyJ1...`)
3. Or create a new token with custom scopes

### Step 3: Add to Frontend `.env.local`

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNycXh4eHh4eDB4MDAycG84eHh4eHh4eHh4In0.example_token
```

**Note**: Mapbox is optional. If you leave this empty, the app will use Leaflet (offline) for maps.

---

## Demo Mode

### Backend Demo Mode

When `DEMO_MODE=true` in `backend/.env`:
- Uses demo seed data from database
- Disables external API calls (OpenSecrets, etc.)
- All data comes from seeded database

### Frontend Demo Mode

When `NEXT_PUBLIC_DEMO_MODE=true` in `frontend/.env.local`:
- Uses offline demo data (no API calls)
- Works without backend server
- Perfect for development/demo

### Using Demo Mode

**For development:**
```bash
# Backend .env
DEMO_MODE=true

# Frontend .env.local
NEXT_PUBLIC_DEMO_MODE=true
```

**For production:**
```bash
# Backend .env
DEMO_MODE=false

# Frontend .env.local
NEXT_PUBLIC_DEMO_MODE=false
```

---

## Environment File Locations

### Backend

- **File**: `backend/.env`
- **Git**: Already in `.gitignore` (do not commit)
- **Template**: See `backend/ENV_SETUP.md` or `backend/.env.example` (if created)

### Frontend

- **File**: `frontend/.env.local`
- **Git**: Already in `.gitignore` (do not commit)
- **Template**: See `frontend/.env.example` (if created)
- **Note**: Next.js automatically loads `.env.local`

---

## Verifying Configuration

### Check Backend Environment Variables

```bash
cd backend
python -c "from app.core.config import settings; print('DEMO_MODE:', settings.DEMO_MODE); print('DATABASE_URL:', settings.DATABASE_URL[:50] + '...')"
```

### Check Frontend Environment Variables

```bash
cd frontend
npm run dev
# Check browser console or Network tab to see API calls
```

### Verify Database Connection

```bash
cd backend
python scripts/verify_postgis.py
```

---

## Common Issues

### Issue: "DATABASE_URL not found"

**Solution**: 
- Ensure `backend/.env` exists
- Check that `DATABASE_URL` is set in `.env`
- Verify file is in `backend/` directory

### Issue: "ModuleNotFoundError: No module named 'dotenv'"

**Solution**:
```bash
pip install python-dotenv
```

### Issue: Frontend variables not accessible

**Solution**:
- Ensure variables start with `NEXT_PUBLIC_`
- Restart Next.js dev server
- Check `.env.local` is in `frontend/` directory

### Issue: Mapbox not working

**Solution**:
- Verify `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is set
- Check token is valid (starts with `pk.eyJ1...`)
- App will fallback to Leaflet if token is missing (offline maps)

### Issue: Demo mode not working

**Solution**:
- Backend: Set `DEMO_MODE=true` in `backend/.env`
- Frontend: Set `NEXT_PUBLIC_DEMO_MODE=true` in `frontend/.env.local`
- Restart both servers

---

## Security Best Practices

1. **Never commit `.env` files** (already in `.gitignore`)
2. **Use different credentials** for development and production
3. **Rotate API keys** regularly (especially Mapbox, Gemini)
4. **Use environment-specific configs** (`.env.development`, `.env.production`)
5. **Store production secrets** in secure vaults (AWS Secrets Manager, etc.)
6. **Limit token scopes** (Mapbox tokens should have minimal required permissions)

---

## Production Deployment

### Environment Variables in Production

For production deployments (Vercel, Heroku, AWS, etc.):

1. **Set environment variables** in your deployment platform
2. **Do NOT** commit `.env` files to git
3. **Use secrets management** for sensitive data
4. **Enable connection pooling** (Supabase) for database

### Example: Vercel Deployment

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add all `NEXT_PUBLIC_*` variables
3. Set values for production
4. Redeploy

### Example: Docker Deployment

```dockerfile
# Use environment variables in Dockerfile
ENV DATABASE_URL=postgresql+asyncpg://...
ENV DEMO_MODE=false

# Or use docker-compose.yml
environment:
  - DATABASE_URL=${DATABASE_URL}
  - DEMO_MODE=${DEMO_MODE}
```

---

## Related Documentation

- **Backend Setup**: `backend/ENV_SETUP.md`
- **Database Migration**: `backend/migrations/MIGRATION_INSTRUCTIONS.md`
- **Supabase Setup**: See Supabase documentation
- **Next.js Environment Variables**: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables

---

**Last Updated**: Step 10 Implementation  
**Status**: Complete ✅

