# Quick Cloud Deployment Script for DaorsAgro Platform
# Simplified deployment for testing and development

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("local", "staging", "production")]
    [string]$Environment = "local",
    
    [Parameter(Mandatory=$false)]
    [string]$Domain = "localhost",
    
    [Parameter(Mandatory=$false)]
    [switch]$BuildImages = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$CleanStart = $false
)

Write-Host "🚀 DaorsAgro Quick Deployment" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Configuration based on environment
$composeFile = switch ($Environment) {
    "local" { "docker-compose.yml" }
    "staging" { "docker-compose.buildcloud.yml" }
    "production" { "docker-compose.production.yml" }
}

$envFile = switch ($Environment) {
    "local" { ".env" }
    "staging" { ".env.staging" }
    "production" { ".env.production" }
}

Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Compose File: $composeFile" -ForegroundColor Yellow
Write-Host "Environment File: $envFile" -ForegroundColor Yellow
Write-Host "Domain: $Domain" -ForegroundColor Yellow

# Check if environment file exists
if (-not (Test-Path $envFile)) {
    Write-Host "⚠️ Environment file not found: $envFile" -ForegroundColor Yellow
    
    if ($Environment -eq "local") {
        Write-Host "Creating basic local environment file..." -ForegroundColor Cyan
        
        $localEnv = @"
# Local Development Environment
NODE_ENV=development
DOMAIN=$Domain
POSTGRES_PASSWORD=postgres123
MONGO_PASSWORD=mongo123
REDIS_PASSWORD=redis123
JWT_SECRET=local-jwt-secret-key-for-development-only
JWT_REFRESH_SECRET=local-refresh-secret-key-for-development-only
GRAFANA_PASSWORD=admin123
"@
        $localEnv | Out-File -FilePath $envFile -Encoding UTF8
        Write-Host "✅ Created basic environment file: $envFile" -ForegroundColor Green
    } else {
        Write-Host "❌ Please create $envFile with required configuration" -ForegroundColor Red
        Write-Host "Copy from $envFile.example and fill in your values" -ForegroundColor Yellow
        exit 1
    }
}

# Clean start if requested
if ($CleanStart) {
    Write-Host "🧹 Cleaning up existing deployment..." -ForegroundColor Yellow
    
    try {
        docker-compose -f $composeFile down -v --remove-orphans
        docker system prune -f
        Write-Host "✅ Cleanup completed" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Cleanup had some issues, continuing..." -ForegroundColor Yellow
    }
}

# Build images if requested
if ($BuildImages) {
    Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
    
    try {
        # Check if Build Cloud is available
        $builders = docker buildx ls
        if ($builders -match "daorsagro-cloud-builder.*cloud") {
            Write-Host "Using Docker Build Cloud for faster builds..." -ForegroundColor Cyan
            docker-compose -f docker-compose.buildcloud.yml build
        } else {
            Write-Host "Using local Docker build..." -ForegroundColor Cyan
            docker-compose -f $composeFile build
        }
        
        Write-Host "✅ Images built successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Image build failed: $_" -ForegroundColor Red
        exit 1
    }
}

# Deploy the application
Write-Host "🚀 Deploying application..." -ForegroundColor Yellow

try {
    # Start services
    docker-compose -f $composeFile --env-file $envFile up -d
    
    Write-Host "✅ Services started successfully" -ForegroundColor Green
    
    # Wait for services to be ready
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    # Check service health
    Write-Host "🏥 Checking service health..." -ForegroundColor Yellow
    
    $services = @(
        @{ Name = "API Gateway"; Url = "http://$Domain`:3000/health" },
        @{ Name = "Frontend"; Url = "http://$Domain`:5173" }
    )
    
    foreach ($service in $services) {
        try {
            $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 10 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $($service.Name) is healthy" -ForegroundColor Green
            } else {
                Write-Host "⚠️ $($service.Name) returned status $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ $($service.Name) is not responding" -ForegroundColor Red
        }
    }
    
    # Show deployment information
    Write-Host ""
    Write-Host "🎉 Deployment completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access your application:" -ForegroundColor Cyan
    Write-Host "  Frontend: http://$Domain`:5173" -ForegroundColor White
    Write-Host "  API: http://$Domain`:3000" -ForegroundColor White
    Write-Host "  API Health: http://$Domain`:3000/health" -ForegroundColor White
    
    if ($Environment -ne "local") {
        Write-Host "  Traefik Dashboard: http://$Domain`:8080" -ForegroundColor White
        Write-Host "  Grafana: http://grafana.$Domain" -ForegroundColor White
        Write-Host "  Prometheus: http://prometheus.$Domain" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "📊 Service Status:" -ForegroundColor Cyan
    docker-compose -f $composeFile ps
    
    Write-Host ""
    Write-Host "💡 Useful commands:" -ForegroundColor Cyan
    Write-Host "  View logs: docker-compose -f $composeFile logs -f" -ForegroundColor White
    Write-Host "  Stop services: docker-compose -f $composeFile down" -ForegroundColor White
    Write-Host "  Restart services: docker-compose -f $composeFile restart" -ForegroundColor White
    Write-Host "  Scale services: docker-compose -f $composeFile up -d --scale api-gateway=3" -ForegroundColor White
    
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    
    Write-Host ""
    Write-Host "🔍 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  Check logs: docker-compose -f $composeFile logs" -ForegroundColor White
    Write-Host "  Check service status: docker-compose -f $composeFile ps" -ForegroundColor White
    Write-Host "  Check Docker: docker info" -ForegroundColor White
    
    exit 1
}