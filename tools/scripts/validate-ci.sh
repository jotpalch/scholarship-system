#!/bin/bash

# Scholarship System CI/CD Validation Script
# This script validates the CI/CD setup locally before pushing to GitHub

set -e

echo "🔍 Validating CI/CD Setup for Scholarship System"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check if we're in the right directory
if [ ! -f "test-docker.sh" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

print_info "Checking project structure..."

# Check required files exist
required_files=(
    ".github/workflows/ci.yml"
    ".github/workflows/dependency-update.yml"
    "frontend/package.json"
    "frontend/jest.config.js"
    "backend/requirements.txt"
    "docker-compose.yml"
    "test-docker.sh"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "Found $file"
    else
        print_status 1 "Missing $file"
    fi
done

print_info "Validating frontend setup..."

# Frontend validation
cd frontend

# Check if package.json has required scripts
required_scripts=("test" "lint" "build" "test:e2e")
for script in "${required_scripts[@]}"; do
    if npm run | grep -q "$script"; then
        print_status 0 "Frontend script '$script' exists"
    else
        print_status 1 "Frontend script '$script' missing"
    fi
done

# Check if dependencies are installed
if [ -d "node_modules" ]; then
    print_status 0 "Frontend dependencies installed"
else
    print_warning "Frontend dependencies not installed, installing..."
    npm ci
    print_status $? "Frontend dependencies installation"
fi

# Run frontend linting
print_info "Running frontend linting..."
npm run lint > /dev/null 2>&1
print_status $? "Frontend linting"

# Run frontend tests
print_info "Running frontend tests..."
npm test -- --watchAll=false --coverage=false > /dev/null 2>&1
print_status $? "Frontend tests"

cd ..

print_info "Validating backend setup..."

# Backend validation
cd backend

# Check if requirements.txt exists and has content
if [ -s "requirements.txt" ]; then
    print_status 0 "Backend requirements.txt exists and has content"
else
    print_status 1 "Backend requirements.txt missing or empty"
fi

# Check if virtual environment exists or create one
if [ ! -d "venv" ]; then
    print_warning "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
print_info "Installing backend dependencies..."
pip install -r requirements.txt > /dev/null 2>&1
print_status $? "Backend dependencies installation"

# Check if pytest is available
if command -v pytest > /dev/null 2>&1; then
    print_status 0 "pytest available"
    
    # Run backend tests (if test files exist)
    if find . -name "test_*.py" -o -name "*_test.py" | grep -q .; then
        print_info "Running backend tests..."
        pytest --tb=short > /dev/null 2>&1
        print_status $? "Backend tests"
    else
        print_warning "No backend test files found"
    fi
else
    print_warning "pytest not available, skipping backend tests"
fi

# Deactivate virtual environment
deactivate

cd ..

print_info "Validating Docker setup..."

# Check if Docker is available
if command -v docker > /dev/null 2>&1; then
    print_status 0 "Docker available"
    
    # Check if docker-compose is available
    if command -v docker-compose > /dev/null 2>&1; then
        print_status 0 "docker-compose available"
    else
        print_warning "docker-compose not available, checking for 'docker compose'"
        if docker compose version > /dev/null 2>&1; then
            print_status 0 "docker compose available"
        else
            print_status 1 "Neither docker-compose nor 'docker compose' available"
        fi
    fi
    
    # Validate docker-compose.yml
    print_info "Validating docker-compose.yml..."
    docker-compose config > /dev/null 2>&1 || docker compose config > /dev/null 2>&1
    print_status $? "docker-compose.yml validation"
    
else
    print_warning "Docker not available, skipping Docker validation"
fi

print_info "Validating GitHub Actions workflows..."

# Check workflow syntax (basic YAML validation)
for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        # Basic YAML syntax check using Python
        python3 -c "import yaml; yaml.safe_load(open('$workflow'))" 2>/dev/null
        print_status $? "Workflow $(basename $workflow) YAML syntax"
    fi
done

print_info "Checking test coverage setup..."

# Check if coverage tools are configured
if grep -q "coverage" frontend/package.json; then
    print_status 0 "Frontend coverage configured"
else
    print_warning "Frontend coverage not configured"
fi

if grep -q "pytest-cov" backend/requirements.txt; then
    print_status 0 "Backend coverage configured"
else
    print_warning "Backend coverage not configured"
fi

print_info "Validating environment variables..."

# Check if example environment files exist
env_files=(".env.example" "frontend/.env.example" "backend/.env.example")
for env_file in "${env_files[@]}"; do
    if [ -f "$env_file" ]; then
        print_status 0 "Found $env_file"
    else
        print_warning "Missing $env_file"
    fi
done

print_info "Security checks..."

# Check for common security issues
security_issues=()

# Check for hardcoded secrets (basic check)
if grep -r "password.*=" --include="*.py" --include="*.js" --include="*.ts" --include="*.tsx" . | grep -v test | grep -v example; then
    security_issues+=("Potential hardcoded passwords found")
fi

if grep -r "secret.*=" --include="*.py" --include="*.js" --include="*.ts" --include="*.tsx" . | grep -v test | grep -v example; then
    security_issues+=("Potential hardcoded secrets found")
fi

if [ ${#security_issues[@]} -eq 0 ]; then
    print_status 0 "No obvious security issues found"
else
    for issue in "${security_issues[@]}"; do
        print_warning "$issue"
    done
fi

echo ""
echo "🎉 CI/CD Validation Complete!"
echo "=============================="

print_info "Next steps:"
echo "1. Commit your changes: git add . && git commit -m 'feat: add CI/CD pipeline'"
echo "2. Push to GitHub: git push origin main"
echo "3. Check GitHub Actions tab for workflow execution"
echo "4. Set up branch protection rules in GitHub repository settings"
echo "5. Configure any required secrets in GitHub repository settings"

print_info "Recommended GitHub repository secrets:"
echo "- CODECOV_TOKEN (for code coverage reporting)"
echo "- SLACK_WEBHOOK_URL (for notifications)"
echo "- DEPLOY_KEY (for deployment)"

echo ""
echo -e "${GREEN}✅ Ready for CI/CD deployment!${NC}" 