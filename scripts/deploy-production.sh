#!/bin/bash

# deploy-production.sh - Production deployment script for DaorsAgro platform
# This script handles the complete production deployment including secrets, database setup, and service orchestration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.enhanced.yml}
BACKUP_DIR="${PROJECT_ROOT}/backups"
LOG_FILE="${PROJECT_ROOT}/logs/deployment.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker daemon."
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if required files exist
    if [ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
    fi
    
    # Check available disk space (require at least 10GB)
    AVAILABLE_SPACE=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $4}')
    REQUIRED_SPACE=$((10 * 1024 * 1024)) # 10GB in KB
    
    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        error "Insufficient disk space. Required: 10GB, Available: $(($AVAILABLE_SPACE / 1024 / 1024))GB"
    fi
    
    log "✅ Prerequisites check completed"
}

# Setup directories
setup_directories() {
    log "📁 Setting up directories..."
    
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/backups"
    mkdir -p "$PROJECT_ROOT/secrets"
    mkdir -p "$PROJECT_ROOT/config"
    mkdir -p "$PROJECT_ROOT/monitoring/prometheus"
    mkdir -p "$PROJECT_ROOT/monitoring/grafana/provisioning"
    mkdir -p "$PROJECT_ROOT/monitoring/grafana/dashboards"
    mkdir -p "$PROJECT_ROOT/nginx"
    
    log "✅ Directories setup completed"
}

# Setup secrets
setup_secrets() {
    log "🔐 Setting up secrets..."
    
    if [ ! -f "$PROJECT_ROOT/secrets/db_password.txt" ]; then
        info "Running secrets setup script..."
        cd "$PROJECT_ROOT"
        ./scripts/setup-secrets.sh
    else
        log "Secrets already exist, skipping generation"
    fi
    
    log "✅ Secrets setup completed"
}

# Create configuration files
create_configs() {
    log "⚙️  Creating configuration files..."
    
    # Redis configuration
    cat > "$PROJECT_ROOT/config/redis.conf" << EOF
# Redis configuration for DaorsAgro production
maxmemory-policy allkeys-lru
maxmemory 256mb
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
EOF
    
    # Prometheus configuration
    cat > "$PROJECT_ROOT/monitoring/prometheus/prometheus.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules.yml"

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:3000']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:3001']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'financial-service'
    static_configs:
      - targets: ['financial-service:3002']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'analytics-service'
    static_configs:
      - targets: ['analytics-service:3005']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgresql:5432']

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb:27017']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
EOF

    # Prometheus alerting rules
    cat > "$PROJECT_ROOT/monitoring/prometheus/rules.yml" << EOF
groups:
  - name: daorsagro_alerts
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ \$labels.instance }} is down"
          description: "{{ \$labels.instance }} has been down for more than 1 minute."

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate on {{ \$labels.instance }}"
          description: "Error rate is above 10% for 5 minutes"

      - alert: DatabaseConnectionHigh
        expr: postgresql_connections_active / postgresql_connections_max > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High database connection usage"
          description: "PostgreSQL connection usage is above 80%"
EOF

    # Nginx load balancer configuration
    cat > "$PROJECT_ROOT/nginx/load-balancer.conf" << EOF
events {
    worker_connections 1024;
}

http {
    upstream api_backend {
        least_conn;
        server api-gateway:3000 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 80;
        
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        location / {
            proxy_pass http://api_backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
            
            # Retry configuration
            proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
            proxy_next_upstream_tries 2;
        }
    }
}
EOF

    log "✅ Configuration files created"
}

# Build Docker images
build_images() {
    log "🐳 Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build API Gateway
    if [ -d "backend/api-gateway" ]; then
        info "Building API Gateway image..."
        docker-compose -f "$COMPOSE_FILE" build api-gateway
    fi
    
    # Build services
    for service in auth financial analytics; do
        if [ -d "backend/services/${service}-service" ]; then
            info "Building ${service} service image..."
            docker-compose -f "$COMPOSE_FILE" build "${service}-service" || warn "Failed to build ${service}-service, continuing..."
        fi
    done
    
    # Build frontend
    if [ -d "frontend-app" ]; then
        info "Building frontend image..."
        docker-compose -f "$COMPOSE_FILE" build frontend || warn "Failed to build frontend, continuing..."
    fi
    
    log "✅ Docker images built successfully"
}

# Create backup before deployment
create_backup() {
    log "💾 Creating backup before deployment..."
    
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup existing data volumes if they exist
    if docker volume ls | grep -q postgres_data; then
        info "Backing up PostgreSQL data..."
        docker run --rm -v postgres_data:/data -v "$BACKUP_PATH:/backup" alpine \
            tar czf "/backup/postgres_data.tar.gz" -C /data .
    fi
    
    if docker volume ls | grep -q mongodb_data; then
        info "Backing up MongoDB data..."
        docker run --rm -v mongodb_data:/data -v "$BACKUP_PATH:/backup" alpine \
            tar czf "/backup/mongodb_data.tar.gz" -C /data .
    fi
    
    if docker volume ls | grep -q redis_data; then
        info "Backing up Redis data..."
        docker run --rm -v redis_data:/data -v "$BACKUP_PATH:/backup" alpine \
            tar czf "/backup/redis_data.tar.gz" -C /data .
    fi
    
    # Keep only last 5 backups
    cd "$BACKUP_DIR"
    ls -dt backup_* | tail -n +6 | xargs -r rm -rf
    
    log "✅ Backup created: $BACKUP_NAME"
    echo "$BACKUP_NAME" > "$BACKUP_DIR/.latest"
}

# Deploy services
deploy_services() {
    log "🚀 Deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images for base services
    info "Pulling base images..."
    docker-compose -f "$COMPOSE_FILE" pull postgresql mongodb redis elasticsearch prometheus grafana nginx-lb
    
    # Stop existing services gracefully
    info "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" down --timeout 60 || warn "Some services failed to stop gracefully"
    
    # Start infrastructure services first
    info "Starting infrastructure services..."
    docker-compose -f "$COMPOSE_FILE" up -d postgresql mongodb redis elasticsearch
    
    # Wait for infrastructure services to be healthy
    info "Waiting for infrastructure services to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" ps postgresql | grep -q "healthy" && \
           docker-compose -f "$COMPOSE_FILE" ps mongodb | grep -q "healthy" && \
           docker-compose -f "$COMPOSE_FILE" ps redis | grep -q "healthy"; then
            log "Infrastructure services are ready"
            break
        fi
        
        attempt=$((attempt + 1))
        info "Attempt $attempt/$max_attempts - Infrastructure services not ready yet..."
        sleep 10
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "Infrastructure services failed to become healthy within $(($max_attempts * 10)) seconds"
    fi
    
    # Start application services
    info "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" up -d api-gateway auth-service financial-service analytics-service
    
    # Start frontend and monitoring
    info "Starting frontend and monitoring services..."
    docker-compose -f "$COMPOSE_FILE" up -d frontend prometheus grafana nginx-lb
    
    log "✅ All services deployed successfully"
}

# Wait for services to be healthy
wait_for_services() {
    log "⏳ Waiting for services to be fully operational..."
    
    local services=("api-gateway" "auth-service" "financial-service" "frontend")
    local max_wait=300 # 5 minutes
    local interval=15
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        local healthy_count=0
        
        for service in "${services[@]}"; do
            if docker-compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "healthy\|Up"; then
                healthy_count=$((healthy_count + 1))
            fi
        done
        
        if [ $healthy_count -eq ${#services[@]} ]; then
            log "All services are operational"
            return 0
        fi
        
        info "Services healthy: $healthy_count/${#services[@]} - waiting..."
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    warn "Some services may not be fully operational after $max_wait seconds"
}

# Run health checks
run_health_checks() {
    log "🏥 Running health checks..."
    
    local base_url="http://localhost:3000"
    local max_attempts=10
    local attempt=0
    
    info "Checking API Gateway health..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$base_url/health" > /dev/null; then
            log "✅ API Gateway is healthy"
            break
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -eq $max_attempts ]; then
            error "API Gateway health check failed"
        fi
        
        sleep 5
    done
    
    # Check individual services
    local services=("auth" "financial" "analytics")
    for service in "${services[@]}"; do
        info "Checking ${service} service..."
        if curl -f -s "http://localhost:300$(($(echo ${services[@]} | tr ' ' '\n' | grep -n $service | cut -d: -f1) + 0))/health" > /dev/null 2>&1; then
            log "✅ ${service} service is healthy"
        else
            warn "${service} service health check failed"
        fi
    done
    
    log "✅ Health checks completed"
}

# Display deployment summary
show_deployment_summary() {
    log "📋 Deployment Summary"
    echo ""
    info "🌐 Application URLs:"
    echo "   Frontend:          http://localhost"
    echo "   API Gateway:       http://localhost:3000"
    echo "   Load Balancer:     http://localhost:8080"
    echo "   Prometheus:        http://localhost:9090"
    echo "   Grafana:           http://localhost:3001"
    echo ""
    info "🗄️  Database Connections:"
    echo "   PostgreSQL:        localhost:5432"
    echo "   MongoDB:           localhost:27017"
    echo "   Redis:             localhost:6379"
    echo "   Elasticsearch:     localhost:9200"
    echo ""
    info "📊 Service Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    info "💾 Data Volumes:"
    docker volume ls | grep -E "(postgres|mongodb|redis|elasticsearch|prometheus|grafana)_data" || echo "   No data volumes found"
    echo ""
    info "🔧 Management Commands:"
    echo "   View logs:         docker-compose -f $COMPOSE_FILE logs -f [service]"
    echo "   Stop all:          docker-compose -f $COMPOSE_FILE down"
    echo "   Restart service:   docker-compose -f $COMPOSE_FILE restart [service]"
    echo "   Scale service:     docker-compose -f $COMPOSE_FILE up -d --scale [service]=N"
    echo ""
    log "🎉 Deployment completed successfully!"
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        error "Deployment failed. Check logs at: $LOG_FILE"
        info "To rollback, run: docker-compose -f $COMPOSE_FILE down && ./scripts/restore-backup.sh"
    fi
}

# Main deployment function
main() {
    trap cleanup EXIT
    
    log "🚀 Starting DaorsAgro production deployment..."
    log "Environment: $ENVIRONMENT"
    log "Compose File: $COMPOSE_FILE"
    log "Project Root: $PROJECT_ROOT"
    
    check_prerequisites
    setup_directories
    setup_secrets
    create_configs
    build_images
    create_backup
    deploy_services
    wait_for_services
    run_health_checks
    show_deployment_summary
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    backup)
        create_backup
        ;;
    health)
        run_health_checks
        ;;
    logs)
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-api-gateway}"
        ;;
    stop)
        docker-compose -f "$COMPOSE_FILE" down --timeout 60
        ;;
    restart)
        docker-compose -f "$COMPOSE_FILE" restart "${2:-}"
        ;;
    *)
        echo "Usage: $0 {deploy|backup|health|logs|stop|restart}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full production deployment (default)"
        echo "  backup   - Create backup of current data"
        echo "  health   - Run health checks"
        echo "  logs     - View service logs (specify service name)"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart service (specify service name)"
        exit 1
        ;;
esac