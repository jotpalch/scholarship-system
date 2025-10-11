# GitHub Actions Deployment Guide

Complete guide for deploying the monitoring infrastructure using GitHub Actions and GitHub Secrets.

## Table of Contents

- [Overview](#overview)
- [Required GitHub Secrets](#required-github-secrets)
- [Deployment Workflow](#deployment-workflow)
- [Manual Deployment](#manual-deployment)
- [Troubleshooting](#troubleshooting)

## Overview

The monitoring stack is deployed using GitHub Actions workflows that:
1. Deploy the central monitoring server (Grafana, Loki, Prometheus, AlertManager)
2. Deploy monitoring agents on application VMs (staging/production)
3. Deploy monitoring agents on database VMs (staging/production)
4. Perform health checks to ensure all services are running
5. Verify Prometheus targets are UP and collecting metrics

**Workflow File**: `.github/workflows/deploy-monitoring-stack.yml`

## Required GitHub Secrets

### Monitoring Server Secrets

Configure these in GitHub repository settings → Secrets and variables → Actions:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `MONITORING_SERVER_HOST` | Monitoring server hostname or IP | `monitoring.example.com` |
| `MONITORING_SERVER_USER` | SSH username for monitoring server | `ubuntu` |
| `MONITORING_SERVER_SSH_KEY` | Private SSH key for monitoring server | `-----BEGIN RSA PRIVATE KEY-----...` |
| `GRAFANA_ADMIN_USER` | Grafana admin username | `admin` |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password | `SuperSecurePassword123!` |
| `GRAFANA_ROOT_URL` | Grafana public URL | `https://monitoring.example.com` |

### Alert Configuration Secrets (Optional)

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `ALERT_EMAIL_FROM` | Email sender address for alerts | No |
| `ALERT_SMTP_HOST` | SMTP server hostname | No |
| `ALERT_SMTP_PORT` | SMTP server port | No |
| `ALERT_SMTP_USER` | SMTP username | No |
| `ALERT_SMTP_PASSWORD` | SMTP password | No |
| `ALERT_SLACK_WEBHOOK` | Slack webhook URL for alerts | No |

### Staging Environment Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `STAGING_AP_HOST` | Staging application VM hostname | `staging-ap.example.com` |
| `STAGING_AP_USER` | SSH username for staging AP-VM | `ubuntu` |
| `STAGING_AP_SSH_KEY` | Private SSH key for staging AP-VM | `-----BEGIN RSA PRIVATE KEY-----...` |
| `STAGING_DB_HOST` | Staging database VM hostname | `staging-db.example.com` |
| `STAGING_DB_USER` | SSH username for staging DB-VM | `ubuntu` |
| `STAGING_DB_SSH_KEY` | Private SSH key for staging DB-VM | `-----BEGIN RSA PRIVATE KEY-----...` |

### Production Environment Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `PROD_AP_HOST` | Production application VM hostname | `prod-ap.example.com` |
| `PROD_AP_USER` | SSH username for production AP-VM | `ubuntu` |
| `PROD_AP_SSH_KEY` | Private SSH key for production AP-VM | `-----BEGIN RSA PRIVATE KEY-----...` |
| `PROD_DB_HOST` | Production database VM hostname | `prod-db.example.com` |
| `PROD_DB_USER` | SSH username for production DB-VM | `ubuntu` |
| `PROD_DB_SSH_KEY` | Private SSH key for production DB-VM | `-----BEGIN RSA PRIVATE KEY-----...` |

## Deployment Workflow

### Automatic Deployment

The workflow automatically triggers when:
- Changes are pushed to `main` branch in the `monitoring/` directory
- Changes are made to the workflow file itself

**Automatic deployments only deploy to Staging environment by default.**

### Manual Deployment

Trigger manual deployment for staging or production:

1. Go to GitHub Actions tab in your repository
2. Select "Deploy Monitoring Stack" workflow
3. Click "Run workflow"
4. Choose environment:
   - **staging**: Deploy to staging environment
   - **production**: Deploy to production environment
5. Click "Run workflow"

### Deployment Steps

The workflow performs these steps:

**1. Deploy Monitoring Server**
- Copies monitoring configuration to server
- Sets environment variables from GitHub secrets
- Pulls latest Docker images
- Starts/restarts monitoring stack
- Runs health checks on all 4 services

**2. Deploy Environment Monitoring (Staging or Production)**
- Copies Grafana Alloy configs to AP-VM and DB-VM
- Restarts monitoring agents
- Verifies all Prometheus targets are UP
- Reports any failed targets

**3. Health Verification**
- Grafana API health check
- Prometheus health check
- Loki readiness check
- AlertManager health check
- Prometheus targets status check

## Manual Deployment

If you prefer to deploy manually without GitHub Actions:

### Step 1: Set Up SSH Access

```bash
# On your local machine
ssh-copy-id user@monitoring-server
ssh-copy-id user@staging-ap-vm
ssh-copy-id user@staging-db-vm
ssh-copy-id user@prod-ap-vm  # For production
ssh-copy-id user@prod-db-vm  # For production
```

### Step 2: Deploy Monitoring Server

```bash
# Copy monitoring configuration
rsync -avz --delete ./monitoring/ user@monitoring-server:/opt/scholarship/monitoring/

# SSH to monitoring server
ssh user@monitoring-server

cd /opt/scholarship/monitoring

# Create .env file
cat > .env.monitoring << EOF
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=YourSecurePassword
GRAFANA_ROOT_URL=https://monitoring.example.com
GF_LOG_LEVEL=info
EOF

# Deploy monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Check health
docker-compose -f docker-compose.monitoring.yml ps
curl http://localhost:3000/api/health
curl http://localhost:9090/-/healthy
curl http://localhost:3100/ready
curl http://localhost:9093/-/healthy
```

### Step 3: Deploy Staging Monitoring

```bash
# Deploy to Staging AP-VM
scp ./monitoring/config/alloy/staging-ap-vm.alloy user@staging-ap-vm:/opt/scholarship/monitoring/config/alloy/
ssh user@staging-ap-vm "cd /opt/scholarship && docker-compose -f docker-compose.staging.yml up -d"

# Deploy to Staging DB-VM
scp ./monitoring/config/alloy/staging-db-vm.alloy user@staging-db-vm:/opt/scholarship/monitoring/config/alloy/
ssh user@staging-db-vm "cd /opt/scholarship && docker-compose -f docker-compose.staging-db.yml up -d"

# Verify targets
ssh user@monitoring-server "curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.environment==\"staging\") | {job: .labels.job, health: .health}'"
```

### Step 4: Deploy Production Monitoring (When Ready)

```bash
# Deploy to Production AP-VM
scp ./monitoring/config/alloy/prod-ap-vm.alloy user@prod-ap-vm:/opt/scholarship/monitoring/config/alloy/
ssh user@prod-ap-vm "cd /opt/scholarship && docker-compose -f docker-compose.prod.yml up -d"

# Deploy to Production DB-VM
scp ./monitoring/config/alloy/prod-db-vm.alloy user@prod-db-vm:/opt/scholarship/monitoring/config/alloy/
ssh user@prod-db-vm "cd /opt/scholarship && docker-compose -f docker-compose.prod-db.yml up -d"

# Verify targets
ssh user@monitoring-server "curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.environment==\"prod\") | {job: .labels.job, health: .health}'"
```

## Troubleshooting

### Deployment Fails - SSH Connection Error

**Symptom**: GitHub Actions workflow fails with "Permission denied (publickey)"

**Solution**:
1. Verify SSH key is correctly added to GitHub secrets
2. Ensure the private key format is correct (no extra line breaks)
3. Check that the public key is added to `~/.ssh/authorized_keys` on the server
4. Verify the SSH user has correct permissions:
   ```bash
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

### Deployment Succeeds But Services Don't Start

**Symptom**: Workflow completes but health checks fail

**Solution**:
```bash
# SSH to monitoring server
ssh user@monitoring-server

# Check container logs
docker-compose -f /opt/scholarship/monitoring/docker-compose.monitoring.yml logs --tail=100

# Check specific service
docker logs monitoring_grafana --tail=50
docker logs monitoring_prometheus --tail=50
docker logs monitoring_loki --tail=50

# Restart services
docker-compose -f /opt/scholarship/monitoring/docker-compose.monitoring.yml restart
```

### Prometheus Targets Showing as DOWN

**Symptom**: Prometheus reports targets as "DOWN" in `/targets` page

**Diagnosis**:
```bash
# Check if monitoring agents are running
ssh user@staging-ap-vm "docker ps | grep -E '(alloy|exporter)'"
ssh user@staging-db-vm "docker ps | grep -E '(alloy|exporter)'"

# Check Alloy logs
ssh user@staging-ap-vm "docker logs scholarship_alloy_staging_ap --tail=100"

# Test exporter endpoints directly
ssh user@staging-ap-vm "curl http://localhost:9100/metrics"  # Node Exporter
ssh user@staging-ap-vm "curl http://localhost:9113/metrics"  # Nginx Exporter
```

**Solution**:
1. Ensure all exporter containers are running
2. Check Docker network connectivity
3. Verify Prometheus scrape configuration
4. Restart monitoring services

### Loki Not Receiving Logs

**Symptom**: No logs visible in Grafana Explore or Loki queries return empty

**Diagnosis**:
```bash
# Check Alloy is pushing logs
ssh user@staging-ap-vm "docker logs scholarship_alloy_staging_ap | grep -i loki"

# Check Loki ingester
ssh user@monitoring-server "curl http://localhost:3100/ingester/ring | jq"

# Query Loki directly
curl -G -s "http://monitoring-server:3100/loki/api/v1/query" \
  --data-urlencode 'query={environment="staging"}' \
  --data-urlencode 'limit=10' \
  -H "X-Scope-OrgID: staging"
```

**Solution**:
1. Verify `X-Scope-OrgID` header is set correctly in Alloy config
2. Check Loki has sufficient disk space
3. Verify Loki is reachable from Alloy containers
4. Restart Loki and Alloy services

### GitHub Secrets Not Being Applied

**Symptom**: Services start with default values instead of secret values

**Solution**:
1. Verify secrets are correctly named (exact match including case)
2. Check secrets are set in the correct environment (staging/production)
3. Re-run workflow after updating secrets
4. Verify docker-compose uses `${VAR:-default}` pattern

### Workflow Permission Denied

**Symptom**: Workflow fails with "permission denied" when copying files

**Solution**:
```bash
# On target server, ensure deployment directory exists and has correct ownership
ssh user@monitoring-server "sudo mkdir -p /opt/scholarship/monitoring"
ssh user@monitoring-server "sudo chown -R user:user /opt/scholarship"
```

## Viewing Deployment Logs

### In GitHub Actions

1. Go to "Actions" tab
2. Click on the workflow run
3. Click on individual job steps to see logs
4. Download logs using "Download log archive" button

### On Servers

```bash
# View all monitoring services logs
ssh user@monitoring-server "docker-compose -f /opt/scholarship/monitoring/docker-compose.monitoring.yml logs --tail=200"

# View specific service logs
ssh user@monitoring-server "docker logs monitoring_grafana -f"
ssh user@monitoring-server "docker logs monitoring_prometheus -f"

# View Alloy logs on application VMs
ssh user@staging-ap-vm "docker logs scholarship_alloy_staging_ap -f"
ssh user@staging-db-vm "docker logs scholarship_alloy_staging_db -f"
```

## Rollback Procedure

If deployment causes issues, rollback to previous version:

```bash
# On monitoring server
ssh user@monitoring-server

cd /opt/scholarship/monitoring

# Stop current stack
docker-compose -f docker-compose.monitoring.yml down

# Restore from backup (if you have one)
# Or checkout previous version from git
git checkout <previous-commit>

# Start stack
docker-compose -f docker-compose.monitoring.yml up -d

# Verify
docker-compose -f docker-compose.monitoring.yml ps
```

## Security Best Practices

1. **Rotate SSH Keys Regularly**: Update GitHub secrets with new keys every 90 days
2. **Use Strong Passwords**: Grafana admin password should be at least 16 characters
3. **Limit SSH Key Access**: Use separate keys for staging and production
4. **Monitor Secret Usage**: Review GitHub Actions logs for any secret exposure
5. **Enable Branch Protection**: Require reviews for changes to monitoring configs
6. **Use Environment Protection**: Enable required reviewers for production deployments

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [SSH Key Authentication](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

---

**Last Updated**: 2025-01-11
**Maintained By**: Scholarship System Development Team
