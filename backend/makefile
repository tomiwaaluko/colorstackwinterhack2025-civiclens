.PHONY: install build run dev stop logs shell test db-test api-test populate clean help

# Default target - show help
help:
	@echo "CivicLens Backend - Available Commands:"
	@echo ""
	@echo "Setup & Build:"
	@echo "  make build          - Build Docker image"
	@echo ""
	@echo "Run Application (Docker):"
	@echo "  make run            - Start backend in Docker (detached mode)"
	@echo "  make dev            - Start backend in Docker with logs (foreground)"
	@echo "  make stop           - Stop and remove Docker containers"
	@echo "  make logs           - View Docker container logs"
	@echo "  make shell          - Open shell in Docker container"
	@echo ""
	@echo "Testing (Docker):"
	@echo "  make test           - Run all tests in Docker"
	@echo "  make db-test        - Test database connection in Docker"
	@echo "  make api-test       - Test API endpoints in Docker"
	@echo ""
	@echo "Database (Docker):"
	@echo "  make populate       - Populate database with politician data"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean          - Remove Python cache files"
	@echo ""

# Build Docker image
build:
	@echo "Building Docker image..."
	docker-compose build

# Run backend server in Docker (detached mode)
run:
	@echo "Starting backend in Docker..."
	docker-compose up -d
	@echo "Backend is running at http://localhost:8000"
	@echo "Use 'make logs' to view logs or 'make stop' to stop"

# Run backend server in Docker (foreground with logs)
dev:
	@echo "Starting backend in Docker with logs..."
	docker-compose up

# Stop Docker containers
stop:
	@echo "Stopping Docker containers..."
	docker-compose down

# View Docker logs
logs:
	docker-compose logs -f backend

# Open shell in Docker container
shell:
	docker-compose exec backend /bin/bash

# Run all tests in Docker
test:
	docker-compose exec backend pytest tests/ -v

# Test database connection in Docker
db-test:
	docker-compose exec backend python test_db_connection.py

# Test API endpoints in Docker
api-test:
	docker-compose exec backend python test_api_endpoints.py

# Populate database with politician data in Docker
populate:
	docker-compose exec backend python populate_database.py

# Clean Python cache files
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +