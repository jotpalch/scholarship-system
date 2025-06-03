#!/bin/bash

set -euo pipefail

# Scholarship System Backup Script
# Usage: ./backup.sh [environment] [type]
# Environment: dev, staging, prod
# Type: database, files, full

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Default values
ENVIRONMENT="${1:-prod}"
BACKUP_TYPE="${2:-database}"
NAMESPACE="scholarship-${ENVIRONMENT}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${PROJECT_DIR}/backups/${ENVIRONMENT}"

# Configuration
RETENTION_DAYS=30
POSTGRES_POD=""
POSTGRES_USER="scholarship_prod"
POSTGRES_DB="scholarship_prod"

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
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if pg_dump is available (for local restoration)
    if ! command -v pg_dump &> /dev/null; then
        log_warning "pg_dump not found locally, will use pod-based backup"
    fi
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    # Find PostgreSQL pod
    POSTGRES_POD=$(kubectl get pods -n "$NAMESPACE" -l app=scholarship-postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$POSTGRES_POD" ]]; then
        log_error "PostgreSQL pod not found in namespace $NAMESPACE"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
    log_info "Using PostgreSQL pod: $POSTGRES_POD"
}

# Create backup directory
create_backup_dir() {
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # Create subdirectories for different backup types
    mkdir -p "$BACKUP_DIR/database"
    mkdir -p "$BACKUP_DIR/files"
    mkdir -p "$BACKUP_DIR/logs"
}

# Database backup
backup_database() {
    log_info "Starting database backup for $ENVIRONMENT environment..."
    
    local backup_file="$BACKUP_DIR/database/db_backup_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    # Create database dump using kubectl exec
    log_info "Creating database dump..."
    kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain > "$backup_file"
    
    if [[ $? -eq 0 ]]; then
        log_success "Database dump created: $backup_file"
        
        # Compress the backup
        log_info "Compressing backup..."
        gzip "$backup_file"
        
        if [[ -f "$compressed_file" ]]; then
            log_success "Backup compressed: $compressed_file"
            
            # Log backup info
            local backup_size=$(du -h "$compressed_file" | cut -f1)
            echo "$(date): Database backup completed - Size: $backup_size, File: $compressed_file" >> "$BACKUP_DIR/logs/backup.log"
            
            # Test backup integrity
            test_backup_integrity "$compressed_file"
        else
            log_error "Failed to compress backup"
            return 1
        fi
    else
        log_error "Database backup failed"
        return 1
    fi
}

# Test backup integrity
test_backup_integrity() {
    local backup_file="$1"
    
    log_info "Testing backup integrity..."
    
    # Test if the compressed file is valid
    if gzip -t "$backup_file" 2>/dev/null; then
        log_success "Backup integrity test passed"
    else
        log_error "Backup integrity test failed"
        return 1
    fi
    
    # Check if the backup contains expected content
    local line_count=$(zcat "$backup_file" | wc -l)
    if [[ "$line_count" -gt 10 ]]; then
        log_success "Backup content validation passed ($line_count lines)"
    else
        log_warning "Backup seems too small ($line_count lines)"
    fi
}

# Files backup (application data, uploads, etc.)
backup_files() {
    log_info "Starting files backup for $ENVIRONMENT environment..."
    
    local backup_file="$BACKUP_DIR/files/files_backup_${TIMESTAMP}.tar.gz"
    
    # Define directories to backup (adjust based on your application structure)
    local backup_paths=(
        "/app/uploads"
        "/app/storage"
        "/app/logs"
    )
    
    # Get pods that might contain files to backup
    local backend_pods=$(kubectl get pods -n "$NAMESPACE" -l app=scholarship-backend -o jsonpath='{.items[*].metadata.name}')
    
    if [[ -n "$backend_pods" ]]; then
        for pod in $backend_pods; do
            log_info "Backing up files from pod: $pod"
            
            # Create a temporary archive in the pod
            kubectl exec -n "$NAMESPACE" "$pod" -- tar -czf /tmp/backup_${TIMESTAMP}.tar.gz \
                --exclude="*.log" \
                --exclude="*cache*" \
                -C / \
                $(printf "%s " "${backup_paths[@]}") 2>/dev/null || true
            
            # Copy the archive from the pod
            kubectl cp "$NAMESPACE/$pod:/tmp/backup_${TIMESTAMP}.tar.gz" "$backup_file" || {
                log_warning "Failed to copy backup from pod $pod"
                continue
            }
            
            # Clean up temporary file in pod
            kubectl exec -n "$NAMESPACE" "$pod" -- rm -f "/tmp/backup_${TIMESTAMP}.tar.gz" || true
            
            break # Use first successful backup
        done
        
        if [[ -f "$backup_file" ]]; then
            local backup_size=$(du -h "$backup_file" | cut -f1)
            log_success "Files backup completed: $backup_file (Size: $backup_size)"
            echo "$(date): Files backup completed - Size: $backup_size, File: $backup_file" >> "$BACKUP_DIR/logs/backup.log"
        else
            log_warning "No files backup created"
        fi
    else
        log_warning "No backend pods found for files backup"
    fi
}

# Full backup (database + files)
backup_full() {
    log_info "Starting full backup for $ENVIRONMENT environment..."
    
    backup_database
    backup_files
    
    log_success "Full backup completed"
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
    
    # Clean database backups
    find "$BACKUP_DIR/database" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean file backups
    find "$BACKUP_DIR/files" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean old log entries (keep last 100 lines)
    local log_file="$BACKUP_DIR/logs/backup.log"
    if [[ -f "$log_file" ]]; then
        tail -n 100 "$log_file" > "${log_file}.tmp" && mv "${log_file}.tmp" "$log_file"
    fi
    
    log_success "Old backups cleaned up"
}

# List existing backups
list_backups() {
    log_info "Existing backups for $ENVIRONMENT environment:"
    
    echo -e "\n=== Database Backups ==="
    if [[ -d "$BACKUP_DIR/database" ]]; then
        ls -lh "$BACKUP_DIR/database"/*.sql.gz 2>/dev/null || echo "No database backups found"
    else
        echo "No database backup directory found"
    fi
    
    echo -e "\n=== File Backups ==="
    if [[ -d "$BACKUP_DIR/files" ]]; then
        ls -lh "$BACKUP_DIR/files"/*.tar.gz 2>/dev/null || echo "No file backups found"
    else
        echo "No file backup directory found"
    fi
    
    echo -e "\n=== Backup Log ==="
    if [[ -f "$BACKUP_DIR/logs/backup.log" ]]; then
        tail -n 10 "$BACKUP_DIR/logs/backup.log"
    else
        echo "No backup log found"
    fi
}

# Restore database from backup
restore_database() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        log_error "No backup file specified for restore"
        echo "Usage: $0 $ENVIRONMENT restore_db <backup_file>"
        return 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_warning "This will overwrite the current database. Are you sure? (y/N)"
    read -r confirmation
    
    if [[ "$confirmation" != "y" && "$confirmation" != "Y" ]]; then
        log_info "Database restore cancelled"
        return 0
    fi
    
    log_info "Restoring database from: $backup_file"
    
    # Decompress and restore
    if [[ "$backup_file" == *.gz ]]; then
        zcat "$backup_file" | kubectl exec -i -n "$NAMESPACE" "$POSTGRES_POD" -- psql -U "$POSTGRES_USER" -d postgres
    else
        cat "$backup_file" | kubectl exec -i -n "$NAMESPACE" "$POSTGRES_POD" -- psql -U "$POSTGRES_USER" -d postgres
    fi
    
    if [[ $? -eq 0 ]]; then
        log_success "Database restore completed"
        echo "$(date): Database restored from $backup_file" >> "$BACKUP_DIR/logs/backup.log"
    else
        log_error "Database restore failed"
        return 1
    fi
}

# Monitor backup health
monitor_backup_health() {
    log_info "Monitoring backup health for $ENVIRONMENT environment..."
    
    local today=$(date +"%Y%m%d")
    local yesterday=$(date -d "yesterday" +"%Y%m%d")
    
    # Check if today's backup exists
    local today_backup=$(find "$BACKUP_DIR/database" -name "*${today}*.sql.gz" 2>/dev/null | head -n1)
    
    if [[ -n "$today_backup" ]]; then
        log_success "Today's backup found: $today_backup"
    else
        # Check for yesterday's backup
        local yesterday_backup=$(find "$BACKUP_DIR/database" -name "*${yesterday}*.sql.gz" 2>/dev/null | head -n1)
        
        if [[ -n "$yesterday_backup" ]]; then
            log_warning "No backup found for today, but yesterday's backup exists: $yesterday_backup"
        else
            log_error "No recent backups found!"
            return 1
        fi
    fi
    
    # Check backup sizes (should be reasonable)
    local backup_count=$(find "$BACKUP_DIR/database" -name "*.sql.gz" 2>/dev/null | wc -l)
    log_info "Total database backups: $backup_count"
    
    # Check disk space
    local disk_usage=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ "$disk_usage" -gt 80 ]]; then
        log_warning "Backup directory disk usage is high: ${disk_usage}%"
    else
        log_success "Backup directory disk usage: ${disk_usage}%"
    fi
}

# Main execution
main() {
    case "$BACKUP_TYPE" in
        "database"|"db")
            check_prerequisites
            create_backup_dir
            backup_database
            cleanup_old_backups
            monitor_backup_health
            ;;
            
        "files")
            check_prerequisites
            create_backup_dir
            backup_files
            cleanup_old_backups
            ;;
            
        "full")
            check_prerequisites
            create_backup_dir
            backup_full
            cleanup_old_backups
            monitor_backup_health
            ;;
            
        "list")
            list_backups
            ;;
            
        "restore_db")
            check_prerequisites
            restore_database "$3"
            ;;
            
        "health")
            monitor_backup_health
            ;;
            
        *)
            log_error "Invalid backup type: $BACKUP_TYPE"
            echo "Available types: database, files, full, list, restore_db, health"
            exit 1
            ;;
    esac
    
    log_success "Backup operation completed"
}

# Handle script interruption
trap 'log_error "Backup interrupted"; exit 1' INT TERM

# Run main function
main "$@" 