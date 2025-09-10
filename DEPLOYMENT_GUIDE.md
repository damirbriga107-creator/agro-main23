# DaorsAgro Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the DaorsAgro platform in a production and staging environment with enhanced backend architecture improvements, including increased replicas for critical services, resource limits, health checks, and S3 backup integration.

## Prerequisites

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+ recommended) or macOS
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: Minimum 50GB free disk space
- **Network**: Internet connectivity for pulling Docker images

### Required Software
```bash
# Install Docker (Ubuntu)
sudo apt update
sudo apt install docker.io docker-compose-plugin

# Install Docker (macOS with Homebrew)
brew install docker docker-compose

# Verify installations
docker --version
docker-compose --version
```

## Quick Start

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url> daorsagro
cd daorsagro

# Make scripts executable
chmod +x scripts/*.sh
```

### 2. Initialize Secrets
```bash
# Generate production secrets
./scripts/setup-secrets.sh

# This creates:
# - secrets/ directory with all password files
# - .env.secrets file for development use
```

### 3. Deploy to Production
```bash
# Full production deployment
./scripts/deploy-production.sh

# Alternative: Deploy specific components
./scripts/deploy-production.sh deploy
```

### 4. Verify Deployment
```bash
# Check service health
./scripts/deploy-production.sh health

# View logs
./scripts/deploy-production.sh logs api-gateway
```

## Staging Deployment

For Phase 1 staging using Docker Compose enhancements:

### 1. Staging Setup
```bash
# Use production compose for staging
docker-compose -f docker-compose.production.yml up -d

# Scale critical services (replicas=3 for api-gateway, auth-service, financial-service)
docker-compose -f docker-compose.production.yml up -d --scale api-gateway=3 --scale auth-service=3 --scale financial-service=3

# Verify health checks (depends_on with service_healthy)
docker-compose -f docker-compose.production.yml ps
```

### 2. Testing Staging
- Access Traefik dashboard at http://localhost:8080 to verify routing
- Test API endpoints via http://localhost:80/api (assuming Traefik config)
- Monitor resources with `docker stats`
- Run backup script: `./scripts/backup-to-s3.sh` (assumes AWS env vars set)

### 3. Enhancements Applied
- Replicas: 3 for api-gateway, auth-service, financial-service; 2 for frontend-app; 1 for others
- Resources: Services limited to 512M memory/0.25 CPU (reservations 256M/0.125); DBs to 4G/2.0 CPU (reservations 2G/1.0)
- Health Conditions: All depends_on use `condition: service_healthy` for reliable startup
- Backup: Volume backups to S3 via scripts/backup-to-s3.sh

## Architecture Overview

### Service Tiers

#### Database Tier
- **PostgreSQL**: Primary relational database for user data, transactions
- **MongoDB**: Document storage for farm data, IoT sensors, analytics
- **Redis**: Caching layer and session storage
- **Elasticsearch**: Full-text search and analytics

#### Application Tier
- **API Gateway**: Central entry point, rate limiting, caching
- **Auth Service**: Authentication and authorization
- **Financial Service**: Financial transactions and accounts
- **Analytics Service**: Data processing and reporting

#### Frontend Tier
- **React Application**: Modern web interface
- **Nginx**: Web server and reverse proxy

#### Monitoring Tier
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards

## Configuration

### Environment Variables

#### Database Configuration
```bash
# PostgreSQL
POSTGRES_URL=postgresql://agro_user@postgresql:5432/agro_production
POSTGRES_PASSWORD_FILE=/run/secrets/db_password

# MongoDB
MONGODB_URL=mongodb://admin@mongodb:27017/agro_production?authSource=admin
MONGODB_PASSWORD_FILE=/run/secrets/mongodb_root_password

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD_FILE=/run/secrets/redis_password
```

#### Application Configuration
```bash
# JWT Configuration
JWT_SECRET_FILE=/run/secrets/jwt_secret
JWT_REFRESH_SECRET_FILE=/run/secrets/jwt_refresh_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Gateway Caching
GW_CACHE_TTL=30

# Pool Settings
PG_POOL_MAX=20
MONGO_MAX_POOL=50
```

### Docker Secrets

Production deployment uses Docker Swarm secrets for security:

```bash
# Secrets are automatically created from files:
secrets/db_password.txt          → POSTGRES_PASSWORD_FILE
secrets/mongodb_root_password.txt → MONGODB_PASSWORD_FILE  
secrets/redis_password.txt       → REDIS_PASSWORD_FILE
secrets/jwt_secret.txt          → JWT_SECRET_FILE
secrets/jwt_refresh_secret.txt   → JWT_REFRESH_SECRET_FILE
```

## Service URLs

After deployment, services are available at:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost | React web application |
| API Gateway | http://localhost:3000 | REST API endpoint |
| Load Balancer | http://localhost:8080 | High-availability endpoint |
| Prometheus | http://localhost:9090 | Metrics and monitoring |
| Grafana | http://localhost:3001 | Dashboards (admin/admin) |

## Database Access

### PostgreSQL
```bash
# Connect to PostgreSQL
docker exec -it agro-postgresql psql -U agro_user -d agro_production

# Schemas available:
# - auth: User management and authentication
# - financial: Accounts and transactions  
# - analytics: User activities and reports
# - documents: File metadata and storage
# - audit: Audit logs and compliance
```

### MongoDB
```bash
# Connect to MongoDB
docker exec -it agro-mongodb mongosh agro_production

# Collections available:
# - farms: Farm management data
# - crops: Crop information and tracking
# - sensor_data: IoT sensor readings
# - weather_data: Weather information
# - analytics_reports: Generated reports
# - market_prices: Market price data
# - notifications: User notifications
```

## Management Commands

### Service Management
```bash
# For staging, use production compose file
docker-compose -f docker-compose.production.yml ps

# Restart specific service
docker-compose -f docker-compose.production.yml restart api-gateway

# Scale services for staging (e.g., critical services to 3 replicas)
docker-compose -f docker-compose.production.yml up -d --scale api-gateway=3 --scale auth-service=3 --scale financial-service=3

# View service logs
docker-compose -f docker-compose.production.yml logs -f api-gateway
```

### Data Management
```bash
# Create manual backup
./scripts/deploy-production.sh backup

# Stop all services
./scripts/deploy-production.sh stop

# View system resources
docker system df
docker volume ls
```

## Monitoring and Alerting

### Prometheus Metrics
Access Prometheus at http://localhost:9090

**Key Metrics:**
- `http_requests_total`: HTTP request counters
- `http_request_duration_seconds`: Response time histograms
- `up`: Service availability
- `postgresql_connections_active`: Database connections

### Grafana Dashboards
Access Grafana at http://localhost:3001 (admin/admin)

**Available Dashboards:**
- Service Health Overview
- Database Performance
- Business KPIs
- Infrastructure Monitoring

### Built-in Alerts
- Service Down (> 1 minute)
- High Error Rate (> 10% for 5 minutes)
- Database Connection High (> 80%)

## Backup and Recovery

### Automated Backups
```bash
# Backups are created automatically before deployment
# Location: ./backups/backup_YYYYMMDD_HHMMSS/
```

### S3 Backup Integration
For staging/production volume backups to S3:
```bash
# Run the backup script (assumes AWS CLI installed and env vars set)
./scripts/backup-to-s3.sh

# This backs up postgres_data, mongodb_data, etc., to s3://$S3_BACKUP_BUCKET/backups/
```

### Manual Backup
```bash
# Create backup
./scripts/deploy-production.sh backup

# Backups include:
# - PostgreSQL data dump
# - MongoDB data dump  
# - Redis data dump
# - Application logs
```

### Restoration
```bash
# Stop services
docker-compose -f docker-compose.enhanced.yml down

# Restore volumes from backup
docker run --rm -v postgres_data:/data -v ./backups/latest:/backup alpine \
  tar xzf /backup/postgres_data.tar.gz -C /data

# Restart services  
./scripts/deploy-production.sh
```

## Security Considerations

### Network Security
- Services run on isolated Docker network
- Database ports not exposed externally
- TLS termination at load balancer

### Access Control
- File-based secrets (not environment variables)
- Service-specific database users
- Role-based access control (RBAC)

### Data Protection
- Database encryption at rest
- Secure backup storage
- Audit logging for compliance

## Scaling and Performance

### Horizontal Scaling
```bash
# Scale API Gateway
docker-compose -f docker-compose.enhanced.yml up -d --scale api-gateway=3

# Scale Financial Service
docker-compose -f docker-compose.enhanced.yml up -d --scale financial-service=2
```

### Performance Tuning
- Connection pooling configured for optimal performance
- Redis caching for frequently accessed data
- Database indexes optimized for query patterns
- Resource limits prevent resource exhaustion

## Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check service logs
docker-compose -f docker-compose.enhanced.yml logs service-name

# Check resource usage
docker stats

# Verify secrets exist
ls -la secrets/
```

**Database connection errors:**
```bash
# Check database health
docker-compose -f docker-compose.enhanced.yml ps postgresql mongodb redis

# Test database connectivity
docker exec agro-postgresql pg_isready
docker exec agro-mongodb mongosh --eval "db.runCommand('ping')"
```

**Performance issues:**
```bash
# Monitor resource usage
docker stats

# Check application metrics
curl http://localhost:3000/metrics

# View cache hit rates
curl http://localhost:3000/api/v1/analytics/test -H "X-Request-ID: test"
```

### Log Analysis
```bash
# View aggregated logs
docker-compose -f docker-compose.enhanced.yml logs -f

# Search logs for errors
docker-compose -f docker-compose.enhanced.yml logs | grep ERROR

# Export logs for analysis
docker-compose -f docker-compose.enhanced.yml logs > deployment.log
```

## Development vs Production

### Development Setup
```bash
# Use development environment variables
cp .env.secrets .env

# Run with development compose file
docker-compose up -d
```

### Production Differences
- Docker Swarm secrets instead of .env files
- Resource limits and health checks enabled
- Multi-replica deployments for critical services
- Monitoring and alerting fully configured
- Automated backup and recovery procedures

## Support and Maintenance

### Regular Maintenance Tasks
1. **Weekly**: Review monitoring dashboards and logs
2. **Monthly**: Update Docker images and security patches
3. **Quarterly**: Review and rotate secrets
4. **Annually**: Full system backup and disaster recovery testing

### Performance Monitoring
- Monitor service response times
- Track database query performance
- Review resource utilization trends
- Analyze user activity patterns

### Capacity Planning
- Monitor storage growth patterns
- Track memory and CPU utilization
- Plan for seasonal usage spikes
- Scale resources proactively

## Contact and Support

For deployment issues or questions:

1. **Check logs**: Always review service logs first
2. **Consult documentation**: Refer to service-specific documentation
3. **Monitor dashboards**: Use Grafana for real-time system health
4. **Community support**: Consult project documentation and community forums

---

**⚠️ Important Notes:**
- Always backup data before major updates
- Test deployments in staging environment first
- Monitor services closely after deployment
- Keep secrets secure and rotate regularly
- Document any configuration changes

**🚀 Quick Commands Reference:**
```bash
# Deploy:     ./scripts/deploy-production.sh
# Health:     ./scripts/deploy-production.sh health  
# Logs:       ./scripts/deploy-production.sh logs [service]
# Backup:     ./scripts/deploy-production.sh backup
# Stop:       ./scripts/deploy-production.sh stop
```