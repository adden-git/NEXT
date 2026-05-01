# NEXUS Station — Makefile
# Neural EXecution Universal System v2.0.0

.PHONY: help install run dev test lint format docker-build docker-run clean

help:
	@echo "◈ NEXUS Station — Available Commands:"
	@echo "  make install      — Install Python dependencies"
	@echo "  make run          — Start NEXUS Station (production)"
	@echo "  make dev          — Start with auto-reload"
	@echo "  make test         — Run tests"
	@echo "  make lint         — Run linter (ruff)"
	@echo "  make format       — Format code"
	@echo "  make docker-build — Build Docker image"
	@echo "  make docker-run   — Run Docker container"
	@echo "  make clean        — Clean build artifacts"

install:
	pip install -r requirements.txt

run:
	PYTHONPATH=./src python run.py

dev:
	PYTHONPATH=./src uvicorn nexus_core.web.main:app --reload --host 0.0.0.0 --port 5600

test:
	pytest tests/ -v

lint:
	ruff check src/

format:
	ruff format src/

docker-build:
	docker build -t nexus-station:2.0.0 .

docker-run:
	docker run -d -p 5600:5600 --name nexus-station nexus-station:2.0.0

clean:
	rm -rf build/ dist/ *.egg-info __pycache__ .pytest_cache
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
