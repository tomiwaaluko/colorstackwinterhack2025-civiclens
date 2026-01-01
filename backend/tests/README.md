# Backend Tests

This directory contains smoke tests for the Civic Lens API.

## Test Coverage

- **test_health.py** - Tests for `/health` endpoint
- **test_search.py** - Tests for `/search` endpoint (5 test cases)
- **test_politicians.py** - Tests for `/politicians/{id}` endpoint (3 test cases)
- **test_compare.py** - Tests for `/compare` endpoint (6 test cases)

## Running Tests

From the `backend/` directory:

```bash
# Run all tests
make test

# Run with more verbose output
pytest tests/ -v

# Run specific test file
pytest tests/test_search.py -v

# Run specific test function
pytest tests/test_search.py::test_search_by_name -v
```

## Test Requirements

Tests use:
- `pytest` - Testing framework
- `httpx` - HTTP client for FastAPI TestClient
- `fastapi.testclient.TestClient` - FastAPI's built-in test client

Install test dependencies with:
```bash
make install
```
