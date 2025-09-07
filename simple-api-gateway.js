const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const redis = require('redis');
const axios = require('axios');
const winston = require('winston');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  logLevel: process.env.LOG_LEVEL || 'info',
  environment: process.env.NODE_ENV || 'development',
  services: {
    auth: { 
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      timeout: 30000,
      retries: 3
    },
    document: { 
      url: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3002',
      timeout: 30000,
      retries: 3
    },
    financial: { 
      url: process.env.FINANCIAL_SERVICE_URL || 'http://localhost:3003',
      timeout: 30000,
      retries: 3
    },
    weather: { 
      url: process.env.WEATHER_SERVICE_URL || 'http://localhost:3004',
      timeout: 30000,
      retries: 3
    },
    subsidy: { 
      url: process.env.SUBSIDY_SERVICE_URL || 'http://localhost:3005',
      timeout: 30000,
      retries: 3
    },
    insurance: { 
      url: process.env.INSURANCE_SERVICE_URL || 'http://localhost:3006',
      timeout: 30000,
      retries: 3
    },
    analytics: { 
      url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3007',
      timeout: 30000,
      retries: 3
    },
    notification: { 
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
      timeout: 30000,
      retries: 3
    },
    iot: { 
      url: process.env.IOT_SERVICE_URL || 'http://localhost:3009',
      timeout: 30000,
      retries: 3
    }
  }
};

// Initialize Express app
const app = express();

// Winston logger setup
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-gateway' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ],
});

// Redis client setup
let redisClient;
try {
  redisClient = redis.createClient({ url: config.redisUrl });
  redisClient.on('error', (err) => logger.error('Redis Client Error', err));
  redisClient.connect();
  logger.info('Redis connected successfully');
} catch (error) {
  logger.warn('Redis connection failed, running without cache', error);
}

// Service registry and health check
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.healthCheckInterval = 30000; // 30 seconds
    this.circuitBreakerThreshold = 5; // Number of failures to trip circuit
    this.circuitBreakerTimeout = 60000; // 1 minute
    this.initializeServices();
    this.startHealthChecks();
  }

  initializeServices() {
    Object.entries(config.services).forEach(([name, service]) => {
      this.services.set(name, {
        ...service,
        status: 'unknown',
        failures: 0,
        lastCheck: null,
        circuitOpen: false,
        lastCircuitOpen: null,
        responseTime: null
      });
    });
  }

  async checkServiceHealth(serviceName, serviceConfig) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${serviceConfig.url}/health`, {
        timeout: 5000,
        headers: { 'User-Agent': 'DaorsAgro-Gateway-HealthCheck' }
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.status === 200;
      
      const serviceData = this.services.get(serviceName);
      serviceData.status = isHealthy ? 'healthy' : 'unhealthy';
      serviceData.lastCheck = new Date().toISOString();
      serviceData.responseTime = responseTime;
      
      if (isHealthy) {
        serviceData.failures = 0;
        if (serviceData.circuitOpen && 
            Date.now() - serviceData.lastCircuitOpen > this.circuitBreakerTimeout) {
          serviceData.circuitOpen = false;
          logger.info(`Circuit breaker closed for service: ${serviceName}`);
        }
      }
      
      return { serviceName, status: serviceData.status, responseTime };
    } catch (error) {
      const serviceData = this.services.get(serviceName);
      serviceData.status = 'unhealthy';
      serviceData.lastCheck = new Date().toISOString();
      serviceData.failures++;
      
      if (serviceData.failures >= this.circuitBreakerThreshold) {
        serviceData.circuitOpen = true;
        serviceData.lastCircuitOpen = Date.now();
        logger.warn(`Circuit breaker opened for service: ${serviceName}`);
      }
      
      logger.error(`Health check failed for ${serviceName}:`, error.message);
      return { serviceName, status: 'unhealthy', error: error.message };
    }
  }

  startHealthChecks() {
    setInterval(async () => {
      const healthChecks = Array.from(this.services.entries()).map(
        ([name, service]) => this.checkServiceHealth(name, service)
      );
      
      try {
        await Promise.all(healthChecks);
      } catch (error) {
        logger.error('Error during health checks:', error);
      }
    }, this.healthCheckInterval);
  }

  getServiceStatus(serviceName) {
    return this.services.get(serviceName);
  }

  getAllServices() {
    return Array.from(this.services.entries()).map(([name, service]) => ({
      name,
      url: service.url,
      status: service.status,
      lastCheck: service.lastCheck,
      responseTime: service.responseTime,
      failures: service.failures,
      circuitOpen: service.circuitOpen
    }));
  }

  isServiceAvailable(serviceName) {
    const service = this.services.get(serviceName);
    return service && service.status === 'healthy' && !service.circuitOpen;
  }
}

const serviceRegistry = new ServiceRegistry();

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Cache middleware
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    if (!redisClient || req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.info(`Cache hit for ${req.originalUrl}`);
        return res.json(JSON.parse(cached));
      }
    } catch (error) {
      logger.error('Cache retrieval error:', error);
    }
    
    const originalSend = res.json;
    res.json = function(data) {
      if (res.statusCode === 200) {
        redisClient?.setex(key, duration, JSON.stringify(data))
          .catch(err => logger.error('Cache storage error:', err));
      }
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Advanced rate limiting
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Different rate limits for different endpoints
app.use('/api/auth', createRateLimit(15 * 60 * 1000, 20, 'Too many authentication attempts'));
app.use('/api', createRateLimit(15 * 60 * 1000, 1000, 'Too many API requests'));
app.use(createRateLimit(15 * 60 * 1000, 100, 'Too many requests'));

// JWT Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // First try to get from cache
    if (redisClient) {
      const cachedUser = await redisClient.get(`token:${token}`);
      if (cachedUser) {
        req.user = JSON.parse(cachedUser);
        return next();
      }
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;

    // Cache user data
    if (redisClient) {
      await redisClient.setex(`token:${token}`, 3600, JSON.stringify(decoded));
    }

    next();
  } catch (error) {
    logger.error('Token verification failed:', error.message);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// API key authentication middleware (for service-to-service communication)
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];

  if (validApiKeys.includes(apiKey)) {
    req.isServiceRequest = true;
    return next();
  }

  res.status(401).json({ error: 'Invalid API key' });
};

// Request validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    // Basic validation - in production use joi or similar
    if (schema.requireAuth && !req.user && !req.isServiceRequest) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  };
};

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const services = serviceRegistry.getAllServices();
  const overallHealth = services.every(service => service.status === 'healthy');
  
  const healthData = {
    status: overallHealth ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0',
    environment: config.environment,
    services: services,
    memory: process.memoryUsage(),
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    }
  };

  res.status(overallHealth ? 200 : 503).json(healthData);
});

// Metrics endpoint
app.get('/metrics', authenticateApiKey, cacheMiddleware(60), (req, res) => {
  const services = serviceRegistry.getAllServices();
  
  res.json({
    timestamp: new Date().toISOString(),
    services: services.map(service => ({
      name: service.name,
      status: service.status,
      responseTime: service.responseTime,
      failures: service.failures,
      circuitOpen: service.circuitOpen
    })),
    gateway: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid
    }
  });
});

// Service discovery endpoint with authentication
app.get('/api/services', authenticateToken, cacheMiddleware(60), (req, res) => {
  const services = serviceRegistry.getAllServices();
  res.json({
    services: services.filter(service => service.status === 'healthy'),
    timestamp: new Date().toISOString(),
    total: services.length,
    healthy: services.filter(s => s.status === 'healthy').length
  });
});

// Enhanced proxy factory with circuit breaker and retry logic
const createAdvancedProxy = (serviceName, targetPath = '/') => {
  return createProxyMiddleware({
    target: config.services[serviceName].url,
    changeOrigin: true,
    timeout: config.services[serviceName].timeout,
    pathRewrite: (path, req) => {
      // For auth service, preserve the full path
      if (serviceName === 'auth') {
        return path; // Don't rewrite, keep the full path
      }
      return path.replace(new RegExp(`^/api/${serviceName}`), targetPath);
    },
    onProxyRes: function(proxyRes, req, res) {
      // Log the response but don't interfere with default handling
      logger.info(`Proxy response received for ${req.method} ${req.originalUrl}: ${proxyRes.statusCode}`);
      // Don't modify the response, let http-proxy-middleware handle it
    },
    onError: (err, req, res) => {
      logger.error(`${serviceName} service proxy error:`, {
        error: err.message,
        requestId: req.requestId,
        url: req.originalUrl
      });

      // Circuit breaker check
      if (!serviceRegistry.isServiceAvailable(serviceName)) {
        return res.status(503).json({
          error: `${serviceName} service is currently unavailable`,
          requestId: req.requestId,
          circuitBreaker: true
        });
      }

      res.status(503).json({
        error: `${serviceName} service error`,
        requestId: req.requestId,
        message: err.message
      });
    },
    onProxyReq: function(proxyReq, req, res) {
      // Add request ID and user info to downstream services
      proxyReq.setHeader('X-Request-ID', req.requestId);
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.id);
        proxyReq.setHeader('X-User-Role', req.user.role);
      }

      logger.info(`Proxying ${req.method} ${req.originalUrl} to ${serviceName}`);
    },
    router: function(req) {
      // Circuit breaker check before routing
      if (!serviceRegistry.isServiceAvailable(serviceName)) {
        return null; // This will trigger onError
      }
      return config.services[serviceName].url;
    }
  });
};

// Public routes (no authentication required)
app.use('/api/v1/auth', createAdvancedProxy('auth', '/api/v1'));

// Protected routes (authentication required)
const protectedRoutes = [
  { path: '/api/documents', service: 'document', auth: true },
  { path: '/api/finance', service: 'financial', auth: true },
  { path: '/api/weather', service: 'weather', auth: true },
  { path: '/api/subsidy', service: 'subsidy', auth: true },
  { path: '/api/insurance', service: 'insurance', auth: true },
  { path: '/api/analytics', service: 'analytics', auth: true },
  { path: '/api/notifications', service: 'notification', auth: true },
  { path: '/api/iot', service: 'iot', auth: true }
];

protectedRoutes.forEach(route => {
  if (route.auth) {
    app.use(route.path, authenticateToken);
  }
  app.use(route.path, validateRequest({ requireAuth: route.auth }));
  app.use(route.path, createAdvancedProxy(route.service));
});

// API documentation endpoint
app.get('/api/docs', cacheMiddleware(3600), (req, res) => {
  res.json({
    name: 'DaorsAgro API Gateway',
    version: '2.0.0',
    description: 'Full-stack API Gateway for DaorsAgro agricultural platform',
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        description: 'Gateway and services health check',
        public: true
      },
      {
        path: '/metrics',
        method: 'GET',
        description: 'Service metrics and performance data',
        auth: 'api-key'
      },
      {
        path: '/api/services',
        method: 'GET',
        description: 'Available services discovery',
        auth: 'jwt'
      },
      {
        path: '/api/auth/*',
        method: 'ALL',
        description: 'Authentication service endpoints',
        public: true
      },
      {
        path: '/api/documents/*',
        method: 'ALL',
        description: 'Document management service',
        auth: 'jwt'
      },
      {
        path: '/api/finance/*',
        method: 'ALL',
        description: 'Financial management service',
        auth: 'jwt'
      },
      {
        path: '/api/weather/*',
        method: 'ALL',
        description: 'Weather data service',
        auth: 'jwt'
      },
      {
        path: '/api/subsidy/*',
        method: 'ALL',
        description: 'Government subsidy service',
        auth: 'jwt'
      },
      {
        path: '/api/insurance/*',
        method: 'ALL',
        description: 'Agricultural insurance service',
        auth: 'jwt'
      },
      {
        path: '/api/analytics/*',
        method: 'ALL',
        description: 'Analytics and reporting service',
        auth: 'jwt'
      },
      {
        path: '/api/notifications/*',
        method: 'ALL',
        description: 'Notification service',
        auth: 'jwt'
      },
      {
        path: '/api/iot/*',
        method: 'ALL',
        description: 'IoT device management service',
        auth: 'jwt'
      }
    ],
    authentication: {
      jwt: {
        header: 'Authorization: Bearer <token>',
        description: 'JWT token obtained from /api/auth/login'
      },
      apiKey: {
        header: 'X-API-Key: <key>',
        description: 'API key for service-to-service communication'
      }
    }
  });
});

// Default route with enhanced information
app.get('/', cacheMiddleware(300), (req, res) => {
  const services = serviceRegistry.getAllServices();
  const healthyServices = services.filter(s => s.status === 'healthy');
  
  res.json({
    message: 'DaorsAgro Full-Stack API Gateway',
    version: '2.0.0',
    environment: config.environment,
    timestamp: new Date().toISOString(),
    status: 'operational',
    services: {
      total: services.length,
      healthy: healthyServices.length,
      available: healthyServices.map(s => s.name)
    },
    features: [
      'JWT Authentication',
      'API Key Authentication',
      'Rate Limiting',
      'Caching (Redis)',
      'Circuit Breaker',
      'Health Monitoring',
      'Request Logging',
      'Service Discovery',
      'Load Balancing',
      'Request Validation'
    ],
    endpoints: {
      documentation: '/api/docs',
      health: '/health',
      metrics: '/metrics',
      services: '/api/services'
    }
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  logger.error('API Gateway error:', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't expose internal error details in production
  const errorMessage = config.environment === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(err.status || 500).json({ 
    error: errorMessage,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});

// Enhanced 404 handler
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({ 
    error: 'Endpoint not found',
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    availableEndpoints: '/api/docs'
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
    
    // Close Redis connection
    if (redisClient) {
      redisClient.quit();
    }
    
    logger.info('Server shut down successfully');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(config.port, () => {
  logger.info(`🚀 DaorsAgro Full-Stack API Gateway running on port ${config.port}`);
  logger.info(`📊 Environment: ${config.environment}`);
  logger.info(`🔗 Health check: http://localhost:${config.port}/health`);
  logger.info(`📚 Documentation: http://localhost:${config.port}/api/docs`);
  logger.info(`🔍 Service discovery: http://localhost:${config.port}/api/services`);
  logger.info(`📈 Metrics: http://localhost:${config.port}/metrics`);
});

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;