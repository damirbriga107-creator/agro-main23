const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'DaorsAgro API Gateway',
    version: '1.0.0'
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      'auth-service': 'healthy',
      'financial-service': 'healthy',
      'subsidy-service': 'healthy',
      'insurance-service': 'healthy',
      'analytics-service': 'healthy',
      'document-service': 'healthy',
      'notification-service': 'healthy'
    },
    timestamp: new Date().toISOString()
  });
});

// Auth service endpoints
app.get('/api/auth/health', (req, res) => {
  res.json({ status: 'healthy', service: 'auth-service' });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    message: 'Login endpoint (development)',
    token: 'dev-token-' + Date.now(),
    user: { id: 1, email: 'dev@daorsagro.com', role: 'farmer' }
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    message: 'Register endpoint (development)',
    user: { id: Date.now(), email: req.body.email, role: 'farmer' }
  });
});

// Financial service endpoints
app.get('/api/financial/health', (req, res) => {
  res.json({ status: 'healthy', service: 'financial-service' });
});

app.get('/api/financial/dashboard', (req, res) => {
  res.json({
    totalRevenue: 125000,
    totalExpenses: 87500,
    netProfit: 37500,
    profitMargin: 30,
    transactions: [
      { id: 1, date: '2025-08-01', description: 'Seed Purchase', amount: -2500, category: 'expenses' },
      { id: 2, date: '2025-08-15', description: 'Crop Sale', amount: 15000, category: 'revenue' },
      { id: 3, date: '2025-08-20', description: 'Equipment Maintenance', amount: -800, category: 'expenses' }
    ]
  });
});

// Document service endpoints
app.get('/api/documents/health', (req, res) => {
  res.json({ status: 'healthy', service: 'document-service' });
});

app.get('/api/documents', (req, res) => {
  res.json({
    documents: [
      { id: 1, name: 'Land Title.pdf', type: 'legal', uploadDate: '2025-08-01', size: '2.5MB' },
      { id: 2, name: 'Insurance Policy.pdf', type: 'insurance', uploadDate: '2025-08-10', size: '1.8MB' },
      { id: 3, name: 'Crop Report Q3.pdf', type: 'report', uploadDate: '2025-08-25', size: '3.2MB' }
    ]
  });
});

// Subsidy service endpoints
app.get('/api/subsidies/health', (req, res) => {
  res.json({ status: 'healthy', service: 'subsidy-service' });
});

app.get('/api/subsidies', (req, res) => {
  res.json({
    availableSubsidies: [
      { id: 1, name: 'Organic Farming Grant', amount: 5000, deadline: '2025-12-31', status: 'available' },
      { id: 2, name: 'Equipment Upgrade Subsidy', amount: 10000, deadline: '2025-11-15', status: 'available' }
    ],
    appliedSubsidies: [
      { id: 3, name: 'Water Conservation Grant', amount: 3000, status: 'pending', appliedDate: '2025-08-15' }
    ]
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'DaorsAgro Development API Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      financial: '/api/financial',
      documents: '/api/documents',
      subsidies: '/api/subsidies'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong!'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 DaorsAgro Development API Gateway running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API documentation: http://localhost:${PORT}/api`);
});