# Docker Build Performance Benchmark Script
# Compares local builds vs Docker Build Cloud performance

param(
    [Parameter(Mandatory=$false)]
    [string[]]$Services = @("api-gateway", "auth-service", "financial-service"),
    
    [Parameter(Mandatory=$false)]
    [switch]$LocalOnly = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$BuildCloudOnly = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$CleanCache = $false,
    
    [Parameter(Mandatory=$false)]
    [int]$Iterations = 1
)

Write-Host "🏁 Docker Build Performance Benchmark" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Results storage
$results = @()

# Clean cache if requested
if ($CleanCache) {
    Write-Host "🧹 Cleaning build cache..." -ForegroundColor Yellow
    docker buildx prune -f
    docker system prune -f
}

# Function to measure build time
function Measure-BuildTime {
    param(
        [string]$Service,
        [string]$Builder,
        [string]$BuildType,
        [int]$Iteration
    )
    
    Write-Host "🔨 Building $Service with $Builder (iteration $Iteration)..." -ForegroundColor Yellow
    
    $dockerfile = if ($Service -eq "api-gateway") { 
        "backend/api-gateway/Dockerfile" 
    } else { 
        "backend/services/$Service/Dockerfile" 
    }
    
    $startTime = Get-Date
    
    try {
        if ($Builder -eq "local") {
            docker build -f $dockerfile -t "daorsagro/$Service`:benchmark-local" . | Out-Null
        } else {
            docker buildx build `
                --builder $Builder `
                --platform linux/amd64 `
                --cache-from type=registry,ref=ghcr.io/daorsagro/platform/$Service`:buildcache `
                --cache-to type=registry,ref=ghcr.io/daorsagro/platform/$Service`:buildcache,mode=max `
                -f $dockerfile `
                --load `
                -t "daorsagro/$Service`:benchmark-cloud" `
                . | Out-Null
        }
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        Write-Host "✅ $Service built in $([math]::Round($duration, 2)) seconds" -ForegroundColor Green
        
        return @{
            Service = $Service
            Builder = $BuildType
            Duration = $duration
            Success = $true
            Iteration = $Iteration
            Timestamp = $startTime
        }
    } catch {
        Write-Host "❌ Build failed: $_" -ForegroundColor Red
        
        return @{
            Service = $Service
            Builder = $BuildType
            Duration = 0
            Success = $false
            Iteration = $Iteration
            Timestamp = $startTime
            Error = $_.Exception.Message
        }
    }
}

# Function to check if Build Cloud is available
function Test-BuildCloudAvailable {
    try {
        $builders = docker buildx ls
        return $builders -match "daorsagro-cloud-builder.*cloud"
    } catch {
        return $false
    }
}

# Main benchmark execution
function Run-Benchmark {
    Write-Host "🚀 Starting benchmark with $($Services.Count) services, $Iterations iterations each" -ForegroundColor Cyan
    
    foreach ($service in $Services) {
        Write-Host "`n📦 Benchmarking $service" -ForegroundColor Magenta
        
        for ($i = 1; $i -le $Iterations; $i++) {
            # Local build
            if (-not $BuildCloudOnly) {
                $localResult = Measure-BuildTime -Service $service -Builder "local" -BuildType "Local Docker" -Iteration $i
                $results += $localResult
                
                # Clean up local image
                docker rmi "daorsagro/$service`:benchmark-local" 2>$null
            }
            
            # Build Cloud build
            if (-not $LocalOnly -and (Test-BuildCloudAvailable)) {
                $cloudResult = Measure-BuildTime -Service $service -Builder "daorsagro-cloud-builder" -BuildType "Build Cloud" -Iteration $i
                $results += $cloudResult
                
                # Clean up cloud image
                docker rmi "daorsagro/$service`:benchmark-cloud" 2>$null
            } elseif (-not $LocalOnly) {
                Write-Host "⚠️ Build Cloud not available, skipping cloud build" -ForegroundColor Yellow
            }
            
            # Small delay between iterations
            if ($i -lt $Iterations) {
                Start-Sleep -Seconds 2
            }
        }
    }
}

# Function to generate performance report
function Generate-Report {
    Write-Host "`n📊 Performance Report" -ForegroundColor Cyan
    Write-Host "=====================" -ForegroundColor Cyan
    
    # Group results by service and builder
    $groupedResults = $results | Group-Object Service
    
    foreach ($serviceGroup in $groupedResults) {
        $serviceName = $serviceGroup.Name
        Write-Host "`n🔧 $serviceName" -ForegroundColor Yellow
        
        $localBuilds = $serviceGroup.Group | Where-Object { $_.Builder -eq "Local Docker" -and $_.Success }
        $cloudBuilds = $serviceGroup.Group | Where-Object { $_.Builder -eq "Build Cloud" -and $_.Success }
        
        if ($localBuilds) {
            $avgLocal = ($localBuilds | Measure-Object Duration -Average).Average
            $minLocal = ($localBuilds | Measure-Object Duration -Minimum).Minimum
            $maxLocal = ($localBuilds | Measure-Object Duration -Maximum).Maximum
            
            Write-Host "  Local Docker:" -ForegroundColor White
            Write-Host "    Average: $([math]::Round($avgLocal, 2))s" -ForegroundColor Gray
            Write-Host "    Min: $([math]::Round($minLocal, 2))s, Max: $([math]::Round($maxLocal, 2))s" -ForegroundColor Gray
        }
        
        if ($cloudBuilds) {
            $avgCloud = ($cloudBuilds | Measure-Object Duration -Average).Average
            $minCloud = ($cloudBuilds | Measure-Object Duration -Minimum).Minimum
            $maxCloud = ($cloudBuilds | Measure-Object Duration -Maximum).Maximum
            
            Write-Host "  Build Cloud:" -ForegroundColor White
            Write-Host "    Average: $([math]::Round($avgCloud, 2))s" -ForegroundColor Gray
            Write-Host "    Min: $([math]::Round($minCloud, 2))s, Max: $([math]::Round($maxCloud, 2))s" -ForegroundColor Gray
            
            if ($localBuilds) {
                $improvement = ($avgLocal - $avgCloud) / $avgLocal * 100
                $speedup = $avgLocal / $avgCloud
                
                if ($improvement -gt 0) {
                    Write-Host "    🚀 $([math]::Round($improvement, 1))% faster ($([math]::Round($speedup, 1))x speedup)" -ForegroundColor Green
                } else {
                    Write-Host "    ⚠️ $([math]::Round(-$improvement, 1))% slower" -ForegroundColor Red
                }
            }
        }
    }
    
    # Overall statistics
    Write-Host "`n📈 Overall Statistics" -ForegroundColor Cyan
    
    $totalLocalTime = ($results | Where-Object { $_.Builder -eq "Local Docker" -and $_.Success } | Measure-Object Duration -Sum).Sum
    $totalCloudTime = ($results | Where-Object { $_.Builder -eq "Build Cloud" -and $_.Success } | Measure-Object Duration -Sum).Sum
    
    if ($totalLocalTime -gt 0) {
        Write-Host "Total Local Build Time: $([math]::Round($totalLocalTime, 2))s" -ForegroundColor White
    }
    
    if ($totalCloudTime -gt 0) {
        Write-Host "Total Build Cloud Time: $([math]::Round($totalCloudTime, 2))s" -ForegroundColor White
        
        if ($totalLocalTime -gt 0) {
            $totalImprovement = ($totalLocalTime - $totalCloudTime) / $totalLocalTime * 100
            $totalSpeedup = $totalLocalTime / $totalCloudTime
            
            Write-Host "🎯 Overall Improvement: $([math]::Round($totalImprovement, 1))% faster ($([math]::Round($totalSpeedup, 1))x speedup)" -ForegroundColor Green
            Write-Host "⏱️ Time Saved: $([math]::Round($totalLocalTime - $totalCloudTime, 2))s" -ForegroundColor Green
        }
    }
    
    # Failed builds
    $failedBuilds = $results | Where-Object { -not $_.Success }
    if ($failedBuilds) {
        Write-Host "`n❌ Failed Builds:" -ForegroundColor Red
        foreach ($failed in $failedBuilds) {
            Write-Host "  $($failed.Service) ($($failed.Builder)): $($failed.Error)" -ForegroundColor Red
        }
    }
}

# Function to export results to CSV
function Export-Results {
    $csvPath = "build-benchmark-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
    $results | Export-Csv -Path $csvPath -NoTypeInformation
    Write-Host "`n💾 Results exported to: $csvPath" -ForegroundColor Green
}

# Function to show cache statistics
function Show-CacheStats {
    Write-Host "`n💾 Cache Statistics" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    
    try {
        # Docker system info
        $systemDf = docker system df
        Write-Host "Docker System Usage:" -ForegroundColor White
        $systemDf | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        
        # Buildx cache info
        Write-Host "`nBuildx Cache Usage:" -ForegroundColor White
        $buildxDu = docker buildx du 2>$null
        if ($buildxDu) {
            $buildxDu | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        } else {
            Write-Host "  No buildx cache information available" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  Unable to retrieve cache statistics" -ForegroundColor Red
    }
}

# Main execution
try {
    Run-Benchmark
    Generate-Report
    Export-Results
    Show-CacheStats
    
    Write-Host "`n🎉 Benchmark completed successfully!" -ForegroundColor Green
    Write-Host "💡 Tips for better performance:" -ForegroundColor Cyan
    Write-Host "  • Use Docker Build Cloud for 3-5x faster builds" -ForegroundColor White
    Write-Host "  • Optimize Dockerfile layer caching" -ForegroundColor White
    Write-Host "  • Use .dockerignore to exclude unnecessary files" -ForegroundColor White
    Write-Host "  • Leverage multi-stage builds for smaller images" -ForegroundColor White
    
} catch {
    Write-Host "❌ Benchmark failed: $_" -ForegroundColor Red
    exit 1
}