# DaorsAgro Documentation Cleanup Script
# This script removes unnecessary documentation files while keeping essential ones

# Files to keep (essential documentation)
$filesToKeep = @(
    "c:\Users\User\Downloads\agro-main\README.md",
    "c:\Users\User\Downloads\agro-main\CONTRIBUTING.md",
    "c:\Users\User\Downloads\agro-main\DEPLOYMENT_GUIDE.md",
    "c:\Users\User\Downloads\agro-main\daorsagro-frontend\README.md",
    "c:\Users\User\Downloads\agro-main\backend\shared\database\README.md",
    "c:\Users\User\Downloads\agro-main\mcp-servers\README.md"
)

# Files to remove (unnecessary documentation)
$filesToRemove = @(
    "c:\Users\User\Downloads\agro-main\BACKEND_FIXES_IMPLEMENTED.md",
    "c:\Users\User\Downloads\agro-main\BUILD_STATUS.md",
    "c:\Users\User\Downloads\agro-main\ENHANCEMENT_SUMMARY.md",
    "c:\Users\User\Downloads\agro-main\INFRASTRUCTURE_OPTIMIZATION_REPORT.md",
    "c:\Users\User\Downloads\agro-main\NETLIFY_DEPLOYMENT.md",
    "c:\Users\User\Downloads\agro-main\daorsagro-frontend-enhancement-plan.md",
    "c:\Users\User\Downloads\agro-main\DESIGN_SYSTEM_SUMMARY.md",
    "c:\Users\User\Downloads\agro-main\docs\FRONTEND_ASSESSMENT_REPORT.md",
    "c:\Users\User\Downloads\agro-main\docs\HEALTH_CHECKS.md",
    "c:\Users\User\Downloads\agro-main\docs\deployment-ui-guidance.md",
    "c:\Users\User\Downloads\agro-main\frontend-app\IMPLEMENTATION_GUIDE.md",
    "c:\Users\User\Downloads\agro-main\agro-main\Frontend-Specifications.md",
    "c:\Users\User\Downloads\agro-main\agro-main\DaorsAgro-Roadmap.md",
    "c:\Users\User\Downloads\agro-main\agro-main\Coding-Agent-Instructions.md",
    "c:\Users\User\Downloads\agro-main\agro-main\Backend-Specifications.md",
    "c:\Users\User\Downloads\agro-main\agro-main\README.md"
)

# Create a backup directory
$backupDir = "c:\Users\User\Downloads\agro-main\docs-backup"
if (-not (Test-Path -Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "Created backup directory: $backupDir" -ForegroundColor Green
}

# Backup and remove files
foreach ($file in $filesToRemove) {
    if (Test-Path -Path $file) {
        # Get the filename without the path
        $fileName = Split-Path -Path $file -Leaf
        
        # Create backup
        Copy-Item -Path $file -Destination "$backupDir\$fileName"
        Write-Host "Backed up: $fileName" -ForegroundColor Cyan
        
        # Remove file
        Remove-Item -Path $file
        Write-Host "Removed: $file" -ForegroundColor Yellow
    } else {
        Write-Host "File not found: $file" -ForegroundColor Red
    }
}

# Summary
Write-Host "`nDocumentation Cleanup Summary:" -ForegroundColor Green
Write-Host "--------------------------------" -ForegroundColor Green
Write-Host "Files kept: $($filesToKeep.Count)" -ForegroundColor Green
Write-Host "Files removed: $($filesToRemove.Count)" -ForegroundColor Yellow
Write-Host "Backup location: $backupDir" -ForegroundColor Cyan
Write-Host "`nThe following essential documentation files were preserved:" -ForegroundColor Green
foreach ($file in $filesToKeep) {
    $relativePath = $file.Replace("c:\Users\User\Downloads\agro-main\", "")
    Write-Host "- $relativePath" -ForegroundColor White
}

Write-Host "`nCleanup completed successfully!" -ForegroundColor Green