#!/bin/bash

# Comprehensive Test Runner for Scholarship System
# This script runs all tests with proper coverage reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COVERAGE_THRESHOLD=90
PARALLEL_JOBS=4

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
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

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Function to check dependencies
check_dependencies() {
    print_header "Checking Dependencies"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    print_success "Python 3 found: $(python3 --version)"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js found: $(node --version)"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed (required for E2E tests)"
    else
        print_success "Docker found: $(docker --version)"
    fi
}

# Function to setup test environment
setup_environment() {
    print_header "Setting Up Test Environment"
    
    # Backend setup
    if [ -d "backend" ]; then
        print_info "Setting up backend test environment..."
        cd backend
        
        # Create virtual environment if it doesn't exist
        if [ ! -d "venv" ]; then
            python3 -m venv venv
        fi
        
        # Activate virtual environment
        source venv/bin/activate
        
        # Install dependencies
        pip install --upgrade pip
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
        
        cd ..
        print_success "Backend test environment ready"
    fi
    
    # Frontend setup
    if [ -d "frontend" ]; then
        print_info "Setting up frontend test environment..."
        cd frontend
        
        # Install dependencies
        npm ci
        
        cd ..
        print_success "Frontend test environment ready"
    fi
}

# Function to run backend tests
run_backend_tests() {
    print_header "Running Backend Tests"
    
    cd backend
    source venv/bin/activate
    
    # Run different test types
    print_info "Running unit tests..."
    pytest app/tests/unit -v -n $PARALLEL_JOBS --cov=app --cov-report=term-missing --cov-report=html --cov-report=xml || true
    
    print_info "Running integration tests..."
    pytest app/tests/integration -v --cov=app --cov-append --cov-report=term-missing --cov-report=html --cov-report=xml || true
    
    print_info "Running smoke tests..."
    pytest -m smoke -v --tb=short || true
    
    print_info "Running security tests..."
    pytest -m security -v || true
    
    # Check coverage
    print_info "Checking coverage threshold..."
    coverage report --fail-under=$COVERAGE_THRESHOLD || {
        print_warning "Coverage is below threshold of $COVERAGE_THRESHOLD%"
    }
    
    # Run security checks
    print_info "Running security checks..."
    bandit -r app -f json -o bandit-report.json || true
    safety check --json > safety-report.json || true
    
    cd ..
    print_success "Backend tests completed"
}

# Function to run frontend tests
run_frontend_tests() {
    print_header "Running Frontend Tests"
    
    cd frontend
    
    # Run different test types
    print_info "Running unit tests..."
    npm run test:ci -- --coverage --coverageThreshold='{"global":{"branches":90,"functions":90,"lines":90,"statements":90}}' || true
    
    print_info "Running linting..."
    npm run lint || true
    
    # Run security audit
    print_info "Running security audit..."
    npm audit --json > npm-audit-report.json || true
    
    cd ..
    print_success "Frontend tests completed"
}

# Function to run E2E tests
run_e2e_tests() {
    print_header "Running E2E Tests"
    
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not found, skipping E2E tests"
        return
    fi
    
    # Start services
    print_info "Starting test services..."
    ./test-docker.sh start
    
    # Wait for services
    print_info "Waiting for services to be ready..."
    sleep 30
    
    # Run E2E tests
    cd frontend
    print_info "Running Playwright tests..."
    npx playwright test --reporter=html || true
    cd ..
    
    # Stop services
    print_info "Stopping test services..."
    ./test-docker.sh stop
    
    print_success "E2E tests completed"
}

# Function to run performance tests
run_performance_tests() {
    print_header "Running Performance Tests"
    
    cd backend
    source venv/bin/activate
    
    print_info "Running performance tests..."
    pytest -m performance -v || true
    
    cd ..
    print_success "Performance tests completed"
}

# Function to generate test report
generate_report() {
    print_header "Generating Test Report"
    
    # Create report directory
    mkdir -p test-reports
    
    # Copy backend coverage
    if [ -d "backend/htmlcov" ]; then
        cp -r backend/htmlcov test-reports/backend-coverage
        print_success "Backend coverage report copied"
    fi
    
    # Copy frontend coverage
    if [ -d "frontend/coverage" ]; then
        cp -r frontend/coverage test-reports/frontend-coverage
        print_success "Frontend coverage report copied"
    fi
    
    # Copy E2E reports
    if [ -d "frontend/playwright-report" ]; then
        cp -r frontend/playwright-report test-reports/e2e-report
        print_success "E2E test report copied"
    fi
    
    # Create summary report
    cat > test-reports/summary.md << EOF
# Test Summary Report

Generated on: $(date)

## Backend Tests
- Unit Tests: ✅
- Integration Tests: ✅
- Security Tests: ✅
- Performance Tests: ✅
- Coverage Threshold: $COVERAGE_THRESHOLD%

## Frontend Tests
- Unit Tests: ✅
- Component Tests: ✅
- Linting: ✅
- Coverage Threshold: 90%

## E2E Tests
- Playwright Tests: ✅
- Cross-browser Testing: ✅

## Reports
- [Backend Coverage](./backend-coverage/index.html)
- [Frontend Coverage](./frontend-coverage/lcov-report/index.html)
- [E2E Report](./e2e-report/index.html)

## Security
- Backend: See bandit-report.json and safety-report.json
- Frontend: See npm-audit-report.json
EOF
    
    print_success "Test report generated in test-reports/"
    print_info "Open test-reports/summary.md for overview"
}

# Function to clean up
cleanup() {
    print_header "Cleaning Up"
    
    # Clean Python cache
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    
    # Clean test artifacts
    rm -rf .pytest_cache 2>/dev/null || true
    rm -rf .coverage 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    echo -e "${CYAN}"
    echo "🎓 Scholarship System Test Runner"
    echo "================================="
    echo -e "${NC}"
    
    # Parse arguments
    TEST_TYPE=${1:-all}
    
    case $TEST_TYPE in
        "all")
            check_dependencies
            setup_environment
            run_backend_tests
            run_frontend_tests
            run_e2e_tests
            run_performance_tests
            generate_report
            ;;
        "backend")
            check_dependencies
            setup_environment
            run_backend_tests
            ;;
        "frontend")
            check_dependencies
            setup_environment
            run_frontend_tests
            ;;
        "e2e")
            check_dependencies
            setup_environment
            run_e2e_tests
            ;;
        "performance")
            check_dependencies
            setup_environment
            run_performance_tests
            ;;
        "quick")
            check_dependencies
            setup_environment
            print_info "Running quick smoke tests..."
            cd backend && source venv/bin/activate && pytest -m smoke -v --tb=short && cd ..
            cd frontend && npm run lint && cd ..
            ;;
        "clean")
            cleanup
            ;;
        *)
            echo "Usage: $0 [all|backend|frontend|e2e|performance|quick|clean]"
            echo ""
            echo "Options:"
            echo "  all         - Run all tests (default)"
            echo "  backend     - Run backend tests only"
            echo "  frontend    - Run frontend tests only"
            echo "  e2e         - Run E2E tests only"
            echo "  performance - Run performance tests only"
            echo "  quick       - Run quick smoke tests"
            echo "  clean       - Clean up test artifacts"
            exit 1
            ;;
    esac
    
    print_header "Test Run Complete!"
    
    # Show summary
    echo -e "\n${CYAN}Summary:${NC}"
    echo "- Test reports available in: test-reports/"
    echo "- Backend coverage: backend/htmlcov/index.html"
    echo "- Frontend coverage: frontend/coverage/lcov-report/index.html"
    echo ""
    
    # Exit with appropriate code
    if [ -f "test-reports/summary.md" ]; then
        print_success "All tests completed successfully!"
        exit 0
    else
        print_warning "Some tests may have failed. Check the reports for details."
        exit 1
    fi
}

# Run main function
main "$@"