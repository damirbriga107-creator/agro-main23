# DaorsAgro Platform Health Check and Monitoring Guide

This document provides comprehensive information about health checks and monitoring capabilities across all services in the DaorsAgro platform.

## Overview

Each service in the DaorsAgro platform provides standardized health check endpoints and metrics collection. This enables:

- Service availability monitoring
- Performance tracking
- Automated alerting
- Load balancer health checks
- Container orchestration health probes

## Health Check Endpoints

### Standard Health Check Format

All services expose a `/health` endpoint that returns:

```json
{
  \"status\": \"healthy\" | \"degraded\" | \"unhealthy\",
  \"timestamp\": \"2024-01-01T12:00:00.000Z\",
  \"service\": \"service-name\",
  \"version\": \"1.0.0\",
  \"uptime\": 3600,
  \"checks\": {
    \"database\": {
      \"status\": \"healthy\",
      \"responseTime\": 50,
      \"message\": \"Database connection healthy\"
    },
    \"redis\": {
      \"status\": \"healthy\", 
      \"responseTime\": 5,
      \"message\": \"Redis connection healthy\"
    }
  }
}
```

### Service-Specific Health Checks

#### API Gateway (`http://localhost:3000/health`)
- **Dependencies**: Redis, Service Discovery
- **Additional Checks**: 
  - Service connectivity to all microservices
  - Circuit breaker status
  - Rate limiting functionality

#### Auth Service (`http://localhost:3001/health`)
- **Dependencies**: PostgreSQL, Redis
- **Additional Checks**:
  - JWT secret configuration
  - Email service connectivity
  - Token validation functionality

#### Financial Service (`http://localhost:3002/health`)
- **Dependencies**: PostgreSQL, Redis, Kafka, Elasticsearch
- **Additional Checks**:
  - Transaction processing capability
  - Budget calculation accuracy
  - Report generation functionality

#### Subsidy Service (`http://localhost:3003/health`)
- **Dependencies**: MongoDB, Redis, Kafka
- **Additional Checks**:
  - Government API connectivity
  - Application processing capability
  - Document storage functionality

#### Insurance Service (`http://localhost:3004/health`)
- **Dependencies**: MongoDB, Redis, Kafka
- **Additional Checks**:
  - Insurance provider API connectivity
  - Policy management functionality
  - Claims processing capability

#### Analytics Service (`http://localhost:3005/health`)
- **Dependencies**: ClickHouse, Redis, Kafka
- **Additional Checks**:
  - Data ingestion capability
  - Query performance
  - Real-time processing status

#### Document Service (`http://localhost:3006/health`)
- **Dependencies**: MongoDB, Redis, File Storage
- **Additional Checks**:
  - File upload/download capability
  - Storage quota status
  - Virus scanning functionality

#### Notification Service (`http://localhost:3007/health`)
- **Dependencies**: Redis, Kafka, SMTP
- **Additional Checks**:
  - Email delivery capability
  - SMS gateway connectivity
  - Push notification service status

#### IoT Service (`http://localhost:3008/health`)
- **Dependencies**: MongoDB, Redis, Kafka, MQTT
- **Additional Checks**:
  - MQTT broker connectivity
  - Device connectivity status
  - Data processing pipeline health

## Metrics Endpoints

### Standard Metrics Format

All services expose a `/metrics` endpoint that returns:

```json
{
  \"timestamp\": \"2024-01-01T12:00:00.000Z\",
  \"uptime\": 3600,
  \"service\": {
    \"name\": \"service-name\",
    \"version\": \"1.0.0\",
    \"environment\": \"development\"
  },
  \"requests\": {
    \"total\": 1500,
    \"successful\": 1450,
    \"failed\": 50,
    \"averageResponseTime\": 150,
    \"errorRate\": 0.033
  },
  \"system\": {
    \"memory\": {
      \"used\": 134217728,
      \"total\": 268435456,
      \"usage\": 0.5
    },
    \"cpu\": {
      \"usage\": 0.25
    }
  },
  \"custom\": {
    // Service-specific metrics
  }
}
```

### Service-Specific Metrics

#### API Gateway Metrics
- Request routing statistics
- Service response times
- Circuit breaker statistics
- Rate limiting statistics

#### Auth Service Metrics
- Login/logout statistics
- Token generation/validation rates
- Failed authentication attempts
- Session duration statistics

#### Financial Service Metrics
- Transaction volume and value
- Budget utilization rates
- Report generation times
- Data processing latency

#### Analytics Service Metrics
- Query execution times
- Data ingestion rates
- Dashboard view statistics
- Report generation statistics

#### IoT Service Metrics
- Connected device count
- Data ingestion rate
- Alert generation rate
- Device offline duration

## Health Check Status Definitions

### Healthy
- All dependencies are accessible
- Response times are within acceptable limits
- No critical errors detected
- Service is fully operational

### Degraded
- Some non-critical dependencies may be unavailable
- Response times are slower than optimal
- Service is operational but with reduced performance
- Some features may be limited

### Unhealthy
- Critical dependencies are unavailable
- Service cannot perform its core functions
- Response times exceed acceptable limits
- Immediate attention required

## Monitoring Integration

### Prometheus Integration

Health check endpoints can be scraped by Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'daorsagro-services'
    metrics_path: '/metrics'
    static_configs:
      - targets:
        - 'api-gateway:3000'
        - 'auth-service:3001'
        - 'financial-service:3002'
        - 'subsidy-service:3003'
        - 'insurance-service:3004'
        - 'analytics-service:3005'
        - 'document-service:3006'
        - 'notification-service:3007'
        - 'iot-service:3008'
```

### Docker Health Checks

All services include Docker health check commands:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\n  CMD curl -f http://localhost:3001/health || exit 1
```

### Kubernetes Probes

For Kubernetes deployment:

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: auth-service
    image: daorsagro/auth-service
    livenessProbe:
      httpGet:
        path: /health
        port: 3001
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /health
        port: 3001
      initialDelaySeconds: 5
      periodSeconds: 5
```

## Alerting Rules

### Critical Alerts
- Service health status is \"unhealthy\"
- Response time > 5 seconds
- Error rate > 5%
- Memory usage > 90%
- Disk usage > 85%

### Warning Alerts
- Service health status is \"degraded\"
- Response time > 2 seconds
- Error rate > 1%
- Memory usage > 75%
- Disk usage > 70%

## Health Check Best Practices

### For Service Developers

1. **Implement Comprehensive Checks**: Include all critical dependencies
2. **Use Appropriate Timeouts**: Health checks should complete quickly (< 5 seconds)
3. **Return Detailed Information**: Include specific error messages and response times
4. **Test Regularly**: Ensure health checks accurately reflect service state
5. **Monitor Dependencies**: Check both internal and external dependencies

### For Operations Teams

1. **Set Up Monitoring**: Configure Prometheus and Grafana dashboards
2. **Define Alert Rules**: Create appropriate alerting thresholds
3. **Test Failure Scenarios**: Regularly test how the system behaves during failures
4. **Document Runbooks**: Create procedures for responding to alerts
5. **Monitor Trends**: Look for patterns in health check data over time

## Troubleshooting Common Issues

### Service Reports Unhealthy

1. Check service logs for error messages
2. Verify database connectivity
3. Check Redis connection
4. Verify environment variables are set correctly
5. Ensure dependent services are running

### High Response Times

1. Check database query performance
2. Monitor memory usage
3. Verify network connectivity
4. Check for resource contention
5. Review recent deployments

### Intermittent Failures

1. Check for network instability
2. Monitor resource usage patterns
3. Review error logs for patterns
4. Check load balancer configuration
5. Verify service discovery is working

## Health Check Testing

### Manual Testing

```bash
# Test all service health endpoints
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Financial Service
curl http://localhost:3003/health  # Subsidy Service
curl http://localhost:3004/health  # Insurance Service
curl http://localhost:3005/health  # Analytics Service
curl http://localhost:3006/health  # Document Service
curl http://localhost:3007/health  # Notification Service
curl http://localhost:3008/health  # IoT Service
```

### Automated Testing

```bash
# Run health check validation script
node scripts/validate-setup.js

# Test with Docker Compose
docker-compose exec api-gateway curl http://localhost:3000/health
```

## Configuration

### Environment Variables

- `HEALTH_CHECK_INTERVAL`: How often to perform internal health checks (default: 30000ms)
- `HEALTH_CHECK_TIMEOUT`: Timeout for dependency checks (default: 5000ms)
- `ENABLE_METRICS`: Enable metrics collection (default: true)
- `METRICS_PORT`: Port for metrics endpoint (default: same as service port)

### Health Check Configuration

Each service can be configured with custom health check parameters:

```yaml
# docker-compose.yml
services:
  auth-service:
    environment:
      HEALTH_CHECK_INTERVAL: 30000
      HEALTH_CHECK_TIMEOUT: 5000
      ENABLE_DETAILED_HEALTH_CHECKS: true
```

This comprehensive health check and monitoring system ensures that the DaorsAgro platform maintains high availability and provides clear visibility into system health and performance.", "original_text": null}]