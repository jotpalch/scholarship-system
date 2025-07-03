# CI/CD Pipeline Guide

## Overview

This document describes the CI/CD pipeline for the Scholarship Management System. The pipeline is built using GitHub Actions and includes automated testing, security scanning, dependency updates, and deployment processes.

## Workflows

### 1. Main CI/CD Pipeline (`ci.yml`)

**Trigger**: Push to `main` or `develop` branches, Pull Requests

**Purpose**: Run all tests, security scans, and deploy to staging/production

**Jobs**:
- **frontend-test**: Runs linting and unit tests for the frontend
- **backend-test**: Runs linting, type checking, and unit tests for the backend
- **e2e-test**: Runs end-to-end tests using Playwright
- **security-scan**: Runs Trivy vulnerability scanner
- **build-deploy**: Builds Docker images and deploys to staging (main branch only)
- **performance-test**: Runs k6 performance tests (main branch only)
- **notify**: Sends notifications about pipeline status

**Key Features**:
- Parallel execution of frontend and backend tests
- Docker-based E2E testing with proper health checks
- Automatic deployment to staging on main branch
- Performance testing with k6
- Comprehensive test coverage reporting

### 2. CodeQL Analysis (`codeql.yml`)

**Trigger**: Push to `main`, Pull Requests, Weekly schedule (Thursday 11:34 PM)

**Purpose**: Perform static code analysis for security vulnerabilities

**Languages Analyzed**:
- Python
- TypeScript/JavaScript
- GitHub Actions

**Features**:
- Automated security vulnerability detection
- Integration with GitHub Security tab
- Custom query support

### 3. Dependency Updates (`dependency-update.yml`)

**Trigger**: Weekly (Monday 9 AM UTC), Manual dispatch

**Purpose**: Automatically update dependencies and create PRs

**Jobs**:
- **update-dependencies**: Updates npm and pip packages
- **security-audit**: Runs security audits and creates issues for vulnerabilities

**Features**:
- Separate PRs for frontend and backend updates
- Security vulnerability detection
- Automatic issue creation for critical vulnerabilities
- Preserves lockfiles for reproducible builds

### 4. Database Maintenance (`database-maintenance.yml`)

**Trigger**: Daily (2 AM UTC), Manual dispatch

**Purpose**: Database backup and maintenance tasks

**Jobs**:
- **database-backup**: Creates daily backups and uploads to S3
- **database-maintenance**: Runs VACUUM, ANALYZE, or REINDEX
- **cleanup-old-data**: Removes old draft applications and orphaned files

**Features**:
- Automated daily backups with 30-day retention
- Manual maintenance task execution
- Old data cleanup to prevent database bloat

## Environment Variables and Secrets

### Required GitHub Secrets

```yaml
# Authentication
GITHUB_TOKEN         # Automatically provided by GitHub
CODECOV_TOKEN       # For coverage reporting

# Deployment
DEPLOY_KEY          # SSH key for deployment
PRODUCTION_API_URL  # Production API endpoint

# Database
PRODUCTION_DATABASE_URL  # PostgreSQL connection string

# AWS (for backups)
AWS_ACCESS_KEY_ID      # AWS access key
AWS_SECRET_ACCESS_KEY  # AWS secret key
AWS_REGION            # AWS region
BACKUP_S3_BUCKET      # S3 bucket for backups
```

## Local Development

### Running CI Tests Locally

```bash
# Frontend tests
cd frontend
npm test
npm run lint

# Backend tests
cd backend
pytest
flake8 app
mypy app

# E2E tests with Docker
./test-docker.sh start
cd frontend
npm run test:e2e
```

### Simulating CI Environment

```bash
# Use act to run GitHub Actions locally
brew install act  # macOS
act -j frontend-test  # Run specific job
```

## Troubleshooting

### Common Issues

1. **E2E Tests Failing**
   - Check if all services are healthy: `docker ps`
   - View logs: `./test-docker.sh logs`
   - Ensure ports 3000, 8000, 5432, 6379, 9000, 9001 are free

2. **Build Failures**
   - Check Docker build logs in the workflow
   - Ensure all environment variables are set
   - Verify Dockerfile syntax

3. **Dependency Update Conflicts**
   - Review the generated PR carefully
   - Run tests locally before merging
   - Check for breaking changes in major updates

### Debugging Workflows

```yaml
# Add debug logging to a step
- name: Debug step
  run: |
    echo "::debug::Debug message"
    echo "ENV_VAR=$ENV_VAR"
  env:
    ACTIONS_STEP_DEBUG: true
```

## Best Practices

1. **Always test locally first**
   - Run linters and tests before pushing
   - Use pre-commit hooks for automatic checks

2. **Keep dependencies updated**
   - Review and merge dependency PRs promptly
   - Test thoroughly after updates

3. **Monitor performance**
   - Check k6 test results regularly
   - Investigate any performance degradation

4. **Security first**
   - Address security vulnerabilities immediately
   - Review CodeQL and Trivy scan results

5. **Use semantic versioning**
   - Tag releases properly
   - Update CHANGELOG.md

## Workflow Customization

### Adding New Tests

```yaml
# Add to ci.yml
- name: Run new tests
  run: |
    npm run test:new
  working-directory: ./frontend
```

### Modifying Deployment

```yaml
# Update build-deploy job
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: |
    kubectl apply -f k8s/production/
```

### Adding Notifications

```yaml
# Add to notify job
- name: Send Slack notification
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Build ${{ needs.build-deploy.result }}"
      }
```

## Maintenance Schedule

- **Daily**: Database backups (2 AM UTC)
- **Weekly**: Dependency updates (Monday 9 AM UTC)
- **Weekly**: CodeQL analysis (Thursday 11:34 PM UTC)

## Contact

For CI/CD issues or questions:
- Create an issue with the `ci/cd` label
- Check workflow run logs for detailed error messages
- Review this guide for common solutions