# DaorsAgro MCP Servers

This directory contains Model Context Protocol (MCP) servers specifically designed for the DaorsAgro agricultural management platform. These servers provide AI assistants with powerful tools to interact with the platform's various components.

## Available MCP Servers

### 1. Database Server (`database-server.js`)
Provides tools for interacting with the platform's databases:
- **PostgreSQL queries** - Execute SQL queries on the main database
- **MongoDB operations** - Perform CRUD operations on document collections
- **Redis operations** - Cache operations and session management

### 2. API Server (`api-server.js`)
Enables interaction with all backend microservices:
- **Authentication Service** - User management and JWT operations
- **Financial Service** - Transaction and budget management
- **Analytics Service** - Business intelligence and reporting
- **Document Service** - File upload and OCR processing
- **Weather Service** - Weather data and forecasting
- **IoT Service** - Sensor data and device management
- **API Gateway** - Unified API access

### 3. Filesystem Server (`filesystem-server.js`)
File system operations within the project:
- **Read/Write files** - Access and modify project files
- **Directory operations** - List, create, and manage directories
- **Search operations** - Find files and content using patterns
- **File information** - Get metadata about files

### 4. Code Analysis Server (`code-analysis-server.js`)
Advanced code analysis and quality assessment:
- **TypeScript/JavaScript analysis** - Structure and pattern recognition
- **Function and class detection** - Code organization insights
- **Dependency analysis** - Package.json and import analysis
- **TODO comment detection** - Track development tasks
- **Code quality metrics** - Complexity and maintainability scores
- **Duplicate code detection** - Identify refactoring opportunities

### 5. Agricultural Server (`agricultural-server.js`)
Specialized agricultural tools and calculations:
- **Crop yield calculation** - Estimate production based on various factors
- **Weather impact analysis** - Assess weather effects on crops
- **Subsidy eligibility** - Calculate potential government support
- **Market price prediction** - Forecast commodity prices
- **Irrigation requirements** - Water usage calculations
- **Soil health analysis** - Nutrient and pH assessment
- **Farm profitability** - Financial performance analysis
- **Report generation** - Comprehensive farm reports

## Installation

1. **Install dependencies:**
   ```bash
   cd mcp-servers
   npm install
   ```

2. **Configure environment variables** (optional):
   Create a `.env` file in the mcp-servers directory with your database and service URLs.

## Usage

### Starting Individual Servers

```bash
# Database server
npm run start:database

# API server
npm run start:api

# Filesystem server
npm run start:filesystem

# Code analysis server
npm run start:code-analysis

# Agricultural server
npm run start:agricultural
```

### Starting All Servers

```bash
npm run start:all
```

This will start all MCP servers concurrently using the `concurrently` package.

## Configuration

The servers are configured through the MCP settings files:
- `.kilocode/mcp.json` - Project-specific configuration
- Global settings in VSCode user directory

Each server can be configured with:
- **Command and arguments** - How to start the server
- **Environment variables** - Database URLs, API endpoints, etc.
- **Working directory** - Where the server should run

## Environment Variables

### Database Server
- `DATABASE_URL` - PostgreSQL connection string
- `MONGODB_URL` - MongoDB connection string
- `REDIS_URL` - Redis connection string

### API Server
- `AUTH_SERVICE_URL` - Authentication service endpoint
- `FINANCIAL_SERVICE_URL` - Financial service endpoint
- `ANALYTICS_SERVICE_URL` - Analytics service endpoint
- `DOCUMENT_SERVICE_URL` - Document service endpoint
- `WEATHER_SERVICE_URL` - Weather service endpoint
- `IOT_SERVICE_URL` - IoT service endpoint
- `API_GATEWAY_URL` - API gateway endpoint

## Security Considerations

- **File system access** is restricted to the project root directory
- **Database operations** require proper connection credentials
- **API calls** respect authentication and authorization
- **Environment variables** should contain sensitive information securely

## Development

### Adding New Tools

1. Add the tool definition to the `setupToolHandlers()` method
2. Implement the tool logic in a corresponding handler method
3. Update the tool's input schema in the `ListToolsRequestSchema` response
4. Test the tool thoroughly

### Testing

```bash
npm test
```

### Code Structure

Each server follows this structure:
- **Server initialization** - MCP server setup
- **Tool registration** - Define available tools
- **Handler implementation** - Tool execution logic
- **Error handling** - Proper error responses
- **Cleanup** - Resource cleanup on shutdown

## Integration with Kilo Code

These MCP servers are automatically registered with Kilo Code through the configuration files. Once started, Kilo Code can:

1. **Discover available tools** - List all tools from all servers
2. **Execute tools** - Call tools with appropriate parameters
3. **Handle responses** - Process tool results and errors
4. **Maintain context** - Keep conversation context across tool calls

## Troubleshooting

### Common Issues

1. **Server won't start** - Check Node.js version and dependencies
2. **Database connection fails** - Verify connection strings and credentials
3. **API calls fail** - Check service endpoints and network connectivity
4. **File access denied** - Ensure proper file permissions

### Logs

Each server outputs logs to stderr. Check the Kilo Code output for:
- Server startup messages
- Tool execution logs
- Error messages and stack traces

## Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive error handling
3. Include input validation for all tools
4. Update documentation for new features
5. Test thoroughly before submitting

## License

MIT License - see the main project LICENSE file for details.