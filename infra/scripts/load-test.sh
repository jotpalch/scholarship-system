#!/bin/bash

set -euo pipefail

# Scholarship System Load Testing Script
# Usage: ./load-test.sh [environment] [test_type] [duration]
# Environment: dev, staging, prod
# Test Type: light, medium, heavy, spike, endurance
# Duration: test duration in seconds (default: 60)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Default values
ENVIRONMENT="${1:-dev}"
TEST_TYPE="${2:-light}"
DURATION="${3:-60}"

# Test configuration
declare -A TEST_CONFIGS
TEST_CONFIGS[light]="5 10 30"      # concurrent_users requests_per_second duration_multiplier
TEST_CONFIGS[medium]="15 30 30"
TEST_CONFIGS[heavy]="50 100 30"
TEST_CONFIGS[spike]="100 200 10"
TEST_CONFIGS[endurance]="10 20 600"

# API endpoints to test
declare -A API_ENDPOINTS
API_ENDPOINTS[health]="/health"
API_ENDPOINTS[ready]="/ready"
API_ENDPOINTS[applications]="/api/v1/getApplications"
API_ENDPOINTS[student_info]="/api/v1/getStudentInfo"
API_ENDPOINTS[scholarships]="/api/v1/getScholarships"

# Frontend pages to test
declare -A FRONTEND_PAGES
FRONTEND_PAGES[home]="/"
FRONTEND_PAGES[login]="/login"
FRONTEND_PAGES[student_portal]="/student"
FRONTEND_PAGES[admin_dashboard]="/admin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Results directory
RESULTS_DIR="${PROJECT_DIR}/load-test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_RESULTS_DIR="${RESULTS_DIR}/${ENVIRONMENT}/${TEST_TYPE}_${TIMESTAMP}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get base URLs based on environment
get_base_urls() {
    case "$ENVIRONMENT" in
        "prod")
            API_BASE_URL="https://api.scholarship.edu.tw"
            FRONTEND_BASE_URL="https://scholarship.edu.tw"
            ;;
        "staging")
            API_BASE_URL="https://api-staging.scholarship.edu.tw"
            FRONTEND_BASE_URL="https://staging.scholarship.edu.tw"
            ;;
        "dev")
            API_BASE_URL="http://scholarship-dev.local:8000"
            FRONTEND_BASE_URL="http://scholarship-dev.local:3000"
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if curl is installed
    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed"
        exit 1
    fi
    
    # Check if ab (Apache Bench) is available
    if ! command -v ab &> /dev/null; then
        log_warning "Apache Bench (ab) not found - some tests will be limited"
    fi
    
    # Check if hey is available (better load testing tool)
    if ! command -v hey &> /dev/null; then
        log_warning "hey load testing tool not found - install with: go install github.com/rakyll/hey@latest"
    fi
    
    # Check if wrk is available
    if ! command -v wrk &> /dev/null; then
        log_warning "wrk load testing tool not found"
    fi
    
    # Create results directory
    mkdir -p "$TEST_RESULTS_DIR"
    
    log_success "Prerequisites check completed"
}

# Test single endpoint with curl
test_single_endpoint() {
    local url="$1"
    local name="$2"
    local method="${3:-GET}"
    
    log_info "Testing $name: $url"
    
    local start_time=$(date +%s.%N)
    local response=$(curl -s -w "%{http_code}|%{time_total}|%{time_connect}|%{time_starttransfer}" \
                         -X "$method" \
                         -H "Content-Type: application/json" \
                         -H "User-Agent: LoadTest/1.0" \
                         "$url" 2>/dev/null || echo "000|999|999|999")
    local end_time=$(date +%s.%N)
    
    local http_code=$(echo "$response" | tail -1 | cut -d'|' -f1)
    local time_total=$(echo "$response" | tail -1 | cut -d'|' -f2)
    local time_connect=$(echo "$response" | tail -1 | cut -d'|' -f3)
    local time_starttransfer=$(echo "$response" | tail -1 | cut -d'|' -f4)
    
    # Log results
    echo "$name,$url,$method,$http_code,$time_total,$time_connect,$time_starttransfer" >> "$TEST_RESULTS_DIR/single_tests.csv"
    
    if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
        log_success "$name: HTTP $http_code (${time_total}s)"
    elif [[ "$http_code" =~ ^3[0-9][0-9]$ ]]; then
        log_warning "$name: HTTP $http_code (${time_total}s)"
    else
        log_error "$name: HTTP $http_code (${time_total}s)"
    fi
}

# Run basic connectivity tests
run_basic_tests() {
    log_info "Running basic connectivity tests..."
    
    echo "name,url,method,http_code,time_total,time_connect,time_starttransfer" > "$TEST_RESULTS_DIR/single_tests.csv"
    
    # Test API endpoints
    for endpoint_name in "${!API_ENDPOINTS[@]}"; do
        local endpoint="${API_ENDPOINTS[$endpoint_name]}"
        test_single_endpoint "${API_BASE_URL}${endpoint}" "API_${endpoint_name}" "GET"
    done
    
    # Test frontend pages
    for page_name in "${!FRONTEND_PAGES[@]}"; do
        local page="${FRONTEND_PAGES[$page_name]}"
        test_single_endpoint "${FRONTEND_BASE_URL}${page}" "FRONTEND_${page_name}" "GET"
    done
    
    log_success "Basic tests completed"
}

# Load test with Apache Bench
load_test_with_ab() {
    local url="$1"
    local concurrent_users="$2"
    local total_requests="$3"
    local test_name="$4"
    
    if ! command -v ab &> /dev/null; then
        log_warning "Apache Bench not available, skipping ab test"
        return 0
    fi
    
    log_info "Running Apache Bench test: $test_name"
    log_info "URL: $url, Concurrent: $concurrent_users, Total Requests: $total_requests"
    
    local output_file="$TEST_RESULTS_DIR/ab_${test_name}.txt"
    
    ab -n "$total_requests" -c "$concurrent_users" \
       -H "User-Agent: LoadTest-AB/1.0" \
       -g "$TEST_RESULTS_DIR/ab_${test_name}.tsv" \
       "$url" > "$output_file" 2>&1
    
    # Extract key metrics
    local requests_per_second=$(grep "Requests per second" "$output_file" | awk '{print $4}')
    local mean_time=$(grep "Time per request" "$output_file" | head -1 | awk '{print $4}')
    local failed_requests=$(grep "Failed requests" "$output_file" | awk '{print $3}')
    
    log_info "AB Results - RPS: $requests_per_second, Mean Time: ${mean_time}ms, Failed: $failed_requests"
    
    # Save summary
    echo "$test_name,$url,$concurrent_users,$total_requests,$requests_per_second,$mean_time,$failed_requests" >> "$TEST_RESULTS_DIR/ab_summary.csv"
}

# Load test with hey
load_test_with_hey() {
    local url="$1"
    local concurrent_users="$2"
    local duration="$3"
    local test_name="$4"
    
    if ! command -v hey &> /dev/null; then
        log_warning "hey not available, skipping hey test"
        return 0
    fi
    
    log_info "Running hey test: $test_name"
    log_info "URL: $url, Concurrent: $concurrent_users, Duration: ${duration}s"
    
    local output_file="$TEST_RESULTS_DIR/hey_${test_name}.txt"
    
    hey -z "${duration}s" -c "$concurrent_users" \
        -H "User-Agent: LoadTest-Hey/1.0" \
        "$url" > "$output_file" 2>&1
    
    # Extract key metrics
    local total_requests=$(grep "Total:" "$output_file" | awk '{print $2}')
    local requests_per_second=$(grep "Requests/sec:" "$output_file" | awk '{print $2}')
    local mean_latency=$(grep "Average:" "$output_file" | awk '{print $2}')
    local error_rate=$(grep "Error distribution:" -A 10 "$output_file" | wc -l)
    
    log_info "Hey Results - Total: $total_requests, RPS: $requests_per_second, Mean Latency: $mean_latency"
    
    # Save summary
    echo "$test_name,$url,$concurrent_users,$duration,$total_requests,$requests_per_second,$mean_latency,$error_rate" >> "$TEST_RESULTS_DIR/hey_summary.csv"
}

# Custom curl-based load test
curl_load_test() {
    local url="$1"
    local concurrent_users="$2"
    local duration="$3"
    local test_name="$4"
    
    log_info "Running curl load test: $test_name"
    log_info "URL: $url, Concurrent: $concurrent_users, Duration: ${duration}s"
    
    local pids=()
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    # Start concurrent curl processes
    for ((i = 1; i <= concurrent_users; i++)); do
        {
            local request_count=0
            local success_count=0
            local error_count=0
            
            while [[ $(date +%s) -lt $end_time ]]; do
                local response_code=$(curl -s -o /dev/null -w "%{http_code}" \
                                          -H "User-Agent: LoadTest-Curl/1.0" \
                                          "$url" 2>/dev/null || echo "000")
                
                ((request_count++))
                
                if [[ "$response_code" =~ ^2[0-9][0-9]$ ]]; then
                    ((success_count++))
                else
                    ((error_count++))
                fi
                
                # Small delay to prevent overwhelming
                sleep 0.01
            done
            
            echo "worker_$i,$request_count,$success_count,$error_count" >> "$TEST_RESULTS_DIR/curl_${test_name}_workers.csv"
        } &
        pids+=($!)
    done
    
    # Wait for all processes to complete
    wait "${pids[@]}"
    
    # Calculate totals
    local total_requests=0
    local total_success=0
    local total_errors=0
    
    while IFS=',' read -r worker requests success errors; do
        if [[ "$worker" != "worker_"* ]]; then continue; fi
        ((total_requests += requests))
        ((total_success += success))
        ((total_errors += errors))
    done < "$TEST_RESULTS_DIR/curl_${test_name}_workers.csv"
    
    local actual_duration=$(($(date +%s) - start_time))
    local rps=$((total_requests / actual_duration))
    local success_rate=$(echo "scale=2; $total_success * 100 / $total_requests" | bc -l 2>/dev/null || echo "0")
    
    log_info "Curl Results - Total: $total_requests, Success: $total_success, Errors: $total_errors, RPS: $rps, Success Rate: ${success_rate}%"
    
    # Save summary
    echo "$test_name,$url,$concurrent_users,$actual_duration,$total_requests,$total_success,$total_errors,$rps,$success_rate" >> "$TEST_RESULTS_DIR/curl_summary.csv"
}

# Run comprehensive load tests
run_load_tests() {
    local config="${TEST_CONFIGS[$TEST_TYPE]}"
    local concurrent_users=$(echo "$config" | cut -d' ' -f1)
    local requests_per_second=$(echo "$config" | cut -d' ' -f2)
    local duration_multiplier=$(echo "$config" | cut -d' ' -f3)
    local test_duration=$((DURATION * duration_multiplier / 30))
    
    log_info "Running $TEST_TYPE load test configuration:"
    log_info "- Concurrent Users: $concurrent_users"
    log_info "- Target RPS: $requests_per_second"
    log_info "- Test Duration: ${test_duration}s"
    
    # Initialize summary files
    echo "test_name,url,concurrent_users,total_requests,requests_per_second,mean_time,failed_requests" > "$TEST_RESULTS_DIR/ab_summary.csv"
    echo "test_name,url,concurrent_users,duration,total_requests,requests_per_second,mean_latency,error_rate" > "$TEST_RESULTS_DIR/hey_summary.csv"
    echo "test_name,url,concurrent_users,duration,total_requests,success_requests,error_requests,rps,success_rate" > "$TEST_RESULTS_DIR/curl_summary.csv"
    
    # Test critical API endpoints
    local total_requests=$((requests_per_second * test_duration))
    
    # Test health endpoint (should be fast)
    load_test_with_ab "${API_BASE_URL}/health" "$concurrent_users" "$total_requests" "health"
    load_test_with_hey "${API_BASE_URL}/health" "$concurrent_users" "$test_duration" "health"
    curl_load_test "${API_BASE_URL}/health" "$concurrent_users" "$test_duration" "health"
    
    # Test main application endpoints
    if [[ "$TEST_TYPE" != "spike" ]]; then
        # Skip heavy tests during spike testing
        load_test_with_hey "${API_BASE_URL}/api/v1/getApplications" "$((concurrent_users / 2))" "$test_duration" "applications"
        curl_load_test "${FRONTEND_BASE_URL}/" "$((concurrent_users / 3))" "$test_duration" "frontend_home"
    fi
    
    log_success "Load tests completed"
}

# Monitor system resources during test
monitor_resources() {
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        log_info "Monitoring local system resources..."
        
        {
            echo "timestamp,cpu_usage,memory_usage,disk_usage"
            while true; do
                local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
                local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
                local memory_usage=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
                local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
                
                echo "$timestamp,$cpu_usage,$memory_usage,$disk_usage"
                sleep 5
            done
        } > "$TEST_RESULTS_DIR/system_resources.csv" &
        
        local monitor_pid=$!
        echo "$monitor_pid" > "$TEST_RESULTS_DIR/monitor.pid"
    fi
}

# Stop resource monitoring
stop_monitoring() {
    if [[ -f "$TEST_RESULTS_DIR/monitor.pid" ]]; then
        local monitor_pid=$(cat "$TEST_RESULTS_DIR/monitor.pid")
        kill "$monitor_pid" 2>/dev/null || true
        rm -f "$TEST_RESULTS_DIR/monitor.pid"
        log_info "Resource monitoring stopped"
    fi
}

# Generate test report
generate_report() {
    log_info "Generating test report..."
    
    local report_file="$TEST_RESULTS_DIR/test_report.md"
    
    cat > "$report_file" << EOF
# Load Test Report

**Environment:** $ENVIRONMENT  
**Test Type:** $TEST_TYPE  
**Duration:** ${DURATION}s  
**Timestamp:** $TIMESTAMP  

## Test Configuration

$(
config="${TEST_CONFIGS[$TEST_TYPE]}"
concurrent_users=$(echo "$config" | cut -d' ' -f1)
requests_per_second=$(echo "$config" | cut -d' ' -f2)
duration_multiplier=$(echo "$config" | cut -d' ' -f3)

echo "- Concurrent Users: $concurrent_users"
echo "- Target RPS: $requests_per_second"
echo "- Duration Multiplier: ${duration_multiplier}x"
)

## Basic Connectivity Tests

$(
if [[ -f "$TEST_RESULTS_DIR/single_tests.csv" ]]; then
    echo "| Test | URL | Status | Response Time |"
    echo "|------|-----|--------|---------------|"
    
    tail -n +2 "$TEST_RESULTS_DIR/single_tests.csv" | while IFS=',' read -r name url method http_code time_total time_connect time_starttransfer; do
        local status="✅ Success"
        if [[ ! "$http_code" =~ ^2[0-9][0-9]$ ]]; then
            status="❌ Failed"
        fi
        echo "| $name | $url | $status (HTTP $http_code) | ${time_total}s |"
    done
else
    echo "No basic test results found."
fi
)

## Load Test Results

### Apache Bench Results
$(
if [[ -f "$TEST_RESULTS_DIR/ab_summary.csv" ]] && [[ $(wc -l < "$TEST_RESULTS_DIR/ab_summary.csv") -gt 1 ]]; then
    echo "| Test | RPS | Mean Time | Failed Requests |"
    echo "|------|-----|-----------|-----------------|"
    
    tail -n +2 "$TEST_RESULTS_DIR/ab_summary.csv" | while IFS=',' read -r test_name url concurrent total rps mean_time failed; do
        echo "| $test_name | $rps | ${mean_time}ms | $failed |"
    done
else
    echo "No Apache Bench results available."
fi
)

### Hey Load Test Results
$(
if [[ -f "$TEST_RESULTS_DIR/hey_summary.csv" ]] && [[ $(wc -l < "$TEST_RESULTS_DIR/hey_summary.csv") -gt 1 ]]; then
    echo "| Test | Total Requests | RPS | Mean Latency |"
    echo "|------|----------------|-----|--------------|"
    
    tail -n +2 "$TEST_RESULTS_DIR/hey_summary.csv" | while IFS=',' read -r test_name url concurrent duration total rps latency errors; do
        echo "| $test_name | $total | $rps | $latency |"
    done
else
    echo "No Hey results available."
fi
)

### Curl Load Test Results
$(
if [[ -f "$TEST_RESULTS_DIR/curl_summary.csv" ]] && [[ $(wc -l < "$TEST_RESULTS_DIR/curl_summary.csv") -gt 1 ]]; then
    echo "| Test | Total Requests | Success Rate | RPS |"
    echo "|------|----------------|--------------|-----|"
    
    tail -n +2 "$TEST_RESULTS_DIR/curl_summary.csv" | while IFS=',' read -r test_name url concurrent duration total success errors rps success_rate; do
        echo "| $test_name | $total | ${success_rate}% | $rps |"
    done
else
    echo "No Curl results available."
fi
)

## Files Generated

- Single tests: \`single_tests.csv\`
- AB summary: \`ab_summary.csv\`
- Hey summary: \`hey_summary.csv\`
- Curl summary: \`curl_summary.csv\`
$(
if [[ -f "$TEST_RESULTS_DIR/system_resources.csv" ]]; then
    echo "- System resources: \`system_resources.csv\`"
fi
)

## Recommendations

$(
# Add basic performance recommendations based on results
echo "Based on the test results:"
echo ""
echo "1. Monitor response times and error rates"
echo "2. Check for any failed requests and investigate causes"
echo "3. Consider scaling if RPS targets are not met"
echo "4. Review system resources if available"
)
EOF
    
    log_success "Test report generated: $report_file"
    
    # Display summary
    echo -e "\n${BLUE}=== TEST SUMMARY ===${NC}"
    cat "$report_file"
}

# Cleanup function
cleanup() {
    stop_monitoring
    log_info "Cleanup completed"
}

# Main execution
main() {
    log_info "Starting load test: $TEST_TYPE on $ENVIRONMENT (${DURATION}s)"
    
    # Validate test type
    if [[ ! "${TEST_CONFIGS[$TEST_TYPE]+isset}" ]]; then
        log_error "Invalid test type: $TEST_TYPE"
        echo "Available types: ${!TEST_CONFIGS[*]}"
        exit 1
    fi
    
    get_base_urls
    check_prerequisites
    
    # Start monitoring
    monitor_resources
    
    # Trap cleanup on exit
    trap cleanup EXIT INT TERM
    
    # Run tests
    run_basic_tests
    run_load_tests
    
    # Stop monitoring
    stop_monitoring
    
    # Generate report
    generate_report
    
    log_success "Load testing completed successfully!"
    log_info "Results saved to: $TEST_RESULTS_DIR"
}

# Run main function
main "$@" 