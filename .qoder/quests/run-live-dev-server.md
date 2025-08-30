# Live Development Server Setup for DaorsAgro Platform

## Overview

This document outlines the comprehensive setup and configuration for running a live development server for the DaorsAgro agricultural financial management platform. The platform employs a microservices architecture with both frontend and backend components running in a containerized Docker environment, providing a complete development ecosystem.

## Architecture

### Development Environment Stack

The live development server consists of multiple interconnected services:

```mermaid
graph TB
    subgraph "Frontend Layer"
        WEB[Web App - React/Vite]
    end

    subgraph "API Gateway"
        GW[API Gateway :3000]
    end

    subgraph "Microservices"
        AUTH[Auth Service :3001]
        FIN[Financial Service :3002]
        SUB[Subsidy Service :3003]
        INS[Insurance Service :3004]
        ANA[Analytics Service :3005]
        DOC[Document Service :3006]
        NOT[Notification Service :3007]
        IOT[IoT Service :3008]
    end

    subgraph "Data Layer"
        PG[PostgreSQL :5432]
        MG[MongoDB :27017]
        RD[Redis :6379]
        ES[Elasticsearch :9200]
        CH[ClickHouse :8123]
    end

    subgraph "Message Queue"
        KF[Kafka :9092]
        ZK[Zookeeper :2181]
    end

    subgraph "Monitoring"
        PR[Prometheus :9090]
        GR[Grafana :3001]
    end

    WEB --> GW
    GW --> AUTH
    GW --> FIN
    GW --> SUB
    GW --> INS
    GW --> ANA
    GW --> DOC
    GW --> NOT
    GW --> IOT

    AUTH --> PG
    FIN --> PG
    SUB --> PG
    INS --> PG
    DOC --> MG
    ANA --> CH
    
    AUTH --> RD
    FIN --> RD
    FIN --> KF
    FIN --> ES
    
    PR --> GW
    GR --> PR
```

### Service Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Web Application | 5173 | Frontend React app (Vite dev server) |
| API Gateway | 3000 | Main entry point for all API requests |
| Auth Service | 3001 | User authentication & authorization |
| Financial Service | 3002 | Financial transactions & reporting |
| Subsidy Service | 3003 | Agricultural subsidy management |
| Insurance Service | 3004 | Insurance policies & claims |
| Analytics Service | 3005 | Business intelligence & analytics |
| Document Service | 3006 | Document management system |
| Notification Service | 3007 | Real-time notifications |
| IoT Service | 3008 | IoT device data processing |
| PostgreSQL | 5432 | Primary relational database |
| MongoDB | 27017 | Document storage |
| Redis | 6379 | Caching & session storage |
| Elasticsearch | 9200 | Search engine & analytics |
| ClickHouse | 8123 | Time-series analytics database |
| Kafka | 9092 | Message broker |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3001 | Monitoring dashboards |

## Development Environment Setup

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | ≥20.0.0 LTS | Runtime environment |
| npm | ≥9.0.0 | Package manager |
| Docker | Latest | Container orchestration |
| Docker Compose | Latest | Multi-container management |
| Git | Latest | Version control |

### Environment Validation

Before starting the development server, validate your environment:

```mermaid
flowchart TD
    A[Start Setup] --> B[Check Node.js Version]
    B --> C{Node.js ≥20.0.0?}
    C -->|No| D[Install Node.js 20+ LTS]
    C -->|Yes| E[Check Docker Installation]
    E --> F{Docker Available?}
    F -->|No| G[Install Docker & Docker Compose]
    F -->|Yes| H[Validate Environment]
    D --> E
    G --> H
    H --> I[Start Development Server]
```

## Development Server Startup Process

### Step 1: Environment Preparation

Initialize the development environment with dependency installation:

| Command | Purpose | Execution Context |
|---------|---------|-------------------|
| `npm run install:all` | Install all workspace dependencies | Project root |
| `npm run validate` | Validate system requirements | Project root |

### Step 2: Infrastructure Services

Launch the containerized infrastructure services:

| Command | Purpose | Services Started |
|---------|---------|------------------|
| `npm run docker:up` | Start all Docker services | PostgreSQL, MongoDB, Redis, Kafka, Elasticsearch, ClickHouse |
| `npm run docker:logs` | Monitor service logs | All container logs |

### Step 3: Service Health Verification

Verify all infrastructure services are operational:

| Service | Health Check Command | Expected Response |
|---------|---------------------|------------------|
| PostgreSQL | `docker-compose exec postgres pg_isready -U postgres` | `accepting connections` |
| MongoDB | `docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"` | `{ ok: 1 }` |
| Redis | `docker-compose exec redis redis-cli ping` | `PONG` |
| Elasticsearch | `curl http://localhost:9200/_cluster/health` | `{"status":"green"}` |

### Step 4: Application Services

Start the development servers for frontend and backend:

| Mode | Command | Services |
|------|---------|----------|
| Full Stack | `npm run dev` | API Gateway + Web Application |
| Backend Only | `npm run dev:backend` | API Gateway + All Microservices |
| Frontend Only | `npm run dev:frontend` | Web Application (Vite dev server) |

### Step 5: Development Verification

Confirm all services are accessible:

| Endpoint | Service | Verification Method |
|----------|---------|-------------------|
| http://localhost:5173 | Web Application | Browser access |
| http://localhost:3000/health | API Gateway | HTTP GET request |
| http://localhost:3000/api/auth/health | Auth Service | API endpoint |
| http://localhost:9090 | Prometheus | Metrics dashboard |
| http://localhost:3001 | Grafana | Monitoring dashboard |

## Service Configuration

### Environment Variables

Each service requires specific environment configuration:

#### API Gateway Configuration
| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | development | Environment mode |
| `PORT` | 3000 | Service port |
| `JWT_SECRET` | dev-secret-key | Token signing |
| `REDIS_URL` | redis://redis:6379 | Cache connection |

#### Frontend Configuration
| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | development | Build mode |
| `VITE_API_URL` | http://localhost:3000 | Backend API endpoint |
| `VITE_APP_NAME` | DaorsAgro | Application name |
| `VITE_APP_VERSION` | 1.0.0 | Version identifier |

#### Database Configuration
| Variable | Value | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | postgresql://postgres:postgres123@postgres:5432/{db_name} | PostgreSQL connection |
| `MONGO_URL` | mongodb://mongo:mongo123@mongodb:27017/daorsagro | MongoDB connection |
| `REDIS_URL` | redis://redis:6379 | Redis connection |

### Hot Reload Configuration

Development services support hot reloading through volume mounts:

```mermaid
graph LR
    subgraph "Host Machine"
        HC[Host Code]
    end
    
    subgraph "Container"
        CC[Container Code]
        NS[nodemon/Vite]
    end
    
    HC -->|Volume Mount| CC
    CC --> NS
    NS -->|Auto Restart| CC
```

| Service Type | Hot Reload Tool | Configuration |
|--------------|-----------------|---------------|
| Backend Services | nodemon | Watches TypeScript files, auto-restarts on changes |
| Frontend | Vite HMR | Hot Module Replacement for React components |
| API Gateway | nodemon | Auto-restart on middleware/route changes |

## Development Workflow

### Code Modification Process

```mermaid
flowchart TD
    A[Modify Code] --> B[Save File]
    B --> C{Service Type}
    C -->|Backend| D[nodemon Detects Change]
    C -->|Frontend| E[Vite HMR Detects Change]
    D --> F[TypeScript Compilation]
    F --> G[Service Restart]
    G --> H[Changes Applied]
    E --> I[Hot Module Replacement]
    I --> H
    H --> J[Test Changes]
    J --> K{Changes Valid?}
    K -->|Yes| L[Continue Development]
    K -->|No| M[Check Logs]
    M --> N[Fix Issues]
    N --> A
```

### Service Integration Testing

Test API endpoints and service integration:

| Test Type | Command | Purpose |
|-----------|---------|---------|
| Health Checks | `npm run health:check` | Verify all services are running |
| Database Setup | `npm run db:setup` | Initialize database schemas |
| API Testing | `npm run test:endpoints` | Test REST API endpoints |
| Integration Tests | `npm run test:integration` | End-to-end service testing |

### Development Monitoring

Monitor system performance and service health:

| Monitoring Tool | URL | Purpose |
|-----------------|-----|---------|
| Prometheus | http://localhost:9090 | Metrics collection and queries |
| Grafana | http://localhost:3001 | Performance dashboards |
| Service Logs | `docker-compose logs -f <service>` | Real-time log monitoring |
| Container Status | `docker-compose ps` | Container health status |

## Troubleshooting

### Common Issues and Solutions

#### Port Conflicts
**Symptoms**: Service fails to start with "port already in use" error
**Solutions**:
1. Check port usage: `netstat -tulpn | grep <port>`
2. Kill conflicting process: `kill -9 <pid>`
3. Change port in docker-compose.yml

#### Database Connection Failures
**Symptoms**: Services cannot connect to databases
**Solutions**:
1. Verify database containers are running: `docker-compose ps`
2. Check database logs: `docker-compose logs postgres mongodb`
3. Validate connection strings in environment variables
4. Restart database services: `docker-compose restart postgres mongodb`

#### Memory/Resource Issues
**Symptoms**: Containers are killed or services become unresponsive
**Solutions**:
1. Increase Docker memory allocation (minimum 8GB recommended)
2. Monitor resource usage: `docker stats`
3. Stop unused services: `docker-compose stop <service>`

#### Frontend Build Issues
**Symptoms**: Vite fails to start or shows compilation errors
**Solutions**:
1. Clear node_modules: `rm -rf frontend/packages/web-app/node_modules`
2. Reinstall dependencies: `npm install`
3. Check TypeScript configuration
4. Verify environment variables

### Service Restart Commands

| Scope | Command | Purpose |
|-------|---------|---------|
| All Services | `docker-compose restart` | Restart entire stack |
| Single Service | `docker-compose restart <service>` | Restart specific service |
| Infrastructure | `docker-compose restart postgres mongodb redis` | Restart databases only |
| Application | `docker-compose restart api-gateway auth-service` | Restart app services |

### Log Analysis

Monitor and analyze service logs for debugging:

| Log Type | Command | Information Provided |
|----------|---------|---------------------|
| All Services | `docker-compose logs -f` | Combined log stream |
| Specific Service | `docker-compose logs -f <service>` | Service-specific logs |
| Error Only | `docker-compose logs --tail=100 <service> \| grep -i error` | Error messages |
| API Gateway | `docker-compose logs -f api-gateway` | Request routing logs |

## Performance Optimization

### Development Performance Tips

| Optimization | Implementation | Benefit |
|--------------|----------------|---------|
| Selective Service Startup | Start only required services | Reduced resource usage |
| Database Connection Pooling | Configure in shared utilities | Faster query execution |
| Redis Caching | Enable for frequently accessed data | Reduced database load |
| Code Splitting | Use dynamic imports in frontend | Faster page loads |

### Resource Management

Monitor and optimize resource usage:

```mermaid
pie title Development Environment Resource Usage
    "Databases (PostgreSQL, MongoDB)" : 30
    "Message Queue (Kafka)" : 20
    "Application Services" : 25
    "Frontend Development" : 15
    "Monitoring & Analytics" : 10
```

| Resource Type | Recommended Allocation | Monitoring Command |
|---------------|----------------------|-------------------|
| Memory | 8GB+ total system | `docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"` |
| CPU | 4+ cores | `docker stats --no-stream` |
| Disk Space | 10GB+ available | `docker system df` |
| Network | Stable internet for image pulls | `docker-compose pull` |























































































































































































