#!/usr/bin/env node

/**
 * DaorsAgro Platform Health Check Script
 * Tests service connectivity and health status
 */

const http = require('http');
const https = require('https');

// Colors for console output
const colors = {
  green: '\\x1b[32m',
  red: '\\x1b[31m',
  yellow: '\\x1b[33m',
  blue: '\\x1b[34m',
  reset: '\\x1b[0m'
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

// Service configuration
const services = [
  { name: 'API Gateway', url: 'http://localhost:3000/health', critical: true },
  { name: 'Auth Service', url: 'http://localhost:3001/health', critical: true },
  { name: 'Financial Service', url: 'http://localhost:3002/health', critical: true },
  { name: 'Subsidy Service', url: 'http://localhost:3003/health', critical: false },
  { name: 'Insurance Service', url: 'http://localhost:3004/health', critical: false },
  { name: 'Analytics Service', url: 'http://localhost:3005/health', critical: false },
  { name: 'Document Service', url: 'http://localhost:3006/health', critical: false },
  { name: 'Notification Service', url: 'http://localhost:3007/health', critical: false },
  { name: 'IoT Service', url: 'http://localhost:3008/health', critical: false }
];

// Database and infrastructure services
const infrastructure = [
  { name: 'PostgreSQL', url: 'http://localhost:5432', type: 'database' },
  { name: 'MongoDB', url: 'http://localhost:27017', type: 'database' },
  { name: 'Redis', url: 'http://localhost:6379', type: 'cache' },
  { name: 'Kafka', url: 'http://localhost:9092', type: 'message-queue' },
  { name: 'ClickHouse', url: 'http://localhost:8123', type: 'analytics-db' },
  { name: 'Elasticsearch', url: 'http://localhost:9200', type: 'search' }
];

/**
 * Make HTTP request with timeout
 */
function makeRequest(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const startTime = Date.now();
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        try {
          const jsonData = JSON.parse(data);
          resolve({ 
            statusCode: res.statusCode, 
            data: jsonData, 
            responseTime 
          });
        } catch (error) {
          resolve({ 
            statusCode: res.statusCode, 
            data: data, 
            responseTime 
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(timeout, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Check service health
 */
async function checkServiceHealth(service) {
  const startTime = Date.now();
  
  try {
    const response = await makeRequest(service.url);
    const responseTime = Date.now() - startTime;
    
    if (response.statusCode === 200) {
      const health = response.data;
      
      if (health.status === 'healthy') {
        logSuccess(`${service.name} - Healthy (${responseTime}ms)`);
        return { status: 'healthy', responseTime, service: service.name };
      } else if (health.status === 'degraded') {
        logWarning(`${service.name} - Degraded (${responseTime}ms)`);
        return { status: 'degraded', responseTime, service: service.name };
      } else {
        logError(`${service.name} - Unhealthy (${responseTime}ms)`);
        return { status: 'unhealthy', responseTime, service: service.name };
      }
    } else {
      logError(`${service.name} - HTTP ${response.statusCode} (${responseTime}ms)`);
      return { status: 'error', responseTime, service: service.name, error: `HTTP ${response.statusCode}` };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logError(`${service.name} - Connection failed: ${error.message} (${responseTime}ms)`);
    return { status: 'error', responseTime, service: service.name, error: error.message };
  }
}

/**
 * Check infrastructure connectivity
 */
async function checkInfrastructure(infra) {
  try {
    // For databases, we'll try to connect to their HTTP interfaces where available
    if (infra.type === 'search' || infra.type === 'analytics-db') {
      await makeRequest(infra.url, 3000);
      logSuccess(`${infra.name} - Connected`);
      return { status: 'connected', service: infra.name };
    } else {
      // For other services, we'll just check if the port is listening
      logInfo(`${infra.name} - Port check (service-specific health check needed)`);
      return { status: 'unknown', service: infra.name };
    }
  } catch (error) {
    logWarning(`${infra.name} - ${error.message}`);
    return { status: 'error', service: infra.name, error: error.message };
  }
}

/**
 * Run comprehensive health checks
 */
async function runHealthChecks() {
  console.log('🏥 DaorsAgro Platform Health Check\n');
  
  // Check infrastructure first
  logInfo('Checking Infrastructure Services...');
  const infraResults = [];
  for (const infra of infrastructure) {
    const result = await checkInfrastructure(infra);
    infraResults.push(result);
  }
  
  console.log('\n');
  
  // Check application services
  logInfo('Checking Application Services...');
  const serviceResults = [];
  for (const service of services) {
    const result = await checkServiceHealth(service);
    serviceResults.push(result);
  }
  
  // Generate summary report
  console.log('\n' + '='.repeat(60));
  log('HEALTH CHECK SUMMARY', 'blue');
  console.log('='.repeat(60));
  
  // Infrastructure summary
  const infraConnected = infraResults.filter(r => r.status === 'connected').length;
  const infraTotal = infraResults.length;
  console.log(`\nInfrastructure Services: ${infraConnected}/${infraTotal} responding`);
  
  // Application services summary
  const healthyServices = serviceResults.filter(r => r.status === 'healthy').length;
  const degradedServices = serviceResults.filter(r => r.status === 'degraded').length;
  const unhealthyServices = serviceResults.filter(r => r.status === 'unhealthy' || r.status === 'error').length;
  const totalServices = serviceResults.length;
  
  console.log(`Application Services: ${healthyServices} healthy, ${degradedServices} degraded, ${unhealthyServices} unhealthy`);
  
  // Performance summary
  const responseTimes = serviceResults
    .filter(r => r.responseTime)
    .map(r => r.responseTime);
    
  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms (max: ${maxResponseTime}ms)`);
  }
  
  // Critical services check
  const criticalServices = services.filter(s => s.critical);
  const criticalResults = serviceResults.filter(r => {
    const service = services.find(s => s.name === r.service);
    return service && service.critical;
  });
  
  const criticalHealthy = criticalResults.filter(r => r.status === 'healthy').length;
  const criticalTotal = criticalServices.length;
  
  console.log(`\nCritical Services: ${criticalHealthy}/${criticalTotal} healthy`);
  
  // Overall status
  console.log('\n' + '='.repeat(60));
  
  if (criticalHealthy === criticalTotal && unhealthyServices === 0) {
    logSuccess('✓ PLATFORM STATUS: HEALTHY');
    logInfo('All critical services are operational');
  } else if (criticalHealthy === criticalTotal) {
    logWarning('⚠ PLATFORM STATUS: DEGRADED');
    logInfo('Critical services are healthy but some non-critical services have issues');
  } else {
    logError('✗ PLATFORM STATUS: UNHEALTHY');
    logError('One or more critical services are not operational');
  }
  
  // Recommendations
  console.log('\nRecommendations:');
  
  const errorResults = serviceResults.filter(r => r.status === 'error' || r.status === 'unhealthy');
  if (errorResults.length > 0) {
    logInfo('1. Check Docker containers: docker-compose ps');
    logInfo('2. View service logs: docker-compose logs [service-name]');
    logInfo('3. Restart failed services: docker-compose restart [service-name]');
  }
  
  const slowResults = serviceResults.filter(r => r.responseTime && r.responseTime > 2000);
  if (slowResults.length > 0) {
    logInfo('4. Some services are responding slowly - check resource usage');
  }
  
  if (degradedServices > 0) {
    logInfo('5. Review degraded services for potential issues');
  }
  
  // Exit with appropriate code
  if (criticalHealthy < criticalTotal) {
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await runHealthChecks();
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    process.exit(1);
  }
}

// Run health checks
if (require.main === module) {
  main();
}

module.exports = { main };", "original_text": null}]