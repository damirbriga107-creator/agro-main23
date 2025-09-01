---
description: Repository Information Overview
alwaysApply: true
---

# Repository Information Overview

## Repository Summary
DaorsAgro is a comprehensive agricultural financial management platform that provides farmers with tools for financial tracking, subsidy management, insurance comparison, risk analytics, and document management with IoT integration capabilities.

## Repository Structure
- **backend/**: Contains microservices architecture with API gateway and various services
- **frontend-app/**: Main React-based web application using Vite
- **daorsagro-frontend/**: Alternative React frontend (appears to be a newer version)
- **mcp-servers/**: Model Context Protocol servers for various functionalities
- **infrastructure/**: Docker configurations and monitoring setup
- **scripts/**: Utility scripts for health checks and setup validation
- **docs/**: Project documentation

### Main Repository Components
- **API Gateway**: Central entry point for all microservices
- **Microservices**: Auth, Financial, Subsidy, Insurance, Analytics, Document, Notification, IoT
- **Frontend Applications**: React-based web applications
- **MCP Servers**: Specialized servers for database, API, filesystem, code analysis, and agricultural operations
- **Infrastructure**: Docker configurations for databases, message queues, and monitoring

## Projects

### Backend API Gateway
**Configuration File**: backend/api-gateway/package.json

#### Language & Runtime
**Language**: TypeScript/JavaScript
**Version**: Node.js 20+
**Build System**: TypeScript compiler
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- express: ^4.18.2
- helmet: ^7.1.0
- cors: ^2.8.5
- http-proxy-middleware: ^2.0.6
- winston: ^3.11.0
- redis: ^4.6.11

#### Build & Installation
```bash
npm install
npm run build
npm start
```

#### Docker
**Dockerfile**: backend/api-gateway/Dockerfile
**Configuration**: Exposed on port 3000, connects to all microservices

#### Testing
**Framework**: Jest
**Test Location**: backend/api-gateway/tests
**Run Command**:
```bash
npm test
```

### Frontend App
**Configuration File**: frontend-app/package.json

#### Language & Runtime
**Language**: TypeScript/JavaScript
**Version**: Node.js 20+
**Build System**: Vite
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- react: ^18.2.0
- react-dom: ^18.2.0
- react-router-dom: ^6.20.0
- zustand: ^4.4.7
- react-query: ^3.39.3
- tailwindcss: ^3.3.6
- recharts: ^2.8.0

#### Build & Installation
```bash
npm install
npm run build
npm run preview
```

#### Testing
**Framework**: Not explicitly defined
**Run Command**:
```bash
npm run lint
npm run type-check
```

### Daorsagro Frontend
**Configuration File**: daorsagro-frontend/package.json

#### Language & Runtime
**Language**: TypeScript/JavaScript
**Version**: Node.js 16+
**Build System**: Create React App
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- react: ^19.1.1
- react-dom: ^19.1.1
- react-scripts: 5.0.1

#### Build & Installation
```bash
npm install
npm run build
```

#### Testing
**Framework**: Jest with React Testing Library
**Test Location**: src/**/*.test.tsx
**Run Command**:
```bash
npm test
```

### MCP Servers
**Configuration File**: mcp-servers/package.json

#### Language & Runtime
**Language**: JavaScript
**Version**: Node.js 18+
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- @modelcontextprotocol/sdk: ^0.4.0
- express: ^4.18.2
- pg: ^8.11.0
- mongodb: ^6.0.0
- redis: ^4.6.0

#### Build & Installation
```bash
npm install
npm run start:all
```

#### Testing
**Framework**: Jest
**Run Command**:
```bash
npm test
```

## Docker Configuration
**Docker Compose**: docker-compose.yml, docker-compose.prod.yml
**Services**:
- Databases: PostgreSQL, MongoDB, Redis, ClickHouse, Elasticsearch
- Message Queue: Kafka with Zookeeper
- Microservices: API Gateway and 8 specialized services
- Frontend: Web application
- Monitoring: Prometheus and Grafana

**Run Commands**:
```bash
# Development
npm run docker:up

# Production
docker-compose -f docker-compose.prod.yml up -d
```