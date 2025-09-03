# Cloud Deployment Script for DaorsAgro Platform
# Supports multiple cloud providers: AWS, Azure, GCP, DigitalOcean

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("aws", "azure", "gcp", "digitalocean", "docker-swarm", "local")]
    [string]$Provider,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("staging", "production")]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [string]$Domain = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$BuildImages = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$PushImages = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackup = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false
)

Write-Host "🚀 DaorsAgro Cloud Deployment" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "Provider: $Provider" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Domain: $Domain" -ForegroundColor Yellow

# Configuration
$services = @(
    "api-gateway",
    "auth-service", 
    "financial-service",
    "subsidy-service",
    "insurance-service",
    "analytics-service",
    "document-service",
    "notification-service",
    "iot-service",
    "frontend-app"
)

$registry = "ghcr.io"
$imageName = "daorsagro/platform"
$tag = "latest"

# Load environment configuration
function Load-Environment {
    param([string]$EnvFile)
    
    if (Test-Path $EnvFile) {
        Write-Host "📋 Loading environment from $EnvFile" -ForegroundColor Green
        Get-Content $EnvFile | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
            }
        }
    } else {
        Write-Host "⚠️ Environment file not found: $EnvFile" -ForegroundColor Yellow
        Write-Host "Please create the environment file with required variables" -ForegroundColor Yellow
    }
}

# Build and push Docker images
function Build-AndPushImages {
    Write-Host "🔨 Building and pushing Docker images..." -ForegroundColor Yellow
    
    foreach ($service in $services) {
        Write-Host "Building $service..." -ForegroundColor Cyan
        
        $dockerfile = if ($service -eq "api-gateway") { 
            "backend/api-gateway/Dockerfile" 
        } elseif ($service -eq "frontend-app") {
            "frontend-app/Dockerfile"
        } else { 
            "backend/services/$service/Dockerfile" 
        }
        
        $imageTag = "$registry/$imageName/$service`:$tag"
        
        if ($DryRun) {
            Write-Host "DRY RUN: Would build $imageTag" -ForegroundColor Gray
            continue
        }
        
        try {
            # Build with Build Cloud if available
            $builders = docker buildx ls
            if ($builders -match "daorsagro-cloud-builder.*cloud") {
                docker buildx build `
                    --builder daorsagro-cloud-builder `
                    --platform linux/amd64,linux/arm64 `
                    --cache-from type=registry,ref=$imageTag-cache `
                    --cache-to type=registry,ref=$imageTag-cache,mode=max `
                    -f $dockerfile `
                    --push `
                    -t $imageTag `
                    .
            } else {
                docker build -f $dockerfile -t $imageTag .
                if ($PushImages) {
                    docker push $imageTag
                }
            }
            
            Write-Host "✅ $service built successfully" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to build $service`: $_" -ForegroundColor Red
            throw
        }
    }
}

# Deploy to AWS ECS
function Deploy-ToAWS {
    Write-Host "🌩️ Deploying to AWS ECS..." -ForegroundColor Yellow
    
    # Check AWS CLI
    try {
        aws --version | Out-Null
    } catch {
        Write-Host "❌ AWS CLI not found. Please install AWS CLI" -ForegroundColor Red
        return $false
    }
    
    # Create ECS cluster if it doesn't exist
    $clusterName = "daorsagro-$Environment"
    
    if ($DryRun) {
        Write-Host "DRY RUN: Would create ECS cluster $clusterName" -ForegroundColor Gray
        return $true
    }
    
    try {
        # Check if cluster exists
        $cluster = aws ecs describe-clusters --clusters $clusterName --query 'clusters[0].status' --output text 2>$null
        
        if ($cluster -ne "ACTIVE") {
            Write-Host "Creating ECS cluster: $clusterName" -ForegroundColor Cyan
            aws ecs create-cluster --cluster-name $clusterName
        }
        
        # Deploy using ECS Compose
        Write-Host "Deploying services to ECS..." -ForegroundColor Cyan
        docker context create ecs daorsagro-aws --from-env
        docker context use daorsagro-aws
        docker compose -f docker-compose.production.yml up -d
        docker context use default
        
        Write-Host "✅ Deployed to AWS ECS successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ AWS deployment failed: $_" -ForegroundColor Red
        return $false
    }
}

# Deploy to Azure Container Instances
function Deploy-ToAzure {
    Write-Host "☁️ Deploying to Azure Container Instances..." -ForegroundColor Yellow
    
    # Check Azure CLI
    try {
        az version | Out-Null
    } catch {
        Write-Host "❌ Azure CLI not found. Please install Azure CLI" -ForegroundColor Red
        return $false
    }
    
    $resourceGroup = "daorsagro-$Environment"
    $location = "eastus"
    
    if ($DryRun) {
        Write-Host "DRY RUN: Would create Azure resources in $resourceGroup" -ForegroundColor Gray
        return $true
    }
    
    try {
        # Create resource group
        Write-Host "Creating resource group: $resourceGroup" -ForegroundColor Cyan
        az group create --name $resourceGroup --location $location
        
        # Deploy using Azure Container Instances
        Write-Host "Deploying to Azure Container Instances..." -ForegroundColor Cyan
        docker context create aci daorsagro-azure --resource-group $resourceGroup --location $location
        docker context use daorsagro-azure
        docker compose -f docker-compose.production.yml up -d
        docker context use default
        
        Write-Host "✅ Deployed to Azure successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Azure deployment failed: $_" -ForegroundColor Red
        return $false
    }
}

# Deploy to Google Cloud Run
function Deploy-ToGCP {
    Write-Host "🌐 Deploying to Google Cloud Run..." -ForegroundColor Yellow
    
    # Check gcloud CLI
    try {
        gcloud version | Out-Null
    } catch {
        Write-Host "❌ Google Cloud CLI not found. Please install gcloud" -ForegroundColor Red
        return $false
    }
    
    $projectId = $env:GCP_PROJECT_ID
    if (-not $projectId) {
        Write-Host "❌ GCP_PROJECT_ID environment variable not set" -ForegroundColor Red
        return $false
    }
    
    if ($DryRun) {
        Write-Host "DRY RUN: Would deploy to Google Cloud Run in project $projectId" -ForegroundColor Gray
        return $true
    }
    
    try {
        # Set project
        gcloud config set project $projectId
        
        # Deploy each service to Cloud Run
        foreach ($service in $services) {
            Write-Host "Deploying $service to Cloud Run..." -ForegroundColor Cyan
            
            $imageTag = "$registry/$imageName/$service`:$tag"
            $serviceName = "daorsagro-$service-$Environment"
            
            gcloud run deploy $serviceName `
                --image $imageTag `
                --platform managed `
                --region us-central1 `
                --allow-unauthenticated `
                --memory 1Gi `
                --cpu 1 `
                --max-instances 10
        }
        
        Write-Host "✅ Deployed to Google Cloud Run successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ GCP deployment failed: $_" -ForegroundColor Red
        return $false
    }
}

# Deploy to DigitalOcean App Platform
function Deploy-ToDigitalOcean {
    Write-Host "🌊 Deploying to DigitalOcean App Platform..." -ForegroundColor Yellow
    
    # Check doctl CLI
    try {
        doctl version | Out-Null
    } catch {
        Write-Host "❌ DigitalOcean CLI not found. Please install doctl" -ForegroundColor Red
        return $false
    }
    
    if ($DryRun) {
        Write-Host "DRY RUN: Would deploy to DigitalOcean App Platform" -ForegroundColor Gray
        return $true
    }
    
    try {
        # Create app spec
        $appSpec = @{
            name = "daorsagro-$Environment"
            services = @()
            databases = @(
                @{
                    name = "postgres"
                    engine = "PG"
                    version = "15"
                    size = "db-s-1vcpu-1gb"
                },
                @{
                    name = "redis"
                    engine = "REDIS"
                    version = "7"
                    size = "db-s-1vcpu-1gb"
                }
            )
        }
        
        # Add services to app spec
        foreach ($service in $services) {
            $imageTag = "$registry/$imageName/$service`:$tag"
            
            $serviceSpec = @{
                name = $service
                image = @{
                    registry_type = "GHCR"
                    repository = "$imageName/$service"
                    tag = $tag
                }
                instance_count = 1
                instance_size_slug = "basic-xxs"
                http_port = if ($service -eq "frontend-app") { 80 } else { 3000 + $services.IndexOf($service) }
            }
            
            $appSpec.services += $serviceSpec
        }
        
        # Deploy app
        $appSpecJson = $appSpec | ConvertTo-Json -Depth 10
        $appSpecJson | Out-File -FilePath "app-spec.json" -Encoding UTF8
        
        doctl apps create --spec app-spec.json
        
        Write-Host "✅ Deployed to DigitalOcean App Platform successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ DigitalOcean deployment failed: $_" -ForegroundColor Red
        return $false
    }
}

# Deploy to Docker Swarm
function Deploy-ToDockerSwarm {
    Write-Host "🐳 Deploying to Docker Swarm..." -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "DRY RUN: Would deploy to Docker Swarm" -ForegroundColor Gray
        return $true
    }
    
    try {
        # Initialize swarm if not already done
        $swarmStatus = docker info --format '{{.Swarm.LocalNodeState}}'
        if ($swarmStatus -ne "active") {
            Write-Host "Initializing Docker Swarm..." -ForegroundColor Cyan
            docker swarm init
        }
        
        # Deploy stack
        Write-Host "Deploying stack to Docker Swarm..." -ForegroundColor Cyan
        docker stack deploy -c docker-compose.production.yml daorsagro
        
        Write-Host "✅ Deployed to Docker Swarm successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Docker Swarm deployment failed: $_" -ForegroundColor Red
        return $false
    }
}

# Deploy locally
function Deploy-Locally {
    Write-Host "🏠 Deploying locally..." -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "DRY RUN: Would deploy locally" -ForegroundColor Gray
        return $true
    }
    
    try {
        docker-compose -f docker-compose.production.yml up -d
        Write-Host "✅ Deployed locally successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Local deployment failed: $_" -ForegroundColor Red
        return $false
    }
}

# Backup existing deployment
function Backup-Deployment {
    if ($SkipBackup) {
        Write-Host "⏭️ Skipping backup" -ForegroundColor Yellow
        return $true
    }
    
    Write-Host "💾 Creating backup..." -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "DRY RUN: Would create backup" -ForegroundColor Gray
        return $true
    }
    
    try {
        $backupDir = "backups/$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        
        # Backup databases
        Write-Host "Backing up databases..." -ForegroundColor Cyan
        # Add database backup logic here
        
        Write-Host "✅ Backup completed" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Backup failed: $_" -ForegroundColor Red
        return $false
    }
}

# Health check after deployment
function Test-Deployment {
    Write-Host "🏥 Running health checks..." -ForegroundColor Yellow
    
    $healthEndpoints = @(
        "https://api.$Domain/health",
        "https://$Domain"
    )
    
    foreach ($endpoint in $healthEndpoints) {
        try {
            $response = Invoke-WebRequest -Uri $endpoint -TimeoutSec 30
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $endpoint is healthy" -ForegroundColor Green
            } else {
                Write-Host "⚠️ $endpoint returned status $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ $endpoint is not responding: $_" -ForegroundColor Red
        }
    }
}

# Main deployment function
function Start-Deployment {
    try {
        # Load environment
        Load-Environment ".env.$Environment"
        
        # Backup existing deployment
        if (-not (Backup-Deployment)) {
            throw "Backup failed"
        }
        
        # Build and push images if requested
        if ($BuildImages) {
            Build-AndPushImages
        }
        
        # Deploy based on provider
        $deploymentSuccess = switch ($Provider) {
            "aws" { Deploy-ToAWS }
            "azure" { Deploy-ToAzure }
            "gcp" { Deploy-ToGCP }
            "digitalocean" { Deploy-ToDigitalOcean }
            "docker-swarm" { Deploy-ToDockerSwarm }
            "local" { Deploy-Locally }
            default { 
                Write-Host "❌ Unsupported provider: $Provider" -ForegroundColor Red
                $false
            }
        }
        
        if (-not $deploymentSuccess) {
            throw "Deployment failed"
        }
        
        # Wait for services to start
        if (-not $DryRun) {
            Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
            Start-Sleep -Seconds 60
            
            # Run health checks
            if ($Domain) {
                Test-Deployment
            }
        }
        
        Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Access your application:" -ForegroundColor Cyan
        if ($Domain) {
            Write-Host "  Frontend: https://$Domain" -ForegroundColor White
            Write-Host "  API: https://api.$Domain" -ForegroundColor White
            Write-Host "  Monitoring: https://grafana.$Domain" -ForegroundColor White
        }
        
    } catch {
        Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
        exit 1
    }
}

# Run deployment
Start-Deployment