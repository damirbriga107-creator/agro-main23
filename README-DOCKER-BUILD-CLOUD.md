# Docker Build Cloud Integration

This document provides a quick start guide for using Docker Build Cloud with the DaorsAgro platform.

## 🚀 Quick Start

### 1. Setup Docker Build Cloud

```bash
# Run the setup script
npm run buildcloud:setup

# Or with test build
npm run buildcloud:test
```

### 2. Development with Build Cloud

```bash
# Use Build Cloud optimized compose file
npm run docker:up:cloud

# Or manually
docker-compose -f docker-compose.buildcloud.yml up -d
```

### 3. Benchmark Performance

```bash
# Compare local vs Build Cloud performance
npm run buildcloud:benchmark

# Benchmark specific services
powershell scripts/benchmark-builds.ps1 -Services @("api-gateway", "auth-service")
```

## 📊 Expected Performance Improvements

| Build Type | Local Time | Build Cloud Time | Improvement |
|------------|------------|------------------|-------------|
| Full Platform | 20-30 min | 5-8 min | 3-4x faster |
| Single Service | 5-7 min | 1-2 min | 3-5x faster |
| Frontend | 4-6 min | 1-2 min | 2-3x faster |

## 🔧 Configuration

### Required Secrets (GitHub Actions)

```
DOCKER_BUILD_CLOUD_ENDPOINT=your-endpoint
DOCKER_HUB_USERNAME=your-username
DOCKER_HUB_TOKEN=your-token
```

### Local Environment

```bash
# Source the generated configuration
source docker-build-cloud.env
```

## 📚 Documentation

For detailed information, see [docs/DOCKER_BUILD_CLOUD_GUIDE.md](docs/DOCKER_BUILD_CLOUD_GUIDE.md)

## 🛠️ Troubleshooting

### Common Issues

1. **Build Cloud not available**: Ensure Docker subscription includes Build Cloud
2. **Authentication failed**: Run `docker login` with Docker Hub credentials
3. **Builder not found**: Run `npm run buildcloud:setup` to recreate builder

### Debug Commands

```bash
# Check builder status
docker buildx ls

# Inspect builder
docker buildx inspect daorsagro-cloud-builder

# View build logs
docker buildx build --progress=plain ...
```

## 🎯 Benefits

- **3-5x faster builds** with dedicated cloud machines
- **Shared cache** across all team members and CI/CD
- **Parallel builds** for multiple microservices
- **Zero local resource consumption** during builds
- **Consistent build environment** across all developers

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the detailed guide in `docs/DOCKER_BUILD_CLOUD_GUIDE.md`
3. Contact the development team