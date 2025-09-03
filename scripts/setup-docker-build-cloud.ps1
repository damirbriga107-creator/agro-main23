# Docker Build Cloud Setup Script for DaorsAgro
# This script helps developers set up Docker Build Cloud for faster local builds

param(
    [Parameter(Mandatory=$false)]
    [string]$BuildCloudEndpoint = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipLogin = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$TestBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$ShowMetrics = $false
)

Write-Host "🚀 Docker Build Cloud Setup for DaorsAgro" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Check if Docker is installed and running
function Test-DockerInstallation {
    try {
        $dockerVersion = docker --version
        Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green
        
        $dockerInfo = docker info 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker daemon is running" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Docker daemon is not running. Please start Docker Desktop." -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Docker is not installed or not in PATH" -ForegroundColor Red
        Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
        return $false
    }
}

# Check if Docker Buildx is available
function Test-DockerBuildx {
    try {
        $buildxVersion = docker buildx version
        Write-Host "✅ Docker Buildx is available: $buildxVersion" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Docker Buildx is not available" -ForegroundColor Red
        Write-Host "Please update Docker Desktop to the latest version" -ForegroundColor Yellow
        return $false
    }
}

# Setup Docker Build Cloud builder
function Setup-BuildCloudBuilder {
    param([string]$Endpoint)
    
    Write-Host "🔧 Setting up Docker Build Cloud builder..." -ForegroundColor Yellow
    
    try {
        # Remove existing builder if it exists
        docker buildx rm daorsagro-cloud-builder 2>$null
        
        if ($Endpoint) {
            # Create builder with specific endpoint
            docker buildx create --name daorsagro-cloud-builder --driver cloud --endpoint $Endpoint
        } else {
            # Create builder with default cloud driver
            docker buildx create --name daorsagro-cloud-builder --driver cloud
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Build Cloud builder created successfully" -ForegroundColor Green
            
            # Use the new builder
            docker buildx use daorsagro-cloud-builder
            Write-Host "✅ Switched to Build Cloud builder" -ForegroundColor Green
            
            return $true
        } else {
            Write-Host "❌ Failed to create Build Cloud builder" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Error setting up Build Cloud builder: $_" -ForegroundColor Red
        return $false
    }
}

# Login to Docker Hub (required for Build Cloud)
function Login-DockerHub {
    if ($SkipLogin) {
        Write-Host "⏭️ Skipping Docker Hub login" -ForegroundColor Yellow
        return $true
    }
    
    Write-Host "🔐 Docker Hub login required for Build Cloud..." -ForegroundColor Yellow
    
    try {
        # Check if already logged in
        $loginCheck = docker info 2>$null | Select-String "Username:"
        if ($loginCheck) {
            Write-Host "✅ Already logged in to Docker Hub" -ForegroundColor Green
            return $true
        }
        
        Write-Host "Please enter your Docker Hub credentials:" -ForegroundColor Cyan
        $username = Read-Host "Username"
        $password = Read-Host "Password" -AsSecureString
        $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
        
        echo $passwordPlain | docker login --username $username --password-stdin
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully logged in to Docker Hub" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Failed to login to Docker Hub" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Error during Docker Hub login: $_" -ForegroundColor Red
        return $false
    }
}

# Test build with Build Cloud
function Test-BuildCloudBuild {
    Write-Host "🧪 Testing Build Cloud with a sample service..." -ForegroundColor Yellow
    
    try {
        # Build the API Gateway as a test
        $buildStart = Get-Date
        
        docker buildx build `
            --builder daorsagro-cloud-builder `
            --platform linux/amd64 `
            --cache-from type=registry,ref=ghcr.io/daorsagro/platform/api-gateway:buildcache `
            --cache-to type=registry,ref=ghcr.io/daorsagro/platform/api-gateway:buildcache,mode=max `
            -f backend/api-gateway/Dockerfile `
            --load `
            -t daorsagro/api-gateway:test `
            .
        
        $buildEnd = Get-Date
        $buildTime = ($buildEnd - $buildStart).TotalSeconds
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Test build completed successfully in $([math]::Round($buildTime, 2)) seconds" -ForegroundColor Green
            
            # Clean up test image
            docker rmi daorsagro/api-gateway:test 2>$null
            
            return $true
        } else {
            Write-Host "❌ Test build failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Error during test build: $_" -ForegroundColor Red
        return $false
    }
}

# Show Build Cloud metrics and benefits
function Show-BuildCloudMetrics {
    Write-Host "📊 Docker Build Cloud Benefits" -ForegroundColor Cyan
    Write-Host "==============================" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "🚀 Performance Improvements:" -ForegroundColor Green
    Write-Host "  • 3-5x faster builds with dedicated cloud machines"
    Write-Host "  • Shared cache across all team members"
    Write-Host "  • Parallel builds for multiple services"
    Write-Host "  • No local resource consumption"
    
    Write-Host ""
    Write-Host "💾 Cache Benefits:" -ForegroundColor Green
    Write-Host "  • Registry cache shared across builds"
    Write-Host "  • GitHub Actions cache integration"
    Write-Host "  • Persistent cache between builds"
    Write-Host "  • Automatic cache optimization"
    
    Write-Host ""
    Write-Host "🔧 Development Workflow:" -ForegroundColor Green
    Write-Host "  • Use 'docker-compose -f docker-compose.buildcloud.yml up' for local development"
    Write-Host "  • CI/CD automatically uses Build Cloud for production builds"
    Write-Host "  • Pull requests get fast feedback with cached builds"
    Write-Host "  • Consistent build environment across all developers"
    
    Write-Host ""
    Write-Host "📈 Expected Build Times:" -ForegroundColor Yellow
    Write-Host "  • API Gateway: ~2-3 minutes (vs 8-10 minutes locally)"
    Write-Host "  • Microservices: ~1-2 minutes each (vs 5-7 minutes locally)"
    Write-Host "  • Frontend: ~1-2 minutes (vs 4-6 minutes locally)"
    Write-Host "  • Full platform: ~5-8 minutes (vs 20-30 minutes locally)"
}

# Create local development configuration
function Create-LocalConfig {
    Write-Host "📝 Creating local development configuration..." -ForegroundColor Yellow
    
    $configContent = @"
# Docker Build Cloud Configuration for DaorsAgro
# Add this to your .env file or export as environment variables

# Build Cloud Settings
DOCKER_BUILDKIT=1
BUILDX_BUILDER=daorsagro-cloud-builder

# Registry Settings (for caching)
REGISTRY=ghcr.io
IMAGE_NAME=daorsagro/platform

# Development Settings
NODE_ENV=development
BUILD_TYPE=development

# Build Cloud Optimizations
BUILDX_CACHE_FROM=type=registry,type=gha
BUILDX_CACHE_TO=type=registry,mode=max,type=gha,mode=max
"@

    $configPath = Join-Path $PSScriptRoot "..\docker-build-cloud.env"
    $configContent | Out-File -FilePath $configPath -Encoding UTF8
    
    Write-Host "✅ Configuration saved to: $configPath" -ForegroundColor Green
    Write-Host "💡 Source this file in your shell: source docker-build-cloud.env" -ForegroundColor Cyan
}

# Main execution
function Main {
    Write-Host ""
    
    # Check prerequisites
    if (-not (Test-DockerInstallation)) {
        exit 1
    }
    
    if (-not (Test-DockerBuildx)) {
        exit 1
    }
    
    # Setup Build Cloud
    if (-not (Setup-BuildCloudBuilder -Endpoint $BuildCloudEndpoint)) {
        Write-Host "❌ Failed to setup Build Cloud. Please check your Docker subscription and try again." -ForegroundColor Red
        exit 1
    }
    
    # Login to Docker Hub
    if (-not (Login-DockerHub)) {
        Write-Host "⚠️ Docker Hub login failed. Build Cloud may not work properly." -ForegroundColor Yellow
    }
    
    # Test build if requested
    if ($TestBuild) {
        if (-not (Test-BuildCloudBuild)) {
            Write-Host "❌ Test build failed. Please check your setup." -ForegroundColor Red
            exit 1
        }
    }
    
    # Create local configuration
    Create-LocalConfig
    
    # Show metrics if requested
    if ($ShowMetrics) {
        Show-BuildCloudMetrics
    }
    
    Write-Host ""
    Write-Host "🎉 Docker Build Cloud setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Use 'docker-compose -f docker-compose.buildcloud.yml up' for development"
    Write-Host "2. Your CI/CD pipeline will automatically use Build Cloud"
    Write-Host "3. Run this script with -ShowMetrics to see performance benefits"
    Write-Host "4. Run with -TestBuild to verify everything is working"
    Write-Host ""
}

# Run main function
Main