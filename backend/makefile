.PHONY: install run dev test clean db-test api-test populate help

# Detect OS and set virtual environment paths
ifeq ($(OS),Windows_NT)
	VENV_BIN = .venv/Scripts
	PYTHON = $(VENV_BIN)/python.exe
	PIP = $(VENV_BIN)/pip.exe
else
	VENV_BIN = .venv/bin
	PYTHON = $(VENV_BIN)/python
	PIP = $(VENV_BIN)/pip
endif

# Default target - show help
help:
	@echo "CivicLens Backend - Available Commands:"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install        - Install Python dependencies"
	@echo ""
	@echo "Run Application:"
	@echo "  make run            - Run the backend API server (production mode)"
	@echo "  make dev            - Run the backend API server with hot reload (development mode)"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run all tests"
	@echo "  make db-test        - Test database connection"
	@echo "  make api-test       - Test API endpoints"
	@echo ""
	@echo "Database:"
	@echo "  make populate       - Populate database with politician data"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean          - Remove Python cache files"
	@echo ""

# Install dependencies
install:
	$(PIP) install -r requirements.txt

# Run backend server in production mode
run:
	$(VENV_BIN)/uvicorn app.main:app --host 0.0.0.0 --port 8000

# Run backend server in development mode with auto-reload
dev:
	$(VENV_BIN)/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run all tests
test:
	$(VENV_BIN)/pytest tests/ -v

# Test database connection
db-test:
	$(PYTHON) test_db_connection.py

# Test API endpoints
api-test:
	$(PYTHON) test_api_endpoints.py

# Populate database with politician data
populate:
	$(PYTHON) populate_database.py

# Clean Python cache files
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +