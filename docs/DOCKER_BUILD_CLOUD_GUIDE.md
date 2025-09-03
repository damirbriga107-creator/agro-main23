# Docker Build Cloud Integration Guide

This guide explains how to leverage Docker Build Cloud in the DaorsAgro platform for faster builds, shared caching, and improved CI/CD performance.

## 🚀 Overview

Docker Build Cloud provides dedicated build machines and shared cache to dramatically improve build speeds:

- **3-5x faster builds** with dedicated cloud machines
- **Shared cache** across all team members and CI/CD
- **Parallel builds** for multiple microservices
- **Zero local resource consumption** during builds

## 📋 Prerequisites

1. **Docker Desktop** with Build Cloud subscription
2. **Docker Hub account** (required for Build Cloud authentication)
3. **GitHub repository** with appropriate secrets configured

## 🔧 Setup Instructions

### 1. Local Development Setup

Run the setup script to configure Build Cloud locally:

```powershell
# Windows PowerShell
.\scripts\setup-docker-build-cloud.ps1 -TestBuild -ShowMetrics

# Or with custom endpoint
.\scripts\setup-docker-build-cloud.ps1 -BuildCloudEndpoint "your-endpoint" -TestBuild
```

### 2. GitHub Repository Secrets

Add these secrets to your GitHub repository:

```
DOCKER_BUILD_CLOUD_ENDPOINT=your-build-cloud-endpoint
DOCKER_HUB_USERNAME=your-docker-hub-username
DOCKER_HUB_TOKEN=your-docker-hub-access-token
```

### 3. Environment Configuration

Source the generated configuration:

```bash
# Linux/macOS
source docker-build-cloud.env

# Windows PowerShell
Get-Content docker-build-cloud.env | ForEach-Object { 
    if ($_ -match '^([^=]+)=(.*)$') { 
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') 
    } 
}
```

## 🏗️ Build Configurations

### Development Builds

Use the optimized Docker Compose file for local development:

```bash
# Start with Build Cloud optimizations
docker-compose -f docker-compose.buildcloud.yml up

# Build specific service with Build Cloud
docker buildx build \
  --builder daorsagro-cloud-builder \
  --platform linux/amd64 \
  --cache-from type=registry,ref=ghcr.io/daorsagro/platform/api-gateway:buildcache \
  --cache-to type=registry,ref=ghcr.io/daorsagro/platform/api-gateway:buildcache,mode=max \
  -f backend/api-gateway/Dockerfile \
  -t daorsagro/api-gateway:dev \
  .
```

### Production Builds

The CI/CD pipeline automatically uses Build Cloud for production builds:

```yaml
# Automatically configured in .github/workflows/ci-cd.yml
- name: Set up Docker Buildx with Build Cloud
  uses: docker/setup-buildx-action@v3
  with:
    driver: cloud
    endpoint: ${{ secrets.DOCKER_BUILD_CLOUD_ENDPOINT }}
```

## 📊 Performance Metrics

### Expected Build Times

| Component | Local Build | Build Cloud | Improvement |
|-----------|-------------|-------------|-------------|
| API Gateway | 8-10 min | 2-3 min | 3-4x faster |
| Microservices | 5-7 min | 1-2 min | 3-5x faster |
| Frontend | 4-6 min | 1-2 min | 2-3x faster |
| Full Platform | 20-30 min | 5-8 min | 3-4x faster |

### Cache Hit Rates

- **First build**: ~20-30% cache hit (base images)
- **Subsequent builds**: ~80-90% cache hit (shared layers)
- **Team builds**: ~85-95% cache hit (shared team cache)

## 🔄 CI/CD Integration

### GitHub Actions Workflows

The platform includes two optimized workflows:

1. **Production Pipeline** (`.github/workflows/ci-cd.yml`)
   - Full builds with security scanning
   - Multi-platform builds (amd64, arm64)
   - Registry and GitHub Actions cache
   - SBOM and provenance generation

2. **Development Pipeline** (`.github/workflows/docker-build-cloud-dev.yml`)
   - Fast PR builds with Build Cloud
   - Single platform builds (amd64)
   - Aggressive caching for speed
   - Smoke tests for built images

### Cache Strategy

```yaml
cache-from: |
  type=registry,ref=ghcr.io/daorsagro/platform/service:buildcache
  type=gha,scope=service
cache-to: |
  type=registry,ref=ghcr.io/daorsagro/platform/service:buildcache,mode=max
  type=gha,scope=service,mode=max
```

## 🛠️ Troubleshooting

### Common Issues

1. **Build Cloud Authentication Failed**
   ```bash
   # Ensure Docker Hub login
   docker login
   
   # Verify builder
   docker buildx ls
   ```

2. **Cache Not Working**
   ```bash
   # Check cache references
   docker buildx imagetools inspect ghcr.io/daorsagro/platform/api-gateway:buildcache
   
   # Clear local cache if needed
   docker buildx prune
   ```

3. **Builder Not Found**
   ```bash
   # Recreate builder
   docker buildx rm daorsagro-cloud-builder
   docker buildx create --name daorsagro-cloud-builder --driver cloud
   docker buildx use daorsagro-cloud-builder
   ```

### Debug Commands

```bash
# Check builder status
docker buildx inspect daorsagro-cloud-builder

# View build history
docker buildx build --progress=plain ...

# Check cache usage
docker system df
docker buildx du
```

## 📈 Optimization Tips

### Dockerfile Best Practices

1. **Multi-stage builds** for smaller final images
2. **Layer caching** with proper COPY order
3. **Build arguments** for environment-specific builds
4. **Health checks** for container reliability

### Cache Optimization

1. **Separate dependency installation** from source code
2. **Use .dockerignore** to exclude unnecessary files
3. **Order layers** from least to most frequently changed
4. **Leverage base image caching** with consistent tags

### Development Workflow

1. **Use Build Cloud** for all builds (local and CI/CD)
2. **Share cache** across team members
3. **Parallel builds** for multiple services
4. **Fast feedback** with PR builds

## 🔍 Monitoring and Metrics

### Build Metrics Collection

The CI/CD pipeline automatically collects build metrics:

```yaml
- name: Collect Build Cloud metrics
  run: |
    echo "## Docker Build Cloud Performance Report" >> $GITHUB_STEP_SUMMARY
    # Metrics collection logic
```

### Performance Dashboard

Monitor build performance through:

- GitHub Actions summary reports
- Docker Build Cloud dashboard
- Custom metrics collection scripts

## 🚀 Advanced Features

### Multi-Platform Builds

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --builder daorsagro-cloud-builder \
  ...
```

### Build Attestations

```yaml
provenance: mode=max
sbom: true
```

### Custom Build Arguments

```yaml
build-args: |
  NODE_ENV=production
  BUILD_TYPE=optimized
  ENABLE_FEATURES=analytics,monitoring
```

## 📚 Additional Resources

- [Docker Build Cloud Documentation](https://docs.docker.com/build/cloud/)
- [Docker Buildx Reference](https://docs.docker.com/buildx/)
- [GitHub Actions Docker Guide](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images)

## 🤝 Contributing

When contributing to the project:

1. Test builds locally with Build Cloud
2. Ensure cache optimization in Dockerfiles
3. Update build configurations as needed
4. Monitor build performance metrics

## 📞 Support

For Build Cloud issues:

1. Check the troubleshooting section above
2. Review Docker Build Cloud documentation
3. Contact the development team
4. Open an issue in the repository

---

**Note**: Docker Build Cloud requires a subscription. Contact your team lead for access and configuration details.