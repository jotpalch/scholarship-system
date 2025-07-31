# 🎓 Scholarship Management System

A comprehensive, production-ready scholarship application and approval management system built with modern technologies and professional architecture.

## 🏗️ Professional Architecture

```
scholarship-system/
├── apps/                      # Applications
│   ├── backend/              # FastAPI backend service
│   ├── frontend/             # Next.js frontend application
│   └── mock-student-api/     # Development mock services
├── tools/                    # Development & deployment tools
│   ├── scripts/              # Automation scripts
│   ├── docker/              # Docker configurations
│   └── infra/               # Infrastructure as code
├── docs/                    # Comprehensive documentation
└── config/                  # Shared configuration files
```

## ✨ Enterprise Features

- **🏢 Multi-role Support**: Students, Faculty, Admin, Super Admin with fine-grained permissions
- **📋 Complete Application Lifecycle**: Draft → Submit → Review → Approval workflow
- **📁 Enterprise Document Management**: File upload with OCR, virus scanning, and secure storage
- **🌐 Multi-language Support**: English/Chinese with dynamic switching
- **🔐 Security-First Design**: JWT authentication, role-based access, input validation
- **📧 Smart Notifications**: Email alerts for status changes and deadlines
- **💻 Modern UI/UX**: Responsive design with Tailwind CSS and shadcn/ui components

## 🚀 Quick Start

Get up and running in under 5 minutes:

```bash
# Clone and navigate
git clone <repository-url>
cd scholarship-system

# Start all services (auto-detects your IP)
make dev
# or
tools/scripts/start-with-ip.sh

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/docs
# MinIO Console: http://localhost:9001
```

## 📖 Professional Commands

Use our comprehensive Makefile for all operations:

```bash
make help          # Show all available commands
make install       # Install all dependencies
make dev           # Start development environment
make test          # Run comprehensive test suite
make build         # Build production artifacts
make docker-up     # Start with Docker
make lint          # Code quality checks
make format        # Auto-format code
make clean         # Clean all build artifacts
```

## 📚 Documentation

### Getting Started
- 🚀 [Quick Start Guide](docs/getting-started/quick-start.md)
- 📦 [Installation Guide](docs/getting-started/installation.md)
- 🔧 [Development Setup](docs/getting-started/development-setup.md)

### Architecture
- 🏗️ [System Overview](docs/architecture/system-overview.md)
- 🗄️ [Database Schema](docs/architecture/database-schema.md)
- 🔌 [API Design](docs/architecture/api-design.md)

### Features
- 👥 [User Management](docs/features/user-management.md)
- 🔐 [Authentication System](docs/features/authentication.md)
- 🧑‍💻 [Developer Profiles](docs/features/developer-profiles.md)

### Development
- 🧪 [Testing Guide](docs/development/testing.md)
- 🚀 [CI/CD Pipeline](docs/development/ci-cd.md)
- 📝 [Migration Guides](docs/development/migration-guides.md)

### Deployment
- 🐳 [Docker Setup](docs/deployment/docker-setup.md)
- 🌐 [Production Deployment](docs/deployment/production-deployment.md)

### Specifications
- 📋 [System Requirements (SRS)](docs/specifications/srs-v1.0.md)
- 📊 [Business Requirements](docs/specifications/requirements.md)

## 🔧 Development

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### Database Management
```bash
# Run migrations
./test-docker.sh migrate

# Seed test data
./test-docker.sh seed

# Reset database
./test-docker.sh reset-db
```

### Testing
```bash
# Run all tests
./test-docker.sh test

# Backend tests only
./test-docker.sh test-backend

# Frontend tests only
./test-docker.sh test-frontend

# E2E tests
./test-docker.sh test-e2e
```

## 📋 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - Student registration
- `POST /api/v1/auth/refresh` - Token refresh

### Applications
- `GET /api/v1/applications` - List applications (role-filtered)
- `POST /api/v1/applications` - Create application
- `GET /api/v1/applications/{id}` - Get application details
- `PUT /api/v1/applications/{id}` - Update application
- `POST /api/v1/applications/{id}/submit` - Submit for review

### Users
- `GET /api/v1/users/me` - Current user profile
- `PUT /api/v1/users/me` - Update profile
- `GET /api/v1/users` - List users (admin only)

## 🔒 Security Features

- **JWT Authentication** with role-based access control
- **Input Validation** with Pydantic and Zod
- **File Upload Security** with type/size restrictions and virus scanning
- **SQL Injection Protection** with parameterized queries
- **Rate Limiting** on API endpoints

## 🌐 Multi-language Support

Student-facing interfaces support English/Chinese switching:
- Dashboard and navigation
- Form labels and validation messages
- Email notifications

## 📊 Business Rules

### User Roles
- **Student**: Submit and manage applications
- **Faculty**: Review applications in their department
- **Admin**: Full system access
- **Super Admin**: System configuration and user management

### GPA Requirements
- Academic Excellence: 3.8+
- Merit-based: 3.5+
- Need-based: 2.5+
- Athletic: 2.0+
- International Student: 3.0+

### Application Status Flow
`Draft → Submitted → Under Review → Approved/Rejected`

## 🧪 Testing Strategy

- **Unit Tests**: 90% coverage target
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user workflows
- **Performance Tests**: p95 < 600ms response time

## 📈 Performance Targets

- **API Response Time**: p95 < 600ms
- **Page Load Time**: < 3 seconds
- **File Upload**: 10MB max per file
- **Concurrent Users**: 100+ simultaneous

## 🚀 Deployment

### Production Environment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with secrets
docker-compose -f docker-compose.prod.yml up -d
```

### Health Checks
All services include health checks for monitoring and auto-recovery.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- **Backend**: camelCase for variables/functions, PascalCase for classes
- **Frontend**: PascalCase for components, camelCase for variables
- **API Endpoints**: camelCase (e.g., `/getApplications`)
- **Database**: snake_case for tables and fields

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the [Documentation](docs/)
- Review the [API Documentation](http://localhost:8000/docs) when running

---

**Target Launch**: July 3, 2025

Built with ❤️ for education accessibility 