# Cloud Deployment Guide for DaorsAgro Platform

This comprehensive guide covers deploying the DaorsAgro platform to various cloud providers using Docker containers and Kubernetes orchestration.

## 🌐 Supported Cloud Providers

- **Amazon Web Services (AWS)** - ECS, EKS, EC2
- **Microsoft Azure** - Container Instances, AKS, Virtual Machines
- **Google Cloud Platform (GCP)** - Cloud Run, GKE, Compute Engine
- **DigitalOcean** - App Platform, Kubernetes, Droplets
- **Docker Swarm** - Self-managed clusters
- **Local Deployment** - Development and testing

## 🚀 Quick Start

### Prerequisites

1. **Docker** and **Docker Compose** installed
2. **Cloud CLI** for your chosen provider
3. **Domain name** configured with DNS
4. **SSL certificates** (Let's Encrypt recommended)

### 1. Environment Setup

```bash
# Copy and configure environment file
cp .env.production.example .env.production

# Edit with your actual values
nano .env.production
```

### 2. Build and Push Images

```bash
# Build all images with Docker Build Cloud
npm run buildcloud:setup
npm run docker:build:cloud

# Or use the deployment script
powershell scripts/deploy-to-cloud.ps1 -Provider local -BuildImages -PushImages
```

### 3. Deploy to Cloud

```bash
# Deploy to your chosen provider
powershell scripts/deploy-to-cloud.ps1 -Provider aws -Environment production -Domain yourdomain.com

# Or use Docker Compose directly
docker-compose -f docker-compose.production.yml up -d
```

## ☁️ Cloud Provider Specific Deployments

### Amazon Web Services (AWS)

#### Option 1: AWS ECS (Recommended)

```bash
# Install AWS CLI and configure credentials
aws configure

# Deploy using ECS
powershell scripts/deploy-to-cloud.ps1 -Provider aws -Environment production -Domain yourdomain.com
```

#### Option 2: AWS EKS (Kubernetes)

```bash
# Create EKS cluster
eksctl create cluster --name daorsagro-production --region us-west-2

# Deploy using Helm
helm install daorsagro infrastructure/helm/daorsagro \
  --namespace daorsagro-production \
  --create-namespace \
  --values infrastructure/helm/daorsagro/values.yaml
```

#### Option 3: AWS EC2 with Docker Swarm

```bash
# Launch EC2 instances
aws ec2 run-instances --image-id ami-0abcdef1234567890 --count 3 --instance-type t3.medium

# Initialize Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.production.yml daorsagro
```

### Microsoft Azure

#### Option 1: Azure Container Instances

```bash
# Install Azure CLI and login
az login

# Deploy using ACI
powershell scripts/deploy-to-cloud.ps1 -Provider azure -Environment production -Domain yourdomain.com
```

#### Option 2: Azure Kubernetes Service (AKS)

```bash
# Create AKS cluster
az aks create --resource-group daorsagro-rg --name daorsagro-aks --node-count 3

# Get credentials
az aks get-credentials --resource-group daorsagro-rg --name daorsagro-aks

# Deploy using Helm
helm install daorsagro infrastructure/helm/daorsagro
```

### Google Cloud Platform (GCP)

#### Option 1: Cloud Run (Serverless)

```bash
# Install gcloud CLI and authenticate
gcloud auth login

# Deploy using Cloud Run
powershell scripts/deploy-to-cloud.ps1 -Provider gcp -Environment production -Domain yourdomain.com
```

#### Option 2: Google Kubernetes Engine (GKE)

```bash
# Create GKE cluster
gcloud container clusters create daorsagro-cluster --num-nodes=3

# Get credentials
gcloud container clusters get-credentials daorsagro-cluster

# Deploy using Helm
helm install daorsagro infrastructure/helm/daorsagro
```

### DigitalOcean

#### Option 1: App Platform (Managed)

```bash
# Install doctl CLI and authenticate
doctl auth init

# Deploy using App Platform
powershell scripts/deploy-to-cloud.ps1 -Provider digitalocean -Environment production -Domain yourdomain.com
```

#### Option 2: DigitalOcean Kubernetes

```bash
# Create Kubernetes cluster
doctl kubernetes cluster create daorsagro-k8s --count 3 --size s-2vcpu-2gb

# Get credentials
doctl kubernetes cluster kubeconfig save daorsagro-k8s

# Deploy using Helm
helm install daorsagro infrastructure/helm/daorsagro
```

## 🐳 Docker Deployment Options

### Production Docker Compose

```bash
# Deploy with production configuration
docker-compose -f docker-compose.production.yml up -d

# Scale services
docker-compose -f docker-compose.production.yml up -d --scale api-gateway=3 --scale auth-service=2
```

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.production.yml daorsagro

# Scale services
docker service scale daorsagro_api-gateway=3
```

## ☸️ Kubernetes Deployment

### Using Helm (Recommended)

```bash
# Add required Helm repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install the chart
helm install daorsagro infrastructure/helm/daorsagro \
  --namespace daorsagro-production \
  --create-namespace \
  --set app.domain=yourdomain.com \
  --set secrets.postgresPassword=your-secure-password
```

### Using kubectl

```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/production-deployment.yaml

# Check deployment status
kubectl get pods -n daorsagro-production
kubectl get services -n daorsagro-production
```

## 🔧 Configuration Management

### Environment Variables

Key environment variables to configure:

```bash
# Domain and SSL
DOMAIN=yourdomain.com
ACME_EMAIL=admin@yourdomain.com

# Database passwords
POSTGRES_PASSWORD=secure-postgres-password
MONGO_PASSWORD=secure-mongo-password
REDIS_PASSWORD=secure-redis-password

# JWT secrets
JWT_SECRET=your-super-secure-jwt-secret
JWT_REFRESH_SECRET=your-super-secure-refresh-secret

# External services
EMAIL_API_KEY=your-sendgrid-api-key
PAYMENT_API_KEY=your-stripe-api-key
S3_ACCESS_KEY=your-s3-access-key
S3_SECRET_KEY=your-s3-secret-key
```

### Secrets Management

#### Docker Swarm Secrets

```bash
# Create secrets
echo "secure-password" | docker secret create postgres_password -
echo "jwt-secret-key" | docker secret create jwt_secret -

# Use in compose file
secrets:
  postgres_password:
    external: true
```

#### Kubernetes Secrets

```bash
# Create secrets
kubectl create secret generic daorsagro-secrets \
  --from-literal=postgres-password=secure-password \
  --from-literal=jwt-secret=jwt-secret-key \
  -n daorsagro-production
```

## 🔒 Security Configuration

### SSL/TLS Certificates

#### Let's Encrypt with Traefik

```yaml
# Automatic SSL with Traefik
certificatesresolvers:
  letsencrypt:
    acme:
      tlschallenge: true
      email: admin@yourdomain.com
      storage: /letsencrypt/acme.json
```

#### Manual Certificate Management

```bash
# Generate certificates
certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Mount certificates in containers
volumes:
  - /etc/letsencrypt:/etc/ssl/certs:ro
```

### Network Security

#### Firewall Rules

```bash
# Allow only necessary ports
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw deny 3000:3010/tcp  # Block direct service access
```

#### Network Policies (Kubernetes)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: daorsagro-network-policy
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

## 📊 Monitoring and Logging

### Prometheus and Grafana

```bash
# Deploy monitoring stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

### Centralized Logging

```bash
# Deploy ELK stack
helm install elasticsearch elastic/elasticsearch
helm install kibana elastic/kibana
helm install filebeat elastic/filebeat
```

## 🔄 CI/CD Integration

### GitHub Actions Deployment

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Deploy to Cloud
      run: |
        powershell scripts/deploy-to-cloud.ps1 \
          -Provider ${{ secrets.CLOUD_PROVIDER }} \
          -Environment production \
          -Domain ${{ secrets.DOMAIN }}
```

## 🚨 Disaster Recovery

### Database Backups

```bash
# Automated PostgreSQL backups
docker exec postgres pg_dump -U postgres daorsagro > backup-$(date +%Y%m%d).sql

# MongoDB backups
docker exec mongodb mongodump --out /backup/$(date +%Y%m%d)
```

### Application Backups

```bash
# Backup application data
docker run --rm -v daorsagro_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/app-backup-$(date +%Y%m%d).tar.gz /data
```

## 📈 Scaling and Performance

### Horizontal Scaling

```bash
# Docker Swarm scaling
docker service scale daorsagro_api-gateway=5

# Kubernetes scaling
kubectl scale deployment api-gateway --replicas=5 -n daorsagro-production
```

### Auto-scaling

```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🛠️ Troubleshooting

### Common Issues

1. **Service Discovery Problems**
   ```bash
   # Check service connectivity
   docker exec api-gateway nslookup auth-service
   kubectl exec -it api-gateway -- nslookup auth-service
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connectivity
   docker exec api-gateway pg_isready -h postgres -p 5432
   ```

3. **SSL Certificate Problems**
   ```bash
   # Check certificate status
   docker logs traefik | grep acme
   kubectl logs -l app=cert-manager -n cert-manager
   ```

### Health Checks

```bash
# Check service health
curl -f https://api.yourdomain.com/health
curl -f https://yourdomain.com/health

# Kubernetes health checks
kubectl get pods -n daorsagro-production
kubectl describe pod api-gateway-xxx -n daorsagro-production
```

## 📞 Support and Maintenance

### Regular Maintenance Tasks

1. **Update Dependencies**
   ```bash
   # Update Docker images
   docker-compose pull
   docker-compose up -d
   
   # Update Helm chart
   helm upgrade daorsagro infrastructure/helm/daorsagro
   ```

2. **Monitor Resource Usage**
   ```bash
   # Check resource usage
   docker stats
   kubectl top pods -n daorsagro-production
   ```

3. **Review Logs**
   ```bash
   # Application logs
   docker-compose logs -f
   kubectl logs -f deployment/api-gateway -n daorsagro-production
   ```

### Getting Help

- Check the troubleshooting section above
- Review application logs for error messages
- Consult cloud provider documentation
- Contact the development team

---

**Note**: This guide provides comprehensive deployment options. Choose the approach that best fits your infrastructure requirements, team expertise, and budget constraints.