#!/usr/bin/env node

/**
 * DaorsAgro Platform Setup Validation Script
 * Validates all configurations and tests service connectivity
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

// Validation results
let validationResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function addResult(type, category, message) {
  validationResults[type]++;
  validationResults.details.push({ type, category, message });
  
  switch (type) {
    case 'passed':
      logSuccess(`[${category}] ${message}`);
      break;
    case 'failed':
      logError(`[${category}] ${message}`);
      break;
    case 'warnings':
      logWarning(`[${category}] ${message}`);
      break;
  }
}

/**
 * Check if file exists
 */
function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    addResult('passed', 'Files', `${description} exists`);
    return true;
  } else {
    addResult('failed', 'Files', `${description} is missing: ${filePath}`);
    return false;
  }
}

/**
 * Check if directory exists
 */
function checkDirectoryExists(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    addResult('passed', 'Directories', `${description} exists`);
    return true;
  } else {
    addResult('failed', 'Directories', `${description} is missing: ${dirPath}`);
    return false;
  }
}

/**
 * Validate package.json files
 */
function validatePackageJson() {
  logInfo('Validating package.json files...');
  
  const packagePaths = [
    'package.json',
    'backend/api-gateway/package.json',
    'backend/services/auth-service/package.json',
    'backend/services/financial-service/package.json',
    'backend/services/subsidy-service/package.json',
    'backend/services/insurance-service/package.json',
    'backend/services/analytics-service/package.json',
    'backend/services/document-service/package.json',
    'backend/services/notification-service/package.json',
    'backend/services/iot-service/package.json',
    'backend/shared/config/package.json',
    'backend/shared/types/package.json',
    'backend/shared/utils/package.json',
    'frontend/packages/web-app/package.json'
  ];

  packagePaths.forEach(pkgPath => {
    if (checkFileExists(pkgPath, `Package file ${pkgPath}`)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name && pkg.version) {
          addResult('passed', 'Package', `${pkg.name} v${pkg.version} is valid`);
        } else {
          addResult('failed', 'Package', `Invalid package.json: ${pkgPath}`);
        }
      } catch (error) {
        addResult('failed', 'Package', `Cannot parse package.json: ${pkgPath}`);
      }
    }
  });
}

/**
 * Validate TypeScript configuration
 */
function validateTypeScriptConfig() {
  logInfo('Validating TypeScript configuration...');
  
  const tsConfigPaths = [
    'tsconfig.json',
    'backend/api-gateway/tsconfig.json',
    'backend/services/auth-service/tsconfig.json',
    'backend/services/financial-service/tsconfig.json',
    'backend/services/subsidy-service/tsconfig.json',
    'backend/services/analytics-service/tsconfig.json',
    'backend/shared/types/tsconfig.json'
  ];

  tsConfigPaths.forEach(tsPath => {
    if (checkFileExists(tsPath, `TypeScript config ${tsPath}`)) {
      try {
        const tsConfig = JSON.parse(fs.readFileSync(tsPath, 'utf8'));
        if (tsConfig.compilerOptions) {
          addResult('passed', 'TypeScript', `${tsPath} has valid compiler options`);
        }
      } catch (error) {
        addResult('failed', 'TypeScript', `Invalid tsconfig.json: ${tsPath}`);
      }
    }
  });
}

/**
 * Validate Docker configuration
 */
function validateDockerConfig() {
  logInfo('Validating Docker configuration...');
  
  checkFileExists('docker-compose.yml', 'Main Docker Compose file');
  
  const dockerfilePaths = [
    'backend/api-gateway/Dockerfile',
    'backend/services/auth-service/Dockerfile',
    'backend/services/financial-service/Dockerfile',
    'backend/services/subsidy-service/Dockerfile',
    'backend/services/analytics-service/Dockerfile'
  ];

  dockerfilePaths.forEach(dockerPath => {
    checkFileExists(dockerPath, `Dockerfile ${dockerPath}`);
  });
}

/**
 * Validate environment files
 */
function validateEnvironmentFiles() {
  logInfo('Validating environment configuration...');
  
  checkFileExists('.env.template', 'Environment template file');
  checkFileExists('.env.development', 'Development environment file');
  checkFileExists('.env.production', 'Production environment file');
  
  if (!fs.existsSync('.env')) {
    addResult('warnings', 'Environment', '.env file not found - using defaults');
  } else {
    addResult('passed', 'Environment', '.env file exists');
  }
}

/**
 * Validate service structure
 */
function validateServiceStructure() {
  logInfo('Validating service structure...');
  
  const services = [
    'auth-service',
    'financial-service',
    'subsidy-service',
    'insurance-service',
    'analytics-service',
    'document-service',
    'notification-service',
    'iot-service'
  ];

  services.forEach(service => {
    const servicePath = `backend/services/${service}`;
    const srcPath = `${servicePath}/src`;
    const indexPath = `${srcPath}/index.ts`;
    
    if (checkDirectoryExists(servicePath, `${service} directory`)) {
      if (checkDirectoryExists(srcPath, `${service} src directory`)) {
        checkFileExists(indexPath, `${service} main entry point`);
        
        // Check for middleware
        const middlewarePath = `${srcPath}/middleware`;
        if (fs.existsSync(middlewarePath)) {
          addResult('passed', 'Service', `${service} has middleware directory`);
        } else {
          addResult('warnings', 'Service', `${service} missing middleware directory`);
        }
      }
    }
  });
}

/**
 * Validate shared libraries
 */
function validateSharedLibraries() {
  logInfo('Validating shared libraries...');
  
  const sharedLibs = ['config', 'types', 'utils'];
  
  sharedLibs.forEach(lib => {
    const libPath = `backend/shared/${lib}`;
    const srcPath = `${libPath}/src`;
    const indexPath = `${srcPath}/index.ts`;
    
    checkDirectoryExists(libPath, `Shared ${lib} library`);
    checkDirectoryExists(srcPath, `Shared ${lib} src directory`);
    checkFileExists(indexPath, `Shared ${lib} entry point`);
  });
}

/**
 * Check Node.js and npm versions
 */
function checkNodeVersion() {
  logInfo('Checking Node.js and npm versions...');
  
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    
    const nodeVersionNum = parseInt(nodeVersion.substring(1).split('.')[0]);
    const npmVersionNum = parseInt(npmVersion.split('.')[0]);
    
    if (nodeVersionNum >= 20) {
      addResult('passed', 'Environment', `Node.js version ${nodeVersion} is supported`);
    } else {
      addResult('failed', 'Environment', `Node.js version ${nodeVersion} is too old (need >= 20.x)`);
    }
    
    if (npmVersionNum >= 9) {
      addResult('passed', 'Environment', `npm version ${npmVersion} is supported`);
    } else {
      addResult('warnings', 'Environment', `npm version ${npmVersion} is old (recommend >= 9.x)`);
    }
  } catch (error) {
    addResult('failed', 'Environment', 'Cannot check Node.js/npm versions');
  }
}

/**
 * Check Docker availability
 */
function checkDockerAvailability() {
  logInfo('Checking Docker availability...');
  
  try {
    const dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
    addResult('passed', 'Environment', `Docker is available: ${dockerVersion}`);
    
    try {
      const composeVersion = execSync('docker-compose --version', { encoding: 'utf8' }).trim();
      addResult('passed', 'Environment', `Docker Compose is available: ${composeVersion}`);
    } catch (error) {
      addResult('warnings', 'Environment', 'Docker Compose not found - try "docker compose" instead');
    }
  } catch (error) {
    addResult('failed', 'Environment', 'Docker is not available');
  }
}

/**
 * Validate API Gateway configuration
 */
function validateApiGateway() {
  logInfo('Validating API Gateway...');
  
  const gatewayPath = 'backend/api-gateway';
  const srcPath = `${gatewayPath}/src`;
  
  checkDirectoryExists(gatewayPath, 'API Gateway directory');
  checkFileExists(`${srcPath}/index.ts`, 'API Gateway main file');
  checkDirectoryExists(`${srcPath}/middleware`, 'API Gateway middleware');
  checkDirectoryExists(`${srcPath}/services`, 'API Gateway services');
  checkDirectoryExists(`${srcPath}/utils`, 'API Gateway utilities');
}

/**
 * Validate frontend structure
 */
function validateFrontendStructure() {
  logInfo('Validating frontend structure...');
  
  checkDirectoryExists('frontend', 'Frontend directory');
  checkDirectoryExists('frontend/packages', 'Frontend packages directory');
  checkDirectoryExists('frontend/packages/web-app', 'Web app directory');
  checkFileExists('frontend/packages/web-app/src/main.tsx', 'Web app main file');
  checkFileExists('frontend/packages/web-app/vite.config.ts', 'Vite configuration');
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  log('VALIDATION REPORT', 'blue');
  console.log('='.repeat(60));
  
  logSuccess(`Passed: ${validationResults.passed}`);
  if (validationResults.warnings > 0) {
    logWarning(`Warnings: ${validationResults.warnings}`);
  }
  if (validationResults.failed > 0) {
    logError(`Failed: ${validationResults.failed}`);
  }
  
  console.log('\nDetails by category:');
  const categories = {};
  validationResults.details.forEach(detail => {
    if (!categories[detail.category]) {
      categories[detail.category] = { passed: 0, failed: 0, warnings: 0 };
    }
    categories[detail.category][detail.type]++;
  });
  
  Object.entries(categories).forEach(([category, stats]) => {
    console.log(`\n${category}:`);
    console.log(`  ✓ Passed: ${stats.passed}`);
    if (stats.warnings > 0) console.log(`  ⚠ Warnings: ${stats.warnings}`);
    if (stats.failed > 0) console.log(`  ✗ Failed: ${stats.failed}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (validationResults.failed === 0) {
    logSuccess('✓ VALIDATION PASSED - Platform is ready for development!');
    
    console.log('\nNext steps:');
    logInfo('1. Copy .env.development to .env for local development');
    logInfo('2. Run: npm run docker:up');
    logInfo('3. Run: npm run dev');
    logInfo('4. Access the platform at http://localhost:3000');
    
  } else {
    logError('✗ VALIDATION FAILED - Please fix the errors above');
    process.exit(1);
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('🔍 DaorsAgro Platform Validation Starting...\n');
  
  // Change to project root if running from scripts directory
  if (process.cwd().endsWith('scripts')) {
    process.chdir('..');
  }
  
  // Run all validations
  checkNodeVersion();
  checkDockerAvailability();
  validatePackageJson();
  validateTypeScriptConfig();
  validateDockerConfig();
  validateEnvironmentFiles();
  validateApiGateway();
  validateServiceStructure();
  validateSharedLibraries();
  validateFrontendStructure();
  
  // Generate final report
  generateReport();
}

// Run validation
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };