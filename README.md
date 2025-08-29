# DaorsAgro - Agricultural Financial Management Platform

![DaorsAgro Logo](docs/assets/logo.png)

## 🌾 Overview

**DaorsAgro** is a comprehensive agricultural financial management platform that provides farmers with modern tools for financial tracking, subsidy management, insurance comparison, risk analytics, and document management with IoT integration capabilities.

## 🚀 Features

### 💰 Financial Management
- **Expense & Revenue Tracking**: Multi-crop financial tracking with seasonal reporting
- **Profitability Analysis**: Detailed crop-wise and season-wise analysis
- **Cash Flow Forecasting**: Predictive analytics for better financial planning
- **Budget Management**: Create and monitor budgets across different farm operations

### 🏛️ Subsidy Management
- **Government Program Integration**: Real-time subsidy program discovery
- **Application Automation**: Streamlined application process with deadline tracking
- **Eligibility Checker**: AI-powered eligibility assessment
- **Compliance Tracking**: Automated compliance monitoring and alerts

### 🛡️ Insurance Services
- **Multi-Provider Comparison**: Compare policies from different insurance providers
- **Risk Assessment**: AI-driven risk analysis based on farm data
- **Claims Management**: Digital claims processing and tracking
- **Premium Optimization**: Find the best coverage at optimal rates

### 📊 Analytics & Reporting
- **Business Intelligence**: Interactive dashboards and custom reports
- **Predictive Analytics**: ML-powered yield and market predictions
- **Market Intelligence**: Real-time commodity prices and trends
- **Performance Metrics**: KPI tracking and benchmarking

### 🌐 IoT Integration
- **Sensor Data Collection**: Weather stations, soil sensors, equipment monitoring
- **Real-time Monitoring**: Live data visualization and alerts
- **Automated Data Processing**: AI-powered data validation and insights
- **Device Management**: Comprehensive IoT device lifecycle management

## 🏗️ Architecture

DaorsAgro is built using modern microservices architecture with the following components:

### Backend Services
- **Authentication Service**: JWT-based auth with RBAC
- **Financial Service**: Transaction and analytics management
- **Subsidy Service**: Government program integration
- **Insurance Service**: Provider integration and risk assessment
- **Analytics Service**: ML-powered business intelligence
- **Document Service**: Digital document management with OCR
- **Notification Service**: Multi-channel notifications

### Frontend Applications
- **Web PWA**: React-based progressive web application
- **Mobile App**: React Native cross-platform mobile application
- **Admin Dashboard**: Administrative interface for system management

### Technology Stack
- **Frontend**: React 18+, TypeScript, Tailwind CSS, React Native
- **Backend**: Node.js, TypeScript, Express.js, Fastify
- **Databases**: PostgreSQL, MongoDB, Redis, Elasticsearch
- **Message Queue**: Apache Kafka, Redis
- **IoT Platform**: ThingsBoard, MQTT
- **Cloud**: AWS/Azure/GCP compatible
- **Monitoring**: Prometheus, Grafana, ELK Stack

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ LTS
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/daorsagro/platform.git
   cd daorsagro
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Start development environment**
   ```bash
   npm run docker:up
   npm run dev
   ```

4. **Access the applications**
   - Web App: http://localhost:5173
   - API Gateway: http://localhost:3000
   - Grafana Dashboard: http://localhost:3001 (admin/admin123)
   - Prometheus: http://localhost:9090

### Development Commands

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev

# Run tests
npm run test

# Build all packages
npm run build

# Lint and format code
npm run lint
npm run format

# Docker commands
npm run docker:build
npm run docker:up
npm run docker:down

# Database operations
npm run db:migrate
npm run db:seed
```

## 📁 Project Structure

```
daorsagro/
├── backend/
│   ├── services/              # Microservices
│   │   ├── auth-service/
│   │   ├── financial-service/
│   │   ├── subsidy-service/
│   │   ├── insurance-service/
│   │   ├── analytics-service/
│   │   ├── document-service/
│   │   └── notification-service/
│   ├── shared/                # Shared libraries
│   │   ├── types/
│   │   ├── utils/
│   │   ├── config/
│   │   └── database/
│   └── api-gateway/           # API Gateway
├── frontend/
│   ├── packages/
│   │   ├── web-app/           # React PWA
│   │   ├── mobile-app/        # React Native
│   │   ├── shared/            # Shared components
│   │   └── design-system/     # Design system
├── infrastructure/            # Infrastructure as code
├── docs/                      # Documentation
└── scripts/                   # Build and deployment scripts
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run specific service tests
npm run test --workspace=backend/services/auth-service
```

### Test Coverage
- **Unit Tests**: >80% coverage requirement
- **Integration Tests**: API endpoints and service interactions
- **E2E Tests**: Critical user workflows
- **Performance Tests**: Load and stress testing

## 📚 Documentation

- [API Documentation](docs/api/README.md)
- [User Guide](docs/user-guides/README.md)
- [Development Guide](docs/development/README.md)
- [Deployment Guide](docs/deployment/README.md)
- [Architecture Overview](docs/architecture/README.md)

## 🔒 Security

- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Input Validation**: Comprehensive validation and sanitization
- **Security Headers**: OWASP recommended security headers
- **Dependency Scanning**: Automated vulnerability scanning

## 🌍 Environment Variables

Create `.env` files for each service with the following variables:

```env
# Common
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db
MONGODB_URL=mongodb://user:pass@localhost:27017/db
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# External APIs
WEATHER_API_KEY=your-weather-api-key
GOVERNMENT_API_KEY=your-government-api-key
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards
- TypeScript for all code
- ESLint + Prettier for formatting
- Conventional Commits for commit messages
- 80%+ test coverage requirement

## 📊 Monitoring & Observability

### Metrics & Logs
- **Application Metrics**: Response time, error rate, throughput
- **Business Metrics**: User actions, feature usage, conversion rates
- **Infrastructure Metrics**: CPU, memory, disk, network usage
- **Custom Metrics**: Farm-specific KPIs and analytics

### Health Checks
All services expose health check endpoints for monitoring:
- `/health` - Basic health status
- `/health/detailed` - Detailed component health
- `/metrics` - Prometheus metrics endpoint

## 🚀 Deployment

### Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Check deployment status
docker-compose ps
```

### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/

# Check deployment status
kubectl get pods -n daorsagro
```

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Core financial management
- ✅ Basic subsidy integration
- ✅ Insurance comparison
- 🔄 Advanced analytics

### Phase 2 (Q1 2025)
- 🔄 IoT platform integration
- 🔄 Mobile application
- 🔄 Advanced AI/ML features
- 🔄 Blockchain integration

### Phase 3 (Q2 2025)
- 📋 Global market expansion
- 📋 Industry partnerships
- 📋 Open API ecosystem
- 📋 Sustainability tracking

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.daorsagro.com](https://docs.daorsagro.com)
- **Community**: [Discord Server](https://discord.gg/daorsagro)
- **Issues**: [GitHub Issues](https://github.com/daorsagro/platform/issues)
- **Email**: support@daorsagro.com

## 🙏 Acknowledgments

- Thanks to all contributors who have helped build DaorsAgro
- Special thanks to the agricultural community for their valuable feedback
- Built with ❤️ by the DaorsAgro team

---

**Made with 🌾 for farmers worldwide**