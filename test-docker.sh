#!/bin/bash

# Scholarship System Docker Test Script
# This script helps you test the entire system using Docker

set -e  # Exit on any error

echo "🎓 Scholarship System Docker Test Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if ports are available
check_ports() {
    local ports=("3000" "8000" "5432" "6379" "9000" "9001")
    for port in "${ports[@]}"; do
        if lsof -i :$port &> /dev/null; then
            print_warning "Port $port is already in use. Please stop the service using this port."
            echo "You can find the process using: lsof -i :$port"
            exit 1
        fi
    done
    print_success "All required ports are available"
}

# Function to build and start services
start_services() {
    print_status "Building and starting services..."
    docker compose -f docker-compose.test.yml up --build -d
    
    print_status "Waiting for services to be healthy..."
    
    # Wait for database
    echo -n "Waiting for PostgreSQL"
    while ! docker exec scholarship_postgres_test pg_isready -U scholarship_user -d scholarship_db &> /dev/null; do
        echo -n "."
        sleep 2
    done
    echo ""
    print_success "PostgreSQL is ready"
    
    # Wait for Redis
    echo -n "Waiting for Redis"
    while ! docker exec scholarship_redis_test redis-cli ping &> /dev/null; do
        echo -n "."
        sleep 2
    done
    echo ""
    print_success "Redis is ready"
    
    # Wait for MinIO
    echo -n "Waiting for MinIO"
    for i in {1..30}; do
        if curl -s http://localhost:9000/minio/health/live &> /dev/null; then
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
    print_success "MinIO is ready"
    
    # Wait for backend
    echo -n "Waiting for Backend API"
    for i in {1..30}; do
        if curl -s http://localhost:8000/health &> /dev/null; then
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
    print_success "Backend API is ready"
    
    # Wait for frontend
    echo -n "Waiting for Frontend"
    for i in {1..30}; do
        if curl -s http://localhost:3000 &> /dev/null; then
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
    print_success "Frontend is ready"
}

# Function to show service status
show_status() {
    echo ""
    print_status "Service Status:"
    docker compose -f docker-compose.test.yml ps
    echo ""
    print_status "Service URLs:"
    echo "📱 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📖 API Docs: http://localhost:8000/docs"
    echo "🗄️ Database: localhost:5432 (scholarship_db)"
    echo "🔄 Redis: localhost:6379"
    echo "📦 MinIO API: http://localhost:9000"
    echo "🎛️ MinIO Console: http://localhost:9001 (minioadmin/minioadmin123)"
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    docker compose -f docker-compose.test.yml down
    print_success "Services stopped"
}

# Function to clean up (remove containers and volumes)
cleanup() {
    print_status "Cleaning up containers and volumes..."
    docker compose -f docker-compose.test.yml down -v --remove-orphans
    docker system prune -f
    print_success "Cleanup completed"
}

# Function to show logs
show_logs() {
    local service=${1:-}
    if [ -z "$service" ]; then
        docker compose -f docker-compose.test.yml logs -f
    else
        docker compose -f docker-compose.test.yml logs -f "$service"
    fi
}

# Function to run database migration
run_migration() {
    print_status "Running database migrations..."
    docker exec scholarship_backend_test alembic upgrade head
    print_success "Database migrations completed"
}

# Function to initialize database with test data
init_db() {
    print_status "Initializing database with test data..."
    docker exec scholarship_backend_test python -m app.core.init_db
    print_success "Database initialization completed"
}

# Function to run tests
run_tests() {
    print_status "Running backend tests..."
    docker exec scholarship_backend_test python -m pytest app/tests/ -v
    print_success "Tests completed"
}

# Main script logic
case "${1:-}" in
    "start")
        check_docker
        check_ports
        start_services
        show_status
        echo ""
        print_success "🎉 All services are running! You can now test the scholarship system."
        print_status "Use './test-docker.sh logs' to view logs"
        print_status "Use './test-docker.sh stop' to stop services"
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        sleep 2
        check_docker
        start_services
        show_status
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "${2:-}"
        ;;
    "cleanup")
        cleanup
        ;;
    "migrate")
        run_migration
        ;;
    "init-db")
        init_db
        ;;
    "test")
        run_tests
        ;;
    "help"|*)
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|cleanup|migrate|init-db|test|help}"
        echo ""
        echo "Commands:"
        echo "  start    - Build and start all services"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  status   - Show service status and URLs"
        echo "  logs     - Show logs (optionally specify service: backend, frontend, postgres, redis)"
        echo "  cleanup  - Remove all containers and volumes"
        echo "  migrate  - Run database migrations"
        echo "  init-db  - Initialize database with test data"
        echo "  test     - Run backend tests"
        echo "  help     - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 start                 # Start all services"
        echo "  $0 logs backend          # Show backend logs"
        echo "  $0 stop                  # Stop all services"
        echo "  $0 init-db               # Initialize database with test data"
        echo ""
        ;;
esac 