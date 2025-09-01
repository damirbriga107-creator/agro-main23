#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

class ApiMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'api-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.baseUrls = {
      auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      financial: process.env.FINANCIAL_SERVICE_URL || 'http://localhost:3002',
      subsidy: process.env.SUBSIDY_SERVICE_URL || 'http://localhost:3003',
      insurance: process.env.INSURANCE_SERVICE_URL || 'http://localhost:3004',
      analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005',
      document: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3006',
      notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
      iot: process.env.IOT_SERVICE_URL || 'http://localhost:3008',
      weather: process.env.WEATHER_SERVICE_URL || 'http://localhost:3009',
      apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:3000',
    };

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'auth_service_call',
            description: 'Interact with the authentication service',
            inputSchema: {
              type: 'object',
              properties: {
                endpoint: { type: 'string', description: 'API endpoint (e.g., /auth/login)' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
                data: { type: 'object', description: 'Request body data' },
                headers: { type: 'object', description: 'Additional headers' },
              },
              required: ['endpoint'],
            },
          },
          {
            name: 'financial_service_call',
            description: 'Interact with the financial service',
            inputSchema: {
              type: 'object',
              properties: {
                endpoint: { type: 'string', description: 'API endpoint (e.g., /transactions)' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
                data: { type: 'object', description: 'Request body data' },
                headers: { type: 'object', description: 'Additional headers' },
              },
              required: ['endpoint'],
            },
          },
          {
            name: 'analytics_service_call',
            description: 'Interact with the analytics service',
            inputSchema: {
              type: 'object',
              properties: {
                endpoint: { type: 'string', description: 'API endpoint (e.g., /reports/dashboard)' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
                data: { type: 'object', description: 'Request body data' },
                headers: { type: 'object', description: 'Additional headers' },
              },
              required: ['endpoint'],
            },
          },
          {
            name: 'document_service_call',
            description: 'Interact with the document service',
            inputSchema: {
              type: 'object',
              properties: {
                endpoint: { type: 'string', description: 'API endpoint (e.g., /documents/upload)' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
                data: { type: 'object', description: 'Request body data' },
                headers: { type: 'object', description: 'Additional headers' },
              },
              required: ['endpoint'],
            },
          },
          {
            name: 'weather_service_call',
            description: 'Interact with the weather service',
            inputSchema: {
              type: 'object',
              properties: {
                endpoint: { type: 'string', description: 'API endpoint (e.g., /weather/forecast)' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
                data: { type: 'object', description: 'Request body data' },
                headers: { type: 'object', description: 'Additional headers' },
              },
              required: ['endpoint'],
            },
          },
          {
            name: 'iot_service_call',
            description: 'Interact with the IoT service',
            inputSchema: {
              type: 'object',
              properties: {
                endpoint: { type: 'string', description: 'API endpoint (e.g., /devices)' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
                data: { type: 'object', description: 'Request body data' },
                headers: { type: 'object', description: 'Additional headers' },
              },
              required: ['endpoint'],
            },
          },
          {
            name: 'api_gateway_call',
            description: 'Make calls through the API gateway',
            inputSchema: {
              type: 'object',
              properties: {
                endpoint: { type: 'string', description: 'API endpoint (e.g., /api/v1/users)' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
                data: { type: 'object', description: 'Request body data' },
                headers: { type: 'object', description: 'Additional headers' },
              },
              required: ['endpoint'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'auth_service_call':
            return await this.makeServiceCall('auth', args);
          case 'financial_service_call':
            return await this.makeServiceCall('financial', args);
          case 'analytics_service_call':
            return await this.makeServiceCall('analytics', args);
          case 'document_service_call':
            return await this.makeServiceCall('document', args);
          case 'weather_service_call':
            return await this.makeServiceCall('weather', args);
          case 'iot_service_call':
            return await this.makeServiceCall('iot', args);
          case 'api_gateway_call':
            return await this.makeServiceCall('apiGateway', args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    });
  }

  async makeServiceCall(service, args) {
    const { endpoint, method = 'GET', data, headers = {} } = args;
    const baseUrl = this.baseUrls[service];

    if (!baseUrl) {
      throw new Error(`Unknown service: ${service}`);
    }

    const url = `${baseUrl}${endpoint}`;

    try {
      const config = {
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: 30000, // 30 second timeout
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
      }

      const response = await axios(config);

      return {
        content: [
          {
            type: 'text',
            text: `API Response (${response.status}):\n${JSON.stringify(response.data, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        return {
          content: [
            {
              type: 'text',
              text: `API Error (${error.response.status}): ${error.response.statusText}\n${JSON.stringify(error.response.data, null, 2)}`,
            },
          ],
          isError: true,
        };
      } else if (error.request) {
        // Request was made but no response received
        throw new Error(`No response received from ${service} service: ${error.message}`);
      } else {
        // Something else happened
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('API MCP Server running on stdio');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down API MCP Server...');
  process.exit(0);
});

async function main() {
  const server = new ApiMCPServer();
  await server.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start API MCP Server:', error);
    process.exit(1);
  });
}

module.exports = ApiMCPServer;