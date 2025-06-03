# Scholarship System Infrastructure

This directory contains all infrastructure configuration and automation scripts for the Scholarship Application and Approval Management System.

## 📁 Directory Structure

```
infra/
├── k8s/                    # Kubernetes manifests
│   ├── dev/               # Development environment
│   │   ├── deployment.yaml
│   │   └── ingress.yaml
│   └── prod/              # Production environment
│       ├── deployment.yaml
│       └── ingress.yaml
├── helm/                  # Helm charts
│   ├── Chart.yaml
│   └── values.yaml
└── scripts/               # Automation scripts
    ├── deploy.sh         # Deployment automation
    ├── backup.sh         # Database backup utilities
    └── load-test.sh      # Performance testing
```

## 🚀 Quick Start

### Prerequisites

1. **Kubernetes cluster** (local with minikube/kind or cloud provider)
2. **kubectl** configured with cluster access
3. **Helm 3.x** for production deployments
4. **Docker** for building images

### Development Environment Setup

```bash
# Deploy to development environment
./scripts/deploy.sh dev deploy

# Check deployment status
./scripts/deploy.sh dev status

# Clean up development environment
./scripts/deploy.sh dev cleanup
```

### Production Environment Setup

```bash
# Deploy to production using Helm
./scripts/deploy.sh prod deploy

# Upgrade production deployment
./scripts/deploy.sh prod upgrade

# Check production status
./scripts/deploy.sh prod status
```

## 🛠 Components

### Backend (FastAPI)
- **Image**: `scholarship-backend:latest`
- **Port**: 8000
- **Replicas**: 3 (prod), 2 (dev)
- **Features**: Auto-scaling, health checks, security contexts

### Frontend (Next.js)
- **Image**: `scholarship-frontend:latest`
- **Port**: 3000
- **Replicas**: 3 (prod), 2 (dev)
- **Features**: Auto-scaling, static asset caching

### Database (PostgreSQL 15)
- **Port**: 5432
- **Storage**: Persistent volumes with SSD storage class
- **Features**: Performance tuning, backup automation

### Cache (Redis 7)
- **Port**: 6379
- **Features**: Memory optimization, persistence configuration

### Ingress (NGINX)
- **Features**: SSL termination, rate limiting, security headers
- **Domains**: 
  - Production: `scholarship.edu.tw`, `api.scholarship.edu.tw`
  - Development: `scholarship-dev.local`

## 📜 Scripts Usage

### 🚀 Deploy Script (`deploy.sh`)

Automates deployment, upgrades, and status checking.

```bash
# Basic usage
./scripts/deploy.sh [environment] [action]

# Examples
./scripts/deploy.sh dev deploy      # Deploy to development
./scripts/deploy.sh prod upgrade    # Upgrade production
./scripts/deploy.sh staging status  # Check staging status
./scripts/deploy.sh prod rollback   # Rollback production
./scripts/deploy.sh dev cleanup     # Clean up development
```

**Actions:**
- `deploy` - Fresh deployment
- `upgrade` - Update existing deployment
- `rollback` - Rollback to previous version
- `status` - Check deployment status
- `cleanup` - Remove all resources

### 💾 Backup Script (`backup.sh`)

Manages database and file backups with rotation.

```bash
# Basic usage
./scripts/backup.sh [environment] [type]

# Examples
./scripts/backup.sh prod database    # Backup production database
./scripts/backup.sh prod full        # Full backup (DB + files)
./scripts/backup.sh prod list        # List existing backups
./scripts/backup.sh prod health      # Check backup health
./scripts/backup.sh prod restore_db ./backups/prod/database/backup.sql.gz
```

**Backup Types:**
- `database` / `db` - Database only
- `files` - Application files only
- `full` - Database + files
- `list` - Show existing backups
- `restore_db` - Restore from backup
- `health` - Check backup status

**Features:**
- Automatic compression (gzip)
- 30-day retention policy
- Integrity testing
- Backup health monitoring

### 🔧 Load Test Script (`load-test.sh`)

Performance and stress testing for the application.

```bash
# Basic usage
./scripts/load-test.sh [environment] [test_type] [duration]

# Examples
./scripts/load-test.sh dev light 60        # Light load test for 60s
./scripts/load-test.sh staging medium 120  # Medium load test for 2 minutes
./scripts/load-test.sh prod heavy 300      # Heavy load test for 5 minutes
./scripts/load-test.sh prod spike 30       # Spike test for 30s
./scripts/load-test.sh prod endurance 3600 # Endurance test for 1 hour
```

**Test Types:**
- `light` - 5 concurrent users, 10 RPS
- `medium` - 15 concurrent users, 30 RPS
- `heavy` - 50 concurrent users, 100 RPS
- `spike` - 100 concurrent users, 200 RPS
- `endurance` - 10 concurrent users, long duration

**Features:**
- Multi-tool testing (curl, Apache Bench, hey)
- Comprehensive reporting
- Resource monitoring
- CSV result exports

## 🌍 Environment Configuration

### Development Environment
- **Domain**: `scholarship-dev.local`
- **Resources**: Limited (256Mi-512Mi RAM, 250m-500m CPU)
- **Storage**: 10Gi
- **SSL**: Disabled
- **Replicas**: 2 per service

### Staging Environment
- **Domain**: `staging.scholarship.edu.tw`
- **Resources**: Medium (512Mi-1Gi RAM, 500m-1000m CPU)
- **Storage**: 50Gi
- **SSL**: Enabled
- **Replicas**: 2 per service

### Production Environment
- **Domain**: `scholarship.edu.tw`
- **Resources**: High (512Mi-2Gi RAM, 500m-1000m CPU)
- **Storage**: 100Gi with fast SSD
- **SSL**: Enforced with Let's Encrypt
- **Replicas**: 3+ per service with auto-scaling
- **Features**: 
  - Network policies
  - Pod disruption budgets
  - Horizontal pod autoscaling
  - Enhanced security contexts

## 🔒 Security Features

### Network Security
- Network policies restricting pod communication
- Ingress-only external access
- Rate limiting on API endpoints
- DDoS protection

### Container Security
- Non-root containers
- Read-only root filesystems where possible
- Dropped Linux capabilities
- Security contexts enforced

### SSL/TLS
- Automatic certificate management with cert-manager
- Let's Encrypt integration
- SSL redirect enforcement
- HSTS headers

### Secrets Management
- Kubernetes secrets for sensitive data
- Base64 encoded configuration
- Separate secrets per environment

## 📊 Monitoring & Observability

### Health Checks
- Liveness probes on all containers
- Readiness probes for traffic routing
- Custom health endpoints

### Metrics (Optional)
- Prometheus integration ready
- Grafana dashboard templates
- Custom metrics collection

### Logging
- Centralized logging via Kubernetes
- Application log aggregation
- Audit logging for security events

## 🔧 Customization

### Helm Values Override

Create environment-specific values files:

```yaml
# infra/helm/values-staging.yaml
backend:
  replicaCount: 2
  resources:
    limits:
      memory: "1Gi"
      cpu: "500m"

postgresql:
  primary:
    persistence:
      size: 50Gi
```

### Environment Variables

Customize through Kubernetes ConfigMaps or Helm values:

```yaml
backend:
  env:
    LOG_LEVEL: "DEBUG"
    WORKERS: "2"
    CUSTOM_SETTING: "value"
```

## 🐛 Troubleshooting

### Common Issues

1. **Pod Stuck in Pending State**
   ```bash
   kubectl describe pod <pod-name> -n scholarship-dev
   # Check for resource constraints or scheduling issues
   ```

2. **Database Connection Issues**
   ```bash
   kubectl logs -f deployment/scholarship-backend -n scholarship-prod
   # Check logs for connection errors
   ```

3. **Ingress Not Working**
   ```bash
   kubectl get ingress -n scholarship-prod
   kubectl describe ingress scholarship-ingress -n scholarship-prod
   ```

### Debug Commands

```bash
# Get all resources in namespace
kubectl get all -n scholarship-prod

# Check pod logs
kubectl logs -f <pod-name> -n <namespace>

# Execute into pod
kubectl exec -it <pod-name> -n <namespace> -- /bin/bash

# Port forward for testing
kubectl port-forward svc/scholarship-backend 8080:8000 -n scholarship-dev
```

### Performance Issues

1. **Check resource usage**
   ```bash
   kubectl top pods -n scholarship-prod
   kubectl top nodes
   ```

2. **Review autoscaling**
   ```bash
   kubectl get hpa -n scholarship-prod
   kubectl describe hpa scholarship-backend-hpa -n scholarship-prod
   ```

3. **Database performance**
   ```bash
   # Run backup health check
   ./scripts/backup.sh prod health
   
   # Check database logs
   kubectl logs scholarship-postgres-0 -n scholarship-prod
   ```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)

## 🤝 Contributing

When modifying infrastructure:

1. Test changes in development environment first
2. Update documentation for any new features
3. Follow the project's naming conventions (camelCase)
4. Ensure scripts are executable and properly tested
5. Update Helm values for new configuration options

## 📞 Support

For infrastructure-related issues:
- Check the troubleshooting section above
- Review pod logs and events
- Contact the DevOps team
- Create an issue in the project repository

---

**Last Updated**: $(date +"%Y-%m-%d")  
**Version**: 1.0.0 