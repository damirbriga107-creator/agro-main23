const http = require('http');
const url = require('url');
const { promisify } = require('util');

const PORT = process.env.PORT || 3000;

// Simple in-memory store for service registry
const services = {
  'auth': { url: 'http://localhost:3001', status: 'unknown' },
  'document': { url: 'http://localhost:3002', status: 'unknown' },
  'financial': { url: 'http://localhost:3003', status: 'unknown' },
  'weather': { url: 'http://localhost:3004', status: 'unknown' }
};

// Simple HTTP proxy function
async function proxyRequest(targetUrl, req, res) {
  const parsedTarget = new URL(targetUrl);
  const options = {
    hostname: parsedTarget.hostname,
    port: parsedTarget.port || 80,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: parsedTarget.host
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    // Copy headers from proxied response
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Service unavailable', details: err.message }));
  });

  req.pipe(proxyReq);
}

// CORS headers helper
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// JSON response helper
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

// Main request handler
async function handleRequest(req, res) {
  setCORSHeaders(res);
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`${req.method} ${pathname} - ${new Date().toISOString()}`);

  try {
    // Health check endpoint
    if (pathname === '/health') {
      return sendJSON(res, {
        status: 'healthy',
        service: 'DaorsAgro Basic API Gateway',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    }

    // Service discovery endpoint
    if (pathname === '/api/services') {
      return sendJSON(res, {
        services: Object.entries(services).map(([name, config]) => ({
          name,
          url: config.url,
          status: config.status
        }))
      });
    }

    // Root endpoint
    if (pathname === '/') {
      return sendJSON(res, {
        message: 'DaorsAgro Basic API Gateway',
        version: '1.0.0',
        endpoints: [
          '/health',
          '/api/services',
          '/api/auth/*',
          '/api/documents/*',
          '/api/finance/*',
          '/api/weather/*'
        ]
      });
    }

    // Route to services
    if (pathname.startsWith('/api/auth/')) {
      return proxyRequest(services.auth.url + pathname.replace('/api/auth', ''), req, res);
    }

    if (pathname.startsWith('/api/documents/')) {
      return proxyRequest(services.document.url + pathname.replace('/api/documents', ''), req, res);
    }

    if (pathname.startsWith('/api/finance/')) {
      return proxyRequest(services.financial.url + pathname.replace('/api/finance', ''), req, res);
    }

    if (pathname.startsWith('/api/weather/')) {
      return proxyRequest(services.weather.url + pathname.replace('/api/weather', ''), req, res);
    }

    // 404 for unmatched routes
    sendJSON(res, { error: 'Endpoint not found', path: pathname }, 404);

  } catch (error) {
    console.error('Request handler error:', error);
    sendJSON(res, { error: 'Internal server error', details: error.message }, 500);
  }
}

// Create server
const server = http.createServer(handleRequest);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 DaorsAgro Basic API Gateway running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔗 Service discovery at http://localhost:${PORT}/api/services`);
  console.log(`🌐 API endpoints:`);
  console.log(`   - GET  /`);
  console.log(`   - GET  /health`);
  console.log(`   - GET  /api/services`);
  console.log(`   - *    /api/auth/*`);
  console.log(`   - *    /api/documents/*`);
  console.log(`   - *    /api/finance/*`);
  console.log(`   - *    /api/weather/*`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});