const http = require('http');
const url = require('url');
const { StringDecoder } = require('string_decoder');

// Configuration
const PORT = process.env.PORT || 8080;
const ENVIRONMENT = process.env.NODE_ENV || 'production';

// Create server
const server = http.createServer((req, res) => {
  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true);
  
  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');
  
  // Get the query string as an object
  const queryStringObject = parsedUrl.query;
  
  // Get the HTTP method
  const method = req.method.toLowerCase();
  
  // Get the headers as an object
  const headers = req.headers;
  
  // Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  
  req.on('data', (data) => {
    buffer += decoder.write(data);
  });
  
  req.on('end', () => {
    buffer += decoder.end();
    
    // Choose the handler this request should go to
    const chosenHandler = typeof router[trimmedPath] !== 'undefined' ? router[trimmedPath] : handlers.notFound;
    
    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: buffer
    };
    
    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload) => {
      // Use the status code called back by the handler, or default to 200
      statusCode = typeof statusCode === 'number' ? statusCode : 200;
      
      // Use the payload called back by the handler, or default to an empty object
      payload = typeof payload === 'object' ? payload : {};
      
      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);
      
      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);
      
      // Log the response
      console.log(`Returning this response: ${statusCode} ${payloadString}`);
    });
  });
});

// Define the handlers
const handlers = {};

// Health check handler
handlers.health = (data, callback) => {
  callback(200, {
    status: 'healthy',
    service: 'DaorsAgro API Gateway',
    version: '1.0.0',
    environment: ENVIRONMENT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// API version handler
handlers.apiVersion = (data, callback) => {
  callback(200, {
    service: 'api-gateway',
    version: '1.0.0',
    environment: ENVIRONMENT,
    timestamp: new Date().toISOString()
  });
};

// Root handler
handlers.home = (data, callback) => {
  callback(200, {
    message: 'DaorsAgro API Gateway',
    version: '1.0.0',
    environment: ENVIRONMENT,
    health: '/health',
    version: '/api/version'
  });
};

// Auth service handler
handlers.auth = (data, callback) => {
  callback(200, {
    message: 'Auth Service Endpoint',
    endpoints: ['POST /api/v1/auth/login', 'POST /api/v1/auth/register', 'GET /api/v1/auth/profile']
  });
};

// Financial service handler
handlers.financial = (data, callback) => {
  callback(200, {
    message: 'Financial Service Endpoint',
    endpoints: ['GET /api/v1/transactions', 'POST /api/v1/transactions', 'GET /api/v1/budgets']
  });
};

// Subsidy service handler
handlers.subsidies = (data, callback) => {
  callback(200, {
    message: 'Subsidy Service Endpoint',
    endpoints: ['GET /api/v1/subsidies/programs', 'POST /api/v1/subsidies/apply']
  });
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404, {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${data.method.toUpperCase()} ${data.trimmedPath} not found`,
      timestamp: new Date().toISOString()
    }
  });
};

// Define the router
const router = {
  '': handlers.home,
  'health': handlers.health,
  'api/version': handlers.apiVersion,
  'api/v1/auth': handlers.auth,
  'api/v1/financial': handlers.financial,
  'api/v1/subsidies': handlers.subsidies
};

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 DaorsAgro API Gateway started on port ${PORT}`);
  console.log(`🌍 Environment: ${ENVIRONMENT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`✨ Server is running and accessible!`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});