import axios from 'axios';
import { expect } from 'chai';
import { describe, it, before } from 'mocha';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost';
const ANALYTICS_PORT = process.env.ANALYTICS_PORT || '3006';
const IOT_PORT = process.env.IOT_PORT || '3008';
const WEATHER_PORT = process.env.WEATHER_PORT || '3009';
const FINANCIAL_PORT = process.env.FINANCIAL_PORT || '3005';

// Mock auth token for testing
const AUTH_TOKEN = 'Bearer test-token';

describe('Dashboard Backend Services Integration Tests', () => {
  let analyticsClient: any;
  let iotClient: any;
  let weatherClient: any;
  let financialClient: any;

  before(() => {
    // Setup HTTP clients for each service
    analyticsClient = axios.create({
      baseURL: `${BASE_URL}:${ANALYTICS_PORT}`,
      headers: {
        'Authorization': AUTH_TOKEN,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    iotClient = axios.create({
      baseURL: `${BASE_URL}:${IOT_PORT}`,
      headers: {
        'Authorization': AUTH_TOKEN,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    weatherClient = axios.create({
      baseURL: `${BASE_URL}:${WEATHER_PORT}`,
      headers: {
        'Authorization': AUTH_TOKEN,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    financialClient = axios.create({
      baseURL: `${BASE_URL}:${FINANCIAL_PORT}`,
      headers: {
        'Authorization': AUTH_TOKEN,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  });

  describe('Analytics Service Tests', () => {
    it('should get dashboard metrics', async () => {
      try {
        const response = await analyticsClient.get('/api/v1/analytics/dashboard/metrics');
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data');
        expect(response.data.data).to.have.property('financial');
        expect(response.data.data).to.have.property('production');
        expect(response.data.data).to.have.property('users');
        
        console.log('✓ Analytics: Dashboard metrics endpoint working');
      } catch (error: any) {
        console.log('✗ Analytics: Dashboard metrics failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should get KPIs', async () => {
      try {
        const response = await analyticsClient.get('/api/v1/analytics/kpis');
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data');
        expect(Array.isArray(response.data.data)).to.be.true;
        
        console.log('✓ Analytics: KPIs endpoint working');
      } catch (error: any) {
        console.log('✗ Analytics: KPIs failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should get dashboard summary', async () => {
      try {
        const response = await analyticsClient.get('/api/v1/analytics/dashboard/summary');
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data');
        
        console.log('✓ Analytics: Dashboard summary endpoint working');
      } catch (error: any) {
        console.log('✗ Analytics: Dashboard summary failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('IoT Service Tests', () => {
    it('should get IoT devices', async () => {
      try {
        const response = await iotClient.get('/api/v1/iot/devices');
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data');
        expect(Array.isArray(response.data.data)).to.be.true;
        
        console.log('✓ IoT: Devices endpoint working');
      } catch (error: any) {
        console.log('✗ IoT: Devices failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should get IoT device summary', async () => {
      try {
        const response = await iotClient.get('/api/v1/iot/summary');
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data');
        expect(response.data.data).to.have.property('totalDevices');
        expect(response.data.data).to.have.property('onlineDevices');
        
        console.log('✓ IoT: Device summary endpoint working');
      } catch (error: any) {
        console.log('✗ IoT: Device summary failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should filter devices by status', async () => {
      try {
        const response = await iotClient.get('/api/v1/iot/devices?status=online&limit=5');
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data');
        
        console.log('✓ IoT: Device filtering working');
      } catch (error: any) {
        console.log('✗ IoT: Device filtering failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Weather Service Tests', () => {
    it('should get current weather', async () => {
      try {
        const response = await weatherClient.get('/api/v1/weather/current');
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data');
        expect(response.data.data).to.have.property('location');
        expect(response.data.data).to.have.property('temperature');
        
        console.log('✓ Weather: Current weather endpoint working');
      } catch (error: any) {
        console.log('✗ Weather: Current weather failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should get weather forecast', async () => {
      try {
        const response = await weatherClient.get('/api/v1/weather/forecast');
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data');
        expect(Array.isArray(response.data.data.forecast)).to.be.true;
        
        console.log('✓ Weather: Forecast endpoint working');
      } catch (error: any) {
        console.log('✗ Weather: Forecast failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should get weather insights', async () => {
      try {
        const response = await weatherClient.get('/api/v1/weather/insights');
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data');
        
        console.log('✓ Weather: Insights endpoint working');
      } catch (error: any) {
        console.log('✗ Weather: Insights failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Financial Service Tests', () => {
    it('should get recent transactions', async () => {
      try {
        const response = await financialClient.get('/api/v1/transactions?limit=10');
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data');
        expect(Array.isArray(response.data.data)).to.be.true;
        
        console.log('✓ Financial: Transactions endpoint working');
      } catch (error: any) {
        console.log('✗ Financial: Transactions failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should get transaction summary', async () => {
      try {
        const response = await financialClient.get('/api/v1/transactions/summary');
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data');
        
        console.log('✓ Financial: Transaction summary endpoint working');
      } catch (error: any) {
        console.log('✗ Financial: Transaction summary failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Health Check Tests', () => {
    const services = [
      { name: 'Analytics', client: analyticsClient },
      { name: 'IoT', client: iotClient },
      { name: 'Weather', client: weatherClient },
      { name: 'Financial', client: financialClient }
    ];

    services.forEach(service => {
      it(`should check ${service.name} service health`, async () => {
        try {
          const response = await service.client.get('/health');
          
          expect(response.status).to.equal(200);
          expect(response.data).to.have.property('status', 'healthy');
          expect(response.data).to.have.property('service');
          
          console.log(`✓ ${service.name}: Health check passed`);
        } catch (error: any) {
          console.log(`✗ ${service.name}: Health check failed:`, error.response?.data || error.message);
          throw error;
        }
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid endpoints gracefully', async () => {
      try {
        const response = await analyticsClient.get('/api/v1/invalid-endpoint');
        expect(response.status).to.equal(404);
      } catch (error: any) {
        expect(error.response.status).to.equal(404);
        console.log('✓ Analytics: 404 error handling working');
      }
    });

    it('should handle missing auth tokens', async () => {
      try {
        const clientWithoutAuth = axios.create({
          baseURL: `${BASE_URL}:${ANALYTICS_PORT}`,
          timeout: 10000
        });
        
        const response = await clientWithoutAuth.get('/api/v1/analytics/dashboard/metrics');
        expect(response.status).to.equal(401);
      } catch (error: any) {
        expect(error.response.status).to.equal(401);
        console.log('✓ Analytics: Auth error handling working');
      }
    });
  });
});

// Performance monitoring helper
export async function performanceTest() {
  console.log('\n🔄 Running Performance Tests...\n');
  
  const endpoints = [
    { service: 'Analytics', url: `${BASE_URL}:${ANALYTICS_PORT}/api/v1/analytics/dashboard/metrics` },
    { service: 'IoT', url: `${BASE_URL}:${IOT_PORT}/api/v1/iot/devices` },
    { service: 'Weather', url: `${BASE_URL}:${WEATHER_PORT}/api/v1/weather/current` },
    { service: 'Financial', url: `${BASE_URL}:${FINANCIAL_PORT}/api/v1/transactions` }
  ];

  for (const endpoint of endpoints) {
    const startTime = Date.now();
    try {
      const response = await axios.get(endpoint.url, {
        headers: { 'Authorization': AUTH_TOKEN },
        timeout: 10000
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⚡ ${endpoint.service}: ${duration}ms (${response.status})`);
    } catch (error: any) {
      console.log(`❌ ${endpoint.service}: Failed (${error.response?.status || 'timeout'})`);
    }
  }
}

// Connection test helper
export async function testConnections() {
  console.log('\n🔗 Testing Service Connections...\n');
  
  const services = [
    { name: 'Analytics', port: ANALYTICS_PORT },
    { name: 'IoT', port: IOT_PORT },
    { name: 'Weather', port: WEATHER_PORT },
    { name: 'Financial', port: FINANCIAL_PORT }
  ];

  for (const service of services) {
    try {
      const response = await axios.get(`${BASE_URL}:${service.port}/health`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log(`✅ ${service.name} Service: Connected (${service.port})`);
      } else {
        console.log(`⚠️  ${service.name} Service: Unexpected status ${response.status}`);
      }
    } catch (error: any) {
      console.log(`❌ ${service.name} Service: Connection failed (${service.port})`);
    }
  }
}

// Run standalone tests
if (require.main === module) {
  (async () => {
    console.log('🚀 Starting Dashboard Backend Tests...\n');
    
    await testConnections();
    await performanceTest();
    
    console.log('\n✨ Test suite completed!');
  })();
}