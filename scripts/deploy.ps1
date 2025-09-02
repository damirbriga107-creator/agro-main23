# DaorsAgro Deployment Automation Script for Windows PowerShell
# This script automates the complete deployment process

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("docker", "kubernetes", "aws")]
    [string]$Platform = "docker",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackup,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "latest"
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ROOT = "c:\Users\User\Downloads\agro-main"
$DOCKER_REGISTRY = "ghcr.io/daorsagro"
$KUBE_NAMESPACE = "daorsagro"

# Colors for output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Cyan"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "🚀 $Message" $BLUE
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" $GREEN
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" $YELLOW
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" $RED
}

function Test-Prerequisites {
    Write-Step "Checking prerequisites..."
    
    $prerequisites = @(
        @{Name="Docker"; Command="docker --version"},
        @{Name="Node.js"; Command="node --version"},
        @{Name="npm"; Command="npm --version"}
    )
    
    if ($Platform -eq "kubernetes") {
        $prerequisites += @{Name="kubectl"; Command="kubectl version --client"}
        $prerequisites += @{Name="helm"; Command="helm version"}
    }
    
    if ($Platform -eq "aws") {
        $prerequisites += @{Name="AWS CLI"; Command="aws --version"}
        $prerequisites += @{Name="Terraform"; Command="terraform --version"}
    }
    
    foreach ($prereq in $prerequisites) {
        try {
            Invoke-Expression $prereq.Command | Out-Null
            Write-Success "$($prereq.Name) is installed"
        }
        catch {
            Write-Error "$($prereq.Name) is not installed or not in PATH"
            exit 1
        }
    }
}

function Set-Environment {
    Write-Step "Setting up environment for $Environment..."
    
    # Copy environment-specific configuration
    $envFile = "$PROJECT_ROOT\.env.$Environment"
    if (Test-Path $envFile) {
        Copy-Item $envFile "$PROJECT_ROOT\.env" -Force
        Write-Success "Environment configuration loaded"
    } else {
        Write-Warning "Environment file $envFile not found, using default .env"
    }
    
    # Set environment variables
    $env:NODE_ENV = $Environment
    $env:DEPLOYMENT_PLATFORM = $Platform
    $env:VERSION = $Version
}

function Install-Dependencies {
    Write-Step "Installing dependencies..."
    
    Set-Location $PROJECT_ROOT
    
    # Install root dependencies
    npm ci
    Write-Success "Root dependencies installed"
    
    # Install backend dependencies
    Set-Location "$PROJECT_ROOT\backend\api-gateway"
    npm ci
    Write-Success "API Gateway dependencies installed"
    
    # Install service dependencies
    $services = @("auth-service", "financial-service", "subsidy-service", "insurance-service", 
                  "analytics-service", "document-service", "notification-service", "iot-service")
    
    foreach ($service in $services) {
        Set-Location "$PROJECT_ROOT\backend\services\$service"
        npm ci
        Write-Success "$service dependencies installed"
    }
    
    # Install frontend dependencies
    Set-Location "$PROJECT_ROOT\frontend-app"
    npm ci
    Write-Success "Frontend dependencies installed"
    
    Set-Location $PROJECT_ROOT
}

function Run-Tests {
    if ($SkipTests) {
        Write-Warning "Skipping tests as requested"
        return
    }
    
    Write-Step "Running tests..."
    
    Set-Location $PROJECT_ROOT
    
    # Run linting
    npm run lint
    Write-Success "Linting passed"
    
    # Run type checking
    npm run type-check
    Write-Success "Type checking passed"
    
    # Run unit tests
    npm test
    Write-Success "Unit tests passed"
    
    # Run integration tests
    npm run test:integration
    Write-Success "Integration tests passed"
}

function Build-Application {
    Write-Step "Building application..."
    
    Set-Location $PROJECT_ROOT
    
    # Build frontend
    Set-Location "$PROJECT_ROOT\frontend-app"
    npm run build
    Write-Success "Frontend built successfully"
    
    # Build backend services
    Set-Location "$PROJECT_ROOT\backend\api-gateway"
    npm run build
    Write-Success "API Gateway built successfully"
    
    $services = @("auth-service", "financial-service", "subsidy-service", "insurance-service", 
                  "analytics-service", "document-service", "notification-service", "iot-service")
    
    foreach ($service in $services) {
        Set-Location "$PROJECT_ROOT\backend\services\$service"
        npm run build
        Write-Success "$service built successfully"
    }
    
    Set-Location $PROJECT_ROOT
}

function Build-DockerImages {
    if ($Platform -ne "docker" -and $Platform -ne "kubernetes") {
        return
    }
    
    Write-Step "Building Docker images..."
    
    Set-Location $PROJECT_ROOT
    
    # Build API Gateway image
    docker build -t "${DOCKER_REGISTRY}/api-gateway:${Version}" -f backend/api-gateway/Dockerfile .
    Write-Success "API Gateway image built"
    
    # Build service images
    $services = @("auth-service", "financial-service", "subsidy-service", "insurance-service", 
                  "analytics-service", "document-service", "notification-service", "iot-service")
    
    foreach ($service in $services) {
        docker build -t "${DOCKER_REGISTRY}/${service}:${Version}" -f "backend/services/$service/Dockerfile" .
        Write-Success "$service image built"
    }
    
    # Build frontend image
    docker build -t "${DOCKER_REGISTRY}/frontend:${Version}" -f frontend-app/Dockerfile .
    Write-Success "Frontend image built"
}

function Push-DockerImages {
    if ($Platform -ne "kubernetes") {
        return
    }
    
    Write-Step "Pushing Docker images to registry..."
    
    # Login to registry
    docker login ghcr.io
    
    # Push API Gateway image
    docker push "${DOCKER_REGISTRY}/api-gateway:${Version}"
    Write-Success "API Gateway image pushed"
    
    # Push service images
    $services = @("auth-service", "financial-service", "subsidy-service", "insurance-service", 
                  "analytics-service", "document-service", "notification-service", "iot-service")
    
    foreach ($service in $services) {
        docker push "${DOCKER_REGISTRY}/${service}:${Version}"
        Write-Success "$service image pushed"
    }
    
    # Push frontend image
    docker push "${DOCKER_REGISTRY}/frontend:${Version}"
    Write-Success "Frontend image pushed"
}

function Deploy-Docker {
    Write-Step "Deploying with Docker Compose..."
    
    Set-Location $PROJECT_ROOT
    
    # Stop existing containers
    docker-compose down
    
    # Deploy with optimized configuration
    if ($Environment -eq "production") {
        docker-compose -f docker-compose.optimized.yml up -d
    } else {
        docker-compose up -d
    }
    
    Write-Success "Docker deployment completed"
}

function Deploy-Kubernetes {
    Write-Step "Deploying to Kubernetes..."
    
    Set-Location "$PROJECT_ROOT\infrastructure\kubernetes"
    
    # Create namespace
    kubectl apply -f namespace.yaml
    
    # Apply secrets (ensure they exist)
    if (Test-Path "secrets.yaml") {
        kubectl apply -f secrets.yaml
    } else {
        Write-Warning "Secrets file not found. Please create secrets manually."
    }
    
    # Apply configurations
    kubectl apply -f configmap.yaml
    
    # Deploy databases first
    kubectl apply -f database-deployments.yaml
    
    # Wait for databases to be ready
    kubectl wait --for=condition=ready pod -l app=postgres -n $KUBE_NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=mongodb -n $KUBE_NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n $KUBE_NAMESPACE --timeout=300s
    
    # Deploy API Gateway
    kubectl apply -f api-gateway-deployment.yaml
    
    # Wait for API Gateway to be ready
    kubectl wait --for=condition=ready pod -l app=api-gateway -n $KUBE_NAMESPACE --timeout=300s
    
    # Deploy services
    kubectl apply -f service-deployments.yaml
    
    Write-Success "Kubernetes deployment completed"
}

function Deploy-AWS {
    Write-Step "Deploying to AWS..."
    
    Set-Location "$PROJECT_ROOT\infrastructure\terraform"
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -var="environment=$Environment" -out=tfplan
    
    # Apply if not in dry-run mode
    if ($Force -or (Read-Host "Apply Terraform plan? (y/N)") -eq "y") {
        terraform apply tfplan
        Write-Success "AWS infrastructure deployed"
        
        # Deploy to EKS
        aws eks update-kubeconfig --region us-east-1 --name "daorsagro-$Environment"
        Deploy-Kubernetes
    }
}

function Create-Backup {
    if ($SkipBackup -or $Environment -eq "development") {
        Write-Warning "Skipping backup"
        return
    }
    
    Write-Step "Creating backup before deployment..."
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = "$PROJECT_ROOT\backups\$timestamp"
    
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    # Backup database (if running)
    try {
        if ($Platform -eq "docker") {
            docker exec daorsagro_postgres_1 pg_dump -U postgres daorsagro > "$backupDir\postgres_backup.sql"
            docker exec daorsagro_mongodb_1 mongodump --out "$backupDir\mongodb_backup"
        }
        Write-Success "Database backup created"
    }
    catch {
        Write-Warning "Could not create database backup: $($_.Exception.Message)"
    }
    
    # Backup configuration files
    Copy-Item "$PROJECT_ROOT\.env" "$backupDir\.env.backup" -ErrorAction SilentlyContinue
    Copy-Item "$PROJECT_ROOT\docker-compose.yml" "$backupDir\docker-compose.yml.backup" -ErrorAction SilentlyContinue
    
    Write-Success "Backup created at $backupDir"
}

function Verify-Deployment {
    Write-Step "Verifying deployment..."
    
    Start-Sleep -Seconds 30  # Wait for services to start
    
    $healthChecks = @()
    
    if ($Platform -eq "docker") {
        $healthChecks = @(
            @{Name="API Gateway"; URL="http://localhost:3000/health"},
            @{Name="Frontend"; URL="http://localhost:5173"}
        )
    } elseif ($Platform -eq "kubernetes") {
        # Get service URLs from Kubernetes
        $apiGatewayUrl = kubectl get service api-gateway-service -n $KUBE_NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
        if ($apiGatewayUrl) {
            $healthChecks = @(
                @{Name="API Gateway"; URL="http://$apiGatewayUrl/health"}
            )
        }
    }
    
    foreach ($check in $healthChecks) {
        try {
            $response = Invoke-WebRequest -Uri $check.URL -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Success "$($check.Name) is healthy"
            } else {
                Write-Warning "$($check.Name) returned status $($response.StatusCode)"
            }
        }
        catch {
            Write-Warning "$($check.Name) health check failed: $($_.Exception.Message)"
        }
    }
}

function Show-DeploymentInfo {
    Write-Step "Deployment Information"
    
    Write-Host ""
    Write-ColorOutput "Environment: $Environment" $GREEN
    Write-ColorOutput "Platform: $Platform" $GREEN
    Write-ColorOutput "Version: $Version" $GREEN
    Write-Host ""
    
    if ($Platform -eq "docker") {
        Write-ColorOutput "Services:" $BLUE
        Write-Host "  - API Gateway: http://localhost:3000"
        Write-Host "  - Frontend: http://localhost:5173"
        Write-Host "  - Grafana: http://localhost:3001"
        Write-Host "  - Prometheus: http://localhost:9090"
    } elseif ($Platform -eq "kubernetes") {
        Write-ColorOutput "Kubernetes Resources:" $BLUE
        kubectl get pods -n $KUBE_NAMESPACE
        Write-Host ""
        kubectl get services -n $KUBE_NAMESPACE
    }
    
    Write-Host ""
    Write-ColorOutput "Logs:" $BLUE
    if ($Platform -eq "docker") {
        Write-Host "  docker-compose logs -f [service-name]"
    } elseif ($Platform -eq "kubernetes") {
        Write-Host "  kubectl logs -f deployment/api-gateway -n $KUBE_NAMESPACE"
    }
}

# Main deployment process
function Start-Deployment {
    Write-ColorOutput "🚀 Starting DaorsAgro deployment..." $BLUE
    Write-ColorOutput "Environment: $Environment | Platform: $Platform | Version: $Version" $YELLOW
    Write-Host ""
    
    try {
        Test-Prerequisites
        Set-Environment
        Create-Backup
        Install-Dependencies
        Run-Tests
        Build-Application
        Build-DockerImages
        
        switch ($Platform) {
            "docker" { Deploy-Docker }
            "kubernetes" { 
                Push-DockerImages
                Deploy-Kubernetes 
            }
            "aws" { 
                Push-DockerImages
                Deploy-AWS 
            }
        }
        
        Verify-Deployment
        Show-DeploymentInfo
        
        Write-Success "🎉 Deployment completed successfully!"
        
    }
    catch {
        Write-Error "Deployment failed: $($_.Exception.Message)"
        Write-Host "Stack trace:" -ForegroundColor Red
        Write-Host $_.ScriptStackTrace -ForegroundColor Red
        exit 1
    }
}

# Execute deployment
Start-Deployment