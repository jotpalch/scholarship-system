#!/bin/bash

# E2E Test Runner for Scholarship System
# Ensures proper setup before running Playwright tests

set -e

echo "🎭 Scholarship System E2E Test Runner"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL=${NEXT_PUBLIC_API_URL:-"http://localhost:8000"}
FRONTEND_URL="http://localhost:3000"
USE_DOCKER=${USE_DOCKER:-false}

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
    elif command -v netstat >/dev/null 2>&1; then
        netstat -tuln | grep ":$port " >/dev/null 2>&1
    else
        # Fallback: try to connect
        timeout 1 bash -c "</dev/tcp/localhost/$port" 2>/dev/null
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --connect-timeout 2 --max-time 5 "$url" > /dev/null 2>&1; then
            print_success "$name is ready"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$name failed to start within timeout"
    return 1
}

# Function to test API connectivity
test_api_connection() {
    print_status "Testing API connectivity..."
    if node test-api-connection.js; then
        print_success "API connection verified"
        return 0
    else
        print_error "API connection failed"
        return 1
    fi
}

# Function to start services with Docker
start_docker_services() {
    print_status "Starting services with Docker..."
    
    # Check if docker-compose is available
    if ! command -v docker-compose >/dev/null 2>&1 && ! command -v docker >/dev/null 2>&1; then
        print_error "Docker not found. Please install Docker or run services manually."
        return 1
    fi
    
    # Go to project root
    cd ..
    
    # Start the complete stack
    if [ -f "test-docker.sh" ]; then
        print_status "Using test-docker.sh to start services..."
        ./test-docker.sh start
    elif [ -f "docker-compose.test.yml" ]; then
        print_status "Starting with docker-compose.test.yml..."
        docker-compose -f docker-compose.test.yml up -d
    elif [ -f "docker-compose.yml" ]; then
        print_status "Starting with docker-compose.yml..."
        docker-compose up -d
    else
        print_error "No Docker configuration found"
        return 1
    fi
    
    # Return to frontend directory
    cd frontend
    
    # Wait for services
    wait_for_service "$API_URL/health" "Backend API"
    
    return 0
}

# Function to check and start backend manually
start_backend_manually() {
    print_warning "Backend not detected. Attempting to start..."
    
    if [ -f "../backend/requirements.txt" ]; then
        print_status "Found backend directory. Starting backend..."
        
        # Start backend in background
        (
            cd ../backend
            if [ ! -d "venv" ]; then
                print_status "Creating Python virtual environment..."
                python3 -m venv venv
            fi
            
            source venv/bin/activate
            pip install -r requirements.txt
            
            export DATABASE_URL="sqlite:///./test.db"
            python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
            echo $! > ../backend.pid
        ) &
        
        # Wait for backend to start
        wait_for_service "$API_URL/health" "Backend API"
        return $?
    else
        print_error "Backend directory not found. Please start the backend manually:"
        echo "   cd backend && python -m uvicorn app.main:app --reload"
        return 1
    fi
}

# Function to cleanup on exit
cleanup() {
    if [ -f "../backend.pid" ]; then
        print_status "Stopping backend server..."
        kill $(cat ../backend.pid) 2>/dev/null || true
        rm -f ../backend.pid
    fi
}

# Set up cleanup trap
trap cleanup EXIT

# Main execution starts here
print_status "Checking prerequisites..."

# Check if we should use Docker
if [ "$1" = "docker" ] || [ "$USE_DOCKER" = "true" ]; then
    USE_DOCKER=true
    shift # Remove the docker argument
fi

# Check dependencies
print_status "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Install Playwright browsers if needed
if [ ! -d "node_modules/@playwright/test" ]; then
    print_status "Installing Playwright..."
    npm install @playwright/test
fi

# Install browsers
print_status "Installing/updating browsers..."
npx playwright install

# Check and start services
if [ "$USE_DOCKER" = "true" ]; then
    start_docker_services
else
    # Check if backend is running
    if ! check_port 8000; then
        start_backend_manually
    else
        print_success "Backend detected on port 8000"
    fi
    
    # Test API connection
    if ! test_api_connection; then
        print_error "Cannot proceed without working API connection"
        exit 1
    fi
fi

# Check if frontend is running
if check_port 3000; then
    print_success "Frontend server detected on port 3000"
    export PLAYWRIGHT_REUSE_SERVER=true
else
    print_warning "Frontend server not detected on port 3000"
    print_status "Frontend will be started by Playwright"
    export PLAYWRIGHT_REUSE_SERVER=false
fi

# Set environment variables for tests
export NEXT_PUBLIC_API_URL="$API_URL"

print_success "All prerequisites met. Starting E2E tests..."

# Run tests based on arguments
if [ "$1" = "debug" ]; then
    print_status "Running tests in debug mode..."
    npx playwright test --debug
elif [ "$1" = "headed" ]; then
    print_status "Running tests in headed mode..."
    npx playwright test --headed
elif [ "$1" = "ui" ]; then
    print_status "Opening Playwright UI..."
    npx playwright test --ui
elif [ "$1" = "specific" ] && [ -n "$2" ]; then
    print_status "Running specific test: $2"
    npx playwright test "$2"
else
    print_status "Running all E2E tests..."
    npx playwright test
fi

# Show results
echo ""
print_success "Test execution completed!"
echo ""
echo "📊 Test Results:"
echo "   Report: test-results/index.html"
echo "   Traces: test-results/"
echo ""
echo "💡 Usage:"
echo "   ./run-e2e-tests.sh          # Run all tests"
echo "   ./run-e2e-tests.sh docker   # Use Docker services"
echo "   ./run-e2e-tests.sh debug    # Debug mode"
echo "   ./run-e2e-tests.sh headed   # See browser"
echo "   ./run-e2e-tests.sh ui       # Playwright UI"
echo "   ./run-e2e-tests.sh specific auth.spec.ts  # Run specific test"
echo ""
echo "🔧 Environment:"
echo "   API URL: $API_URL"
echo "   Frontend URL: $FRONTEND_URL"
echo "   Docker Mode: $USE_DOCKER" 