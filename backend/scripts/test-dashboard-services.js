#!/usr/bin/env node

/**
 * Dashboard Services Test Runner
 * Tests all dashboard backend endpoints with mock data
 */

const axios = require('axios');
const chalk = require('chalk');

// Configuration
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost',
  services: {
    analytics: { port: process.env.ANALYTICS_PORT || '3006', name: 'Analytics Service' },
    iot: { port: process.env.IOT_PORT || '3008', name: 'IoT Service' },
    weather: { port: process.env.WEATHER_PORT || '3009', name: 'Weather Service' },
    financial: { port: process.env.FINANCIAL_PORT || '3005', name: 'Financial Service' }
  },
  authToken: 'Bearer test-token-dashboard-123',
  timeout: 10000
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  services: {}
};

// Utility functions
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  header: (msg) => console.log(chalk.bold.cyan('\n' + msg))
};

// HTTP client factory
function createClient(service) {
  return axios.create({
    baseURL: `${config.baseUrl}:${service.port}`,
    headers: {
      'Authorization': config.authToken,
      'Content-Type': 'application/json',
      'X-Test-Client': 'dashboard-test'
    },
    timeout: config.timeout
  });
}

// Test runner
async function runTest(testName, testFn) {
  try {
    await testFn();
    testResults.passed++;
    log.success(`${testName}`);
    return true;
  } catch (error) {
    testResults.failed++;
    log.error(`${testName}: ${error.message}`);
    return false;
  }
}

// Service health check
async function checkServiceHealth(serviceName, client) {
  return runTest(`${serviceName} - Health Check`, async () => {
    const response = await client.get('/health');
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    if (response.data.status !== 'healthy') {
      throw new Error(`Service not healthy: ${response.data.status}`);
    }
  });
}

// Analytics Service Tests
async function testAnalyticsService() {
  log.header('Testing Analytics Service');
  const client = createClient(config.services.analytics);
  const serviceName = 'Analytics';
  testResults.services[serviceName] = { passed: 0, failed: 0 };

  // Health check
  await checkServiceHealth(serviceName, client);

  // Dashboard metrics endpoint
  await runTest(`${serviceName} - Dashboard Metrics`, async () => {
    const response = await client.get('/api/v1/analytics/dashboard/metrics');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
    if (!response.data.data.financial) throw new Error('Missing financial data');
    if (!response.data.data.production) throw new Error('Missing production data');
    if (!response.data.data.users) throw new Error('Missing users data');
  });

  // KPIs endpoint
  await runTest(`${serviceName} - KPIs`, async () => {
    const response = await client.get('/api/v1/analytics/kpis');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
    if (!Array.isArray(response.data.data)) throw new Error('KPIs should be an array');
  });

  // Dashboard summary endpoint
  await runTest(`${serviceName} - Dashboard Summary`, async () => {
    const response = await client.get('/api/v1/analytics/dashboard/summary');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
  });

  // Test with date filters
  await runTest(`${serviceName} - Date Filtered Metrics`, async () => {
    const response = await client.get('/api/v1/analytics/dashboard/metrics?period=monthly&startDate=2024-01-01');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
  });
}

// IoT Service Tests
async function testIoTService() {
  log.header('Testing IoT Service');
  const client = createClient(config.services.iot);
  const serviceName = 'IoT';
  testResults.services[serviceName] = { passed: 0, failed: 0 };

  // Health check
  await checkServiceHealth(serviceName, client);

  // Devices endpoint
  await runTest(`${serviceName} - Device List`, async () => {
    const response = await client.get('/api/v1/iot/devices');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
    if (!Array.isArray(response.data.data)) throw new Error('Devices should be an array');
  });

  // Device summary endpoint
  await runTest(`${serviceName} - Device Summary`, async () => {
    const response = await client.get('/api/v1/iot/summary');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
    if (typeof response.data.data.totalDevices !== 'number') throw new Error('Missing totalDevices');
    if (typeof response.data.data.onlineDevices !== 'number') throw new Error('Missing onlineDevices');
  });

  // Device filtering
  await runTest(`${serviceName} - Device Filtering`, async () => {
    const response = await client.get('/api/v1/iot/devices?status=online&limit=5');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
    if (response.data.data.length > 5) throw new Error('Limit not applied');
  });

  // Device type filtering
  await runTest(`${serviceName} - Device Type Filtering`, async () => {
    const response = await client.get('/api/v1/iot/devices?type=soil_sensor');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
  });
}

// Weather Service Tests
async function testWeatherService() {
  log.header('Testing Weather Service');
  const client = createClient(config.services.weather);
  const serviceName = 'Weather';
  testResults.services[serviceName] = { passed: 0, failed: 0 };

  // Health check
  await checkServiceHealth(serviceName, client);

  // Current weather endpoint
  await runTest(`${serviceName} - Current Weather`, async () => {
    const response = await client.get('/api/v1/weather/current');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
    if (!response.data.data.location) throw new Error('Missing location');
    if (typeof response.data.data.temperature !== 'number') throw new Error('Missing temperature');
  });

  // Weather forecast endpoint
  await runTest(`${serviceName} - Weather Forecast`, async () => {
    const response = await client.get('/api/v1/weather/forecast');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
    if (!Array.isArray(response.data.data.forecast)) throw new Error('Forecast should be an array');
  });

  // Weather insights endpoint
  await runTest(`${serviceName} - Weather Insights`, async () => {
    const response = await client.get('/api/v1/weather/insights');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
  });

  // Location-based weather
  await runTest(`${serviceName} - Location Weather`, async () => {
    const response = await client.get('/api/v1/weather/current?lat=40.7128&lon=-74.0060');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
  });
}

// Financial Service Tests  
async function testFinancialService() {
  log.header('Testing Financial Service');
  const client = createClient(config.services.financial);
  const serviceName = 'Financial';
  testResults.services[serviceName] = { passed: 0, failed: 0 };

  // Health check
  await checkServiceHealth(serviceName, client);

  // Transactions endpoint
  await runTest(`${serviceName} - Recent Transactions`, async () => {
    const response = await client.get('/api/v1/transactions?limit=10');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
    if (!Array.isArray(response.data.data)) throw new Error('Transactions should be an array');
  });

  // Transaction summary endpoint
  await runTest(`${serviceName} - Transaction Summary`, async () => {
    const response = await client.get('/api/v1/transactions/summary');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
  });

  // Transaction filtering
  await runTest(`${serviceName} - Transaction Filtering`, async () => {
    const response = await client.get('/api/v1/transactions?type=income&status=completed');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
  });

  // Transaction pagination
  await runTest(`${serviceName} - Transaction Pagination`, async () => {
    const response = await client.get('/api/v1/transactions?page=1&limit=5');
    if (response.status !== 200) throw new Error(`Status: ${response.status}`);
    if (!response.data.success) throw new Error('Response not successful');
  });
}

// Error handling tests
async function testErrorHandling() {
  log.header('Testing Error Handling');
  
  // Test 404 handling
  await runTest('Error Handling - 404 Response', async () => {
    const client = createClient(config.services.analytics);
    try {
      await client.get('/api/v1/nonexistent-endpoint');
      throw new Error('Should have thrown 404 error');
    } catch (error) {
      if (error.response?.status !== 404) {
        throw new Error(`Expected 404, got ${error.response?.status}`);
      }
    }
  });

  // Test unauthorized access
  await runTest('Error Handling - Unauthorized Access', async () => {
    const clientWithoutAuth = axios.create({
      baseURL: `${config.baseUrl}:${config.services.analytics.port}`,
      timeout: config.timeout
    });
    
    try {
      await clientWithoutAuth.get('/api/v1/analytics/dashboard/metrics');
      throw new Error('Should have thrown auth error');
    } catch (error) {
      if (error.response?.status !== 401) {
        throw new Error(`Expected 401, got ${error.response?.status}`);
      }
    }
  });
}

// Performance test
async function testPerformance() {
  log.header('Performance Testing');
  
  const endpoints = [
    { service: 'Analytics', url: `/api/v1/analytics/dashboard/metrics`, client: createClient(config.services.analytics) },
    { service: 'IoT', url: `/api/v1/iot/devices`, client: createClient(config.services.iot) },
    { service: 'Weather', url: `/api/v1/weather/current`, client: createClient(config.services.weather) },
    { service: 'Financial', url: `/api/v1/transactions`, client: createClient(config.services.financial) }
  ];

  for (const endpoint of endpoints) {
    await runTest(`Performance - ${endpoint.service} Response Time`, async () => {
      const startTime = Date.now();
      const response = await endpoint.client.get(endpoint.url);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (response.status !== 200) {
        throw new Error(`Status: ${response.status}`);
      }
      
      if (duration > 5000) {
        throw new Error(`Response too slow: ${duration}ms`);
      }
      
      log.info(`${endpoint.service}: ${duration}ms`);
    });
  }
}

// Main test runner
async function runAllTests() {
  console.log(chalk.bold.blue('\n🚀 Dashboard Backend Services Test Suite\n'));
  
  try {
    // Test each service
    await testAnalyticsService();
    await testIoTService();
    await testWeatherService();
    await testFinancialService();
    
    // Test error handling
    await testErrorHandling();
    
    // Performance tests
    await testPerformance();
    
    // Results summary
    log.header('Test Results Summary');
    console.log(chalk.green(`✓ Passed: ${testResults.passed}`));
    console.log(chalk.red(`✗ Failed: ${testResults.failed}`));
    console.log(chalk.blue(`📊 Total: ${testResults.passed + testResults.failed}`));
    
    if (testResults.failed === 0) {
      console.log(chalk.bold.green('\n🎉 All tests passed! Dashboard services are working correctly.\n'));
      process.exit(0);
    } else {
      console.log(chalk.bold.red(`\n❌ ${testResults.failed} tests failed. Please check the service implementations.\n`));
      process.exit(1);
    }
    
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testAnalyticsService,
  testIoTService,
  testWeatherService,
  testFinancialService,
  config
};