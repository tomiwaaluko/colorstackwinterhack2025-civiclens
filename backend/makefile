.PHONY: install run dev test clean

# Install dependencies
install:
	pip install -r requirements.txt

# Run the server in production mode
run:
	uvicorn main:app --host 0.0.0.0 --port 8000

# Run the server in development mode with auto-reload
dev:
	uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run tests (placeholder for now)
test:
	@echo "Tests not yet implemented"

# Clean Python cache files
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete