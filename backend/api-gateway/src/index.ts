import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

import { ServiceConfigFactory, EnvironmentUtils } from '@daorsagro/config';
import { TokenUtils, ErrorUtils } from '@daorsagro/utils';
import { ApiError, TokenPayload } from '@daorsagro/types';

import { Logger } from './utils/logger';
import { AuthMiddleware } from './middleware/auth.middleware';
import { ValidationMiddleware } from './middleware/validation.middleware';
import { ErrorHandlerMiddleware } from './middleware/error-handler.middleware';
import { HealthCheckService } from './services/health-check.service';
import { MetricsService } from './services/metrics.service';
import { ServiceDiscoveryService } from './services/service-discovery.service';
import { setupSwagger } from './utils/swagger';

/**
 * API Gateway Application
 */
class ApiGateway {
  private app: express.Application;
  private logger: Logger;
  private config: any;
  private healthCheckService: HealthCheckService;
  private metricsService: MetricsService;
  private serviceDiscovery: ServiceDiscoveryService;

  constructor() {
    this.app = express();
    this.logger = new Logger('api-gateway');
    this.config = ServiceConfigFactory.create('api-gateway', 3000);
    this.healthCheckService = new HealthCheckService();
    this.metricsService = new MetricsService();
    this.serviceDiscovery = new ServiceDiscoveryService();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupProxies();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: EnvironmentUtils.getArray('CORS_ORIGIN', ['http://localhost:3000']) as string[],
      credentials: EnvironmentUtils.getBoolean('CORS_CREDENTIALS', true),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Version'],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
    }));

    // Compression
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message) => this.logger.info(message.trim()) }
    }));

    // Rate limiting
    this.setupRateLimiting();

    // Request metrics
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.metricsService.recordRequest(req.method, req.path, res.statusCode, duration);
      });
      next();
    });

    // Request ID
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        require('crypto').randomUUID();
      res.setHeader('X-Request-ID', req.headers['x-request-id']);
      next();
    });
  }

  /**
   * Setup rate limiting
   */
  private setupRateLimiting(): void {
    // General rate limiting
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // requests per window
      message: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Auth rate limiting (stricter)
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // login attempts per window
      message: {
        error: {
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts, please try again later'
        }
      },
      skip: (req) => {
        // Only apply to login/register endpoints
        return !req.path.includes('/auth/login') && !req.path.includes('/auth/register');
      }
    });

    // Speed limiting for heavy operations
    const speedLimiter = slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 100, // allow first 100 requests per window at full speed
      delayMs: 500 // add 500ms delay per request after delayAfter
    });

    this.app.use('/api', generalLimiter);
    this.app.use('/api/v1/auth', authLimiter);
    this.app.use('/api/v1/analytics', speedLimiter);
  }

  /**
   * Setup main routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.healthCheckService.getHealth();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      const metrics = this.metricsService.getMetrics();
      res.json(metrics);
    });

    // API documentation
    setupSwagger(this.app);

    // API version endpoint
    this.app.get('/api/version', (req, res) => {
      res.json({
        service: 'api-gateway',
        version: this.config.version,
        environment: this.config.environment,
        timestamp: new Date().toISOString()
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'DaorsAgro API Gateway',
        version: this.config.version,
        environment: this.config.environment,
        documentation: '/api-docs',
        health: '/health',
        metrics: '/metrics'
      });
    });
  }

  /**
   * Setup service proxies
   */
  private setupProxies(): void {
    const services = {
      auth: {
        target: EnvironmentUtils.get('AUTH_SERVICE_URL', 'http://localhost:3001'),
        pathRewrite: { 
          '^/api/v1/auth': '/api/v1/auth', 
          '^/api/v1/users': '/api/v1/users',
          '^/api/v1/farms': '/api/v1/farms',
          '^/api/v1/crops': '/api/v1/crops'
        },
        paths: ['/api/v1/auth', '/api/v1/users', '/api/v1/farms', '/api/v1/crops'],
        publicPaths: ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password']
      },
      financial: {
        target: EnvironmentUtils.get('FINANCIAL_SERVICE_URL', 'http://localhost:3002'),
        pathRewrite: { '^/api/v1/financial': '/api/v1/financial' },
        paths: ['/api/v1/financial'],
        publicPaths: []
      },
      subsidies: {
        target: EnvironmentUtils.get('SUBSIDY_SERVICE_URL', 'http://localhost:3003'),
        pathRewrite: { '^/api/v1/subsidies': '/api/v1/subsidies' },
        paths: ['/api/v1/subsidies'],
        publicPaths: ['/api/v1/subsidies/programs'] // Public program listing
      },
      insurance: {
        target: EnvironmentUtils.get('INSURANCE_SERVICE_URL', 'http://localhost:3004'),
        pathRewrite: { '^/api/v1/insurance': '/api/v1/insurance' },
        paths: ['/api/v1/insurance'],
        publicPaths: ['/api/v1/insurance/products'] // Public insurance products
      },
      analytics: {
        target: EnvironmentUtils.get('ANALYTICS_SERVICE_URL', 'http://localhost:3005'),
        pathRewrite: { '^/api/v1/analytics': '/api/v1/analytics' },
        paths: ['/api/v1/analytics'],
        publicPaths: []
      },
      documents: {
        target: EnvironmentUtils.get('DOCUMENT_SERVICE_URL', 'http://localhost:3006'),
        pathRewrite: { '^/api/v1/documents': '/api/v1/documents' },
        paths: ['/api/v1/documents'],
        publicPaths: []
      },
      notifications: {
        target: EnvironmentUtils.get('NOTIFICATION_SERVICE_URL', 'http://localhost:3007'),
        pathRewrite: { '^/api/v1/notifications': '/api/v1/notifications' },
        paths: ['/api/v1/notifications'],
        publicPaths: []
      },
      iot: {
        target: EnvironmentUtils.get('IOT_SERVICE_URL', 'http://localhost:3008'),
        pathRewrite: { '^/api/v1/iot': '/api/v1/iot' },
        paths: ['/api/v1/iot'],
        publicPaths: []
      }
    };

    Object.entries(services).forEach(([serviceName, config]) => {
      const proxy = createProxyMiddleware({
        target: config.target,
        changeOrigin: true,
        pathRewrite: config.pathRewrite,
        timeout: 30000,
        proxyTimeout: 30000,
        onError: (err, req, res) => {
          // Record service failure
          this.serviceDiscovery.recordServiceCall(serviceName, false);
          
          this.logger.error(`Proxy error for ${serviceName}:`, err, {
            requestId: req.headers['x-request-id'],
            url: req.url,
            method: req.method
          });
          
          if (!res.headersSent) {
            res.status(503).json({
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: `${serviceName} service is currently unavailable`,
                service: serviceName,
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
              }
            });
          }
        },
        onProxyReq: (proxyReq, req) => {
          // Add request headers
          proxyReq.setHeader('X-Forwarded-For', req.ip);
          proxyReq.setHeader('X-Gateway-Version', this.config.version);
          proxyReq.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
          
          // Forward authentication token
          if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
          }

          // Forward user context if available
          if ((req as any).user) {
            proxyReq.setHeader('X-User-ID', (req as any).user.userId);
            proxyReq.setHeader('X-User-Role', (req as any).user.role);
          }

          this.logger.debug(`Proxying request to ${serviceName}:`, {
            requestId: req.headers['x-request-id'],
            method: req.method,
            originalUrl: req.originalUrl,
            target: config.target
          });
        },
        onProxyRes: (proxyRes, req, res) => {
          // Record service response
          const duration = Date.now() - ((req as any).startTime || Date.now());
          this.serviceDiscovery.recordServiceCall(serviceName, proxyRes.statusCode < 400, duration);
          
          // Add service identification headers
          proxyRes.headers['X-Service-Name'] = serviceName;
          proxyRes.headers['X-Gateway-Version'] = this.config.version;
          
          // Record service response metrics
          this.metricsService.recordServiceResponse(serviceName, proxyRes.statusCode || 0, duration);

          this.logger.debug(`Received response from ${serviceName}:`, {
            requestId: req.headers['x-request-id'],
            statusCode: proxyRes.statusCode,
            duration: `${duration}ms`
          });
        }
      });

      // Apply routing with proper authentication
      config.paths.forEach(path => {
        const isPublicPath = config.publicPaths.some(publicPath => 
          path.startsWith(publicPath.split('*')[0])
        );

        if (isPublicPath) {
          // Public endpoints - no authentication required
          this.app.use(path, proxy);
        } else {
          // Protected endpoints - require authentication
          this.app.use(path, AuthMiddleware.authenticate, proxy);
        }
      });

      // Setup specific public routes that don't require auth
      config.publicPaths.forEach(publicPath => {
        this.app.use(publicPath, proxy);
      });
    });

    // Add API service discovery endpoint
    this.app.get('/api/services', (req, res) => {
      const servicesStatus = this.serviceDiscovery.getServicesStatus();
      const healthStats = this.serviceDiscovery.getHealthyServicesCount();
      
      res.json({
        services: servicesStatus,
        summary: {
          total: healthStats.total,
          healthy: healthStats.healthy,
          unhealthy: healthStats.total - healthStats.healthy
        },
        timestamp: new Date().toISOString(),
        gateway: {
          version: this.config.version,
          environment: this.config.environment
        }
      });
    });

    // Service-specific status endpoint
    this.app.get('/api/services/:serviceName', (req, res) => {
      const { serviceName } = req.params;
      const serviceStats = this.serviceDiscovery.getServiceStats(serviceName);
      
      if (!serviceStats) {
        return res.status(404).json({
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: `Service '${serviceName}' not found`,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.json({
        service: serviceStats,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    });

    // Global error handler
    this.app.use(ErrorHandlerMiddleware.handle);
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Validate required environment variables
      EnvironmentUtils.validateRequired([
        'JWT_SECRET',
        'REDIS_URL'
      ]);

      // Start health check service
      await this.healthCheckService.start();
      
      // Start service discovery
      this.serviceDiscovery.start();

      // Start the server
      const port = this.config.port;
      this.app.listen(port, () => {
        this.logger.info(`API Gateway started on port ${port}`);
        this.logger.info(`Environment: ${this.config.environment}`);
        this.logger.info(`Health check: http://localhost:${port}/health`);
        this.logger.info(`API Documentation: http://localhost:${port}/api-docs`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      this.logger.error('Failed to start API Gateway:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        await this.healthCheckService.stop();
        this.serviceDiscovery.stop();
        this.logger.info('API Gateway shut down completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }
}

// Start the application
if (require.main === module) {
  const gateway = new ApiGateway();
  gateway.start();
}

export default ApiGateway;