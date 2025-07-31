# Scholarship System - Professional Development Makefile
.PHONY: help install dev build test clean docker-up docker-down lint format

# Default target
help:
	@echo "🎓 Scholarship System - Development Commands"
	@echo "============================================="
	@echo ""
	@echo "📦 Setup Commands:"
	@echo "  install      Install all dependencies"
	@echo "  clean        Clean all build artifacts and dependencies"
	@echo ""
	@echo "🚀 Development Commands:"
	@echo "  dev          Start development environment"
	@echo "  build        Build all applications"
	@echo "  test         Run all tests"
	@echo "  lint         Run linting for all projects"
	@echo "  format       Format code for all projects"
	@echo ""
	@echo "🐳 Docker Commands:"
	@echo "  docker-up    Start all services with Docker"
	@echo "  docker-down  Stop all Docker services"
	@echo "  docker-logs  View Docker logs"
	@echo ""
	@echo "🧪 Testing Commands:"
	@echo "  test-api     Test backend API only"
	@echo "  test-ui      Test frontend only"
	@echo "  test-e2e     Run end-to-end tests"

# Installation
install:
	@echo "📦 Installing dependencies..."
	@echo "  Backend dependencies..."
	@cd apps/backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt -r requirements-dev.txt
	@echo "  Frontend dependencies..."
	@cd apps/frontend && npm ci
	@echo "✅ All dependencies installed!"

# Development
dev:
	@echo "🚀 Starting development environment..."
	@tools/scripts/start-with-ip.sh

# Building
build:
	@echo "🔨 Building applications..."
	@echo "  Building backend..."
	@cd apps/backend && python -m pytest app/tests --tb=short
	@echo "  Building frontend..."
	@cd apps/frontend && npm run build
	@echo "✅ Build completed!"

# Testing
test:
	@echo "🧪 Running all tests..."
	@tools/scripts/run-tests.sh

test-api:
	@echo "🧪 Testing backend API..."
	@tools/scripts/test-mock-sso.sh api

test-ui:
	@echo "🧪 Testing frontend..."
	@cd apps/frontend && npm test -- --watchAll=false

test-e2e:
	@echo "🧪 Running end-to-end tests..."
	@cd apps/frontend && npm run test:e2e

# Code quality
lint:
	@echo "🔍 Running linters..."
	@cd apps/backend && python -m ruff check .
	@cd apps/frontend && npm run lint

format:
	@echo "✨ Formatting code..."
	@cd apps/backend && python -m ruff format .
	@cd apps/frontend && npm run format

# Docker operations
docker-up:
	@echo "🐳 Starting Docker services..."
	@cd tools/docker && docker-compose up -d

docker-down:
	@echo "🐳 Stopping Docker services..."
	@cd tools/docker && docker-compose down

docker-logs:
	@echo "📋 Docker service logs..."
	@cd tools/docker && docker-compose logs -f

# Cleanup
clean:
	@echo "🧹 Cleaning up..."
	@rm -rf apps/backend/venv
	@rm -rf apps/backend/__pycache__
	@rm -rf apps/backend/.pytest_cache
	@rm -rf apps/frontend/node_modules
	@rm -rf apps/frontend/.next
	@rm -rf apps/frontend/coverage
	@echo "✅ Cleanup completed!"