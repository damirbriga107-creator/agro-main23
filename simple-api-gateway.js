const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Service discovery endpoints - stubbed for now
app.get('/api/services', (req, res) => {
  res.json({
    services: [
      { name: 'auth-service', url: 'http://localhost:3001', status: 'healthy' },
      { name: 'document-service', url: 'http://localhost:3002', status: 'healthy' },
      { name: 'financial-service', url: 'http://localhost:3003', status: 'healthy' },
      { name: 'weather-service', url: 'http://localhost:3004', status: 'healthy' }
    ]
  });
});

// Proxy middleware for auth service
app.use('/api/auth', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/'
  },
  onError: (err, req, res) => {
    console.error('Auth service proxy error:', err);
    res.status(503).json({ error: 'Auth service unavailable' });
  }
}));

// Proxy middleware for document service
app.use('/api/documents', createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/api/documents': '/'
  },
  onError: (err, req, res) => {
    console.error('Document service proxy error:', err);
    res.status(503).json({ error: 'Document service unavailable' });
  }
}));

// Proxy middleware for financial service
app.use('/api/finance', createProxyMiddleware({
  target: 'http://localhost:3003',
  changeOrigin: true,
  pathRewrite: {
    '^/api/finance': '/'
  },
  onError: (err, req, res) => {
    console.error('Financial service proxy error:', err);
    res.status(503).json({ error: 'Financial service unavailable' });
  }
}));

// Proxy middleware for weather service
app.use('/api/weather', createProxyMiddleware({
  target: 'http://localhost:3004',
  changeOrigin: true,
  pathRewrite: {
    '^/api/weather': '/'
  },
  onError: (err, req, res) => {
    console.error('Weather service proxy error:', err);
    res.status(503).json({ error: 'Weather service unavailable' });
  }
}));

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'DaorsAgro API Gateway',
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
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Gateway error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 DaorsAgro API Gateway running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔗 Service discovery at http://localhost:${PORT}/api/services`);
});