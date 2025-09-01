const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Compression
app.use(compression());

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DaorsAgro API Gateway',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    service: 'api-gateway',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'DaorsAgro API Gateway',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    health: '/health',
    version: '/api/version'
  });
});

// Sample API endpoints for demonstration
app.get('/api/v1/auth', (req, res) => {
  res.json({
    message: 'Auth Service Endpoint',
    endpoints: ['POST /api/v1/auth/login', 'POST /api/v1/auth/register', 'GET /api/v1/auth/profile']
  });
});

app.get('/api/v1/financial', (req, res) => {
  res.json({
    message: 'Financial Service Endpoint',
    endpoints: ['GET /api/v1/transactions', 'POST /api/v1/transactions', 'GET /api/v1/budgets']
  });
});

app.get('/api/v1/subsidies', (req, res) => {
  res.json({
    message: 'Subsidy Service Endpoint',
    endpoints: ['GET /api/v1/subsidies/programs', 'POST /api/v1/subsidies/apply']
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 DaorsAgro API Gateway started on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`✨ Server is running and accessible!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});