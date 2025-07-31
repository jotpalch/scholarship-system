#!/bin/bash

set -euo pipefail

# Scholarship System Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Environment: dev, staging, prod
# Action: deploy, upgrade, rollback, status

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
INFRA_DIR="${PROJECT_DIR}/infra"

# Default values
ENVIRONMENT="${1:-dev}"
ACTION="${2:-deploy}"
NAMESPACE="scholarship-${ENVIRONMENT}"
RELEASE_NAME="scholarship-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed and configured
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed or not in PATH"
        exit 1
    fi
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if environment is valid
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespace if it doesn't exist
create_namespace() {
    log_info "Creating namespace: $NAMESPACE"
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace "$NAMESPACE"
        kubectl label namespace "$NAMESPACE" environment="$ENVIRONMENT"
        log_success "Namespace $NAMESPACE created"
    fi
}

# Apply secrets
apply_secrets() {
    log_info "Applying secrets for $ENVIRONMENT environment..."
    
    local secret_file="${INFRA_DIR}/k8s/${ENVIRONMENT}/secrets.yaml"
    
    if [[ -f "$secret_file" ]]; then
        kubectl apply -f "$secret_file" -n "$NAMESPACE"
        log_success "Secrets applied"
    else
        log_warning "No secrets file found at $secret_file"
    fi
}

# Deploy using kubectl (for simple deployments)
deploy_kubectl() {
    log_info "Deploying using kubectl for $ENVIRONMENT environment..."
    
    local deployment_dir="${INFRA_DIR}/k8s/${ENVIRONMENT}"
    
    if [[ ! -d "$deployment_dir" ]]; then
        log_error "Deployment directory not found: $deployment_dir"
        exit 1
    fi
    
    # Apply configurations in order
    for manifest in deployment.yaml ingress.yaml; do
        local manifest_path="${deployment_dir}/${manifest}"
        if [[ -f "$manifest_path" ]]; then
            log_info "Applying $manifest..."
            kubectl apply -f "$manifest_path" -n "$NAMESPACE"
        else
            log_warning "Manifest not found: $manifest_path"
        fi
    done
    
    log_success "kubectl deployment completed"
}

# Deploy using Helm
deploy_helm() {
    log_info "Deploying using Helm for $ENVIRONMENT environment..."
    
    local helm_dir="${INFRA_DIR}/helm"
    local values_file="${helm_dir}/values-${ENVIRONMENT}.yaml"
    
    # Use default values.yaml if environment-specific file doesn't exist
    if [[ ! -f "$values_file" ]]; then
        values_file="${helm_dir}/values.yaml"
        log_warning "Environment-specific values file not found, using default values.yaml"
    fi
    
    # Add required Helm repositories
    log_info "Adding Helm repositories..."
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    
    # Deploy the application
    if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        log_info "Upgrading existing release: $RELEASE_NAME"
        helm upgrade "$RELEASE_NAME" "$helm_dir" \
            --namespace "$NAMESPACE" \
            --values "$values_file" \
            --wait \
            --timeout=600s
    else
        log_info "Installing new release: $RELEASE_NAME"
        helm install "$RELEASE_NAME" "$helm_dir" \
            --namespace "$NAMESPACE" \
            --values "$values_file" \
            --wait \
            --timeout=600s \
            --create-namespace
    fi
    
    log_success "Helm deployment completed"
}

# Rollback deployment
rollback_deployment() {
    log_info "Rolling back deployment for $ENVIRONMENT environment..."
    
    if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        log_info "Rolling back Helm release: $RELEASE_NAME"
        helm rollback "$RELEASE_NAME" -n "$NAMESPACE"
        log_success "Rollback completed"
    else
        log_error "Release $RELEASE_NAME not found in namespace $NAMESPACE"
        exit 1
    fi
}

# Check deployment status
check_status() {
    log_info "Checking deployment status for $ENVIRONMENT environment..."
    
    echo "=== Namespace Status ==="
    kubectl get namespace "$NAMESPACE" 2>/dev/null || log_warning "Namespace $NAMESPACE not found"
    
    echo -e "\n=== Pod Status ==="
    kubectl get pods -n "$NAMESPACE" -o wide
    
    echo -e "\n=== Service Status ==="
    kubectl get services -n "$NAMESPACE" -o wide
    
    echo -e "\n=== Ingress Status ==="
    kubectl get ingress -n "$NAMESPACE" -o wide
    
    echo -e "\n=== Deployment Status ==="
    kubectl get deployments -n "$NAMESPACE" -o wide
    
    if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        echo -e "\n=== Helm Release Status ==="
        helm status "$RELEASE_NAME" -n "$NAMESPACE"
    fi
    
    # Check pod health
    echo -e "\n=== Pod Health Check ==="
    local unhealthy_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
    if [[ "$unhealthy_pods" -eq 0 ]]; then
        log_success "All pods are healthy"
    else
        log_warning "$unhealthy_pods unhealthy pods found"
    fi
}

# Wait for deployment to be ready
wait_for_deployment() {
    log_info "Waiting for deployment to be ready..."
    
    local deployments=("scholarship-backend" "scholarship-frontend")
    
    for deployment in "${deployments[@]}"; do
        log_info "Waiting for deployment/$deployment to be ready..."
        kubectl wait --for=condition=available --timeout=600s deployment/"$deployment" -n "$NAMESPACE" || {
            log_error "Deployment $deployment failed to become ready"
            return 1
        }
    done
    
    log_success "All deployments are ready"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Check if services are responding
    local backend_url=""
    local frontend_url=""
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        backend_url="https://api.scholarship.edu.tw/health"
        frontend_url="https://scholarship.edu.tw"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        backend_url="https://api-staging.scholarship.edu.tw/health"
        frontend_url="https://staging.scholarship.edu.tw"
    else
        # For dev environment, use port-forward for testing
        log_info "Setting up port-forward for dev environment health check..."
        kubectl port-forward -n "$NAMESPACE" svc/scholarship-backend 8080:8000 &
        local pf_pid=$!
        sleep 5
        backend_url="http://localhost:8080/health"
        trap "kill $pf_pid 2>/dev/null || true" EXIT
    fi
    
    # Test backend health
    if [[ -n "$backend_url" ]]; then
        if curl -s "$backend_url" > /dev/null; then
            log_success "Backend health check passed"
        else
            log_error "Backend health check failed"
            return 1
        fi
    fi
    
    log_success "Health checks completed"
}

# Clean up resources
cleanup() {
    log_info "Cleaning up resources for $ENVIRONMENT environment..."
    
    if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        log_info "Uninstalling Helm release: $RELEASE_NAME"
        helm uninstall "$RELEASE_NAME" -n "$NAMESPACE"
    fi
    
    log_info "Deleting namespace: $NAMESPACE"
    kubectl delete namespace "$NAMESPACE" --ignore-not-found=true
    
    log_success "Cleanup completed"
}

# Main execution
main() {
    log_info "Starting deployment script for $ENVIRONMENT environment with action: $ACTION"
    
    check_prerequisites
    
    case "$ACTION" in
        "deploy")
            create_namespace
            apply_secrets
            
            # Choose deployment method based on environment
            if [[ "$ENVIRONMENT" == "prod" ]]; then
                deploy_helm
            else
                deploy_kubectl
            fi
            
            wait_for_deployment
            run_health_checks
            check_status
            log_success "Deployment completed successfully!"
            ;;
            
        "upgrade")
            if [[ "$ENVIRONMENT" == "prod" ]]; then
                deploy_helm
            else
                deploy_kubectl
            fi
            wait_for_deployment
            run_health_checks
            log_success "Upgrade completed successfully!"
            ;;
            
        "rollback")
            rollback_deployment
            wait_for_deployment
            run_health_checks
            log_success "Rollback completed successfully!"
            ;;
            
        "status")
            check_status
            ;;
            
        "cleanup")
            cleanup
            ;;
            
        *)
            log_error "Invalid action: $ACTION"
            echo "Available actions: deploy, upgrade, rollback, status, cleanup"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'log_error "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@" 