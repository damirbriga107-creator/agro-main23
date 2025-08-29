import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { ServiceConfigFactory, EnvironmentUtils } from '@daorsagro/config';
import { 
  Logger, 
  DatabaseManager, 
  ClickHouseConnection, 
  RedisConnection, 
  KafkaConnection,
  HealthCheckService 
} from '@daorsagro/utils';
import { ErrorHandlerMiddleware } from './middleware/error-handler.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';
import { ValidationMiddleware } from './middleware/validation.middleware';
import { setupRoutes } from './routes';
import { MetricsService } from './services/metrics.service';
import { AnalyticsService } from './services/analytics.service';
import { EventConsumerService } from './services/event-consumer.service';

/**
 * Analytics Service Application
 * Handles business intelligence, reporting, and data analytics
 */
class AnalyticsServiceApp {
  private app: express.Application;
  private logger: Logger;
  private config: any;
  private databaseManager: DatabaseManager;
  private healthCheckService: HealthCheckService;
  private metricsService: MetricsService;
  private analyticsService: AnalyticsService;
  private eventConsumerService: EventConsumerService;

  constructor() {
    this.app = express();
    this.logger = new Logger('analytics-service');
    this.config = ServiceConfigFactory.create('analytics-service', 3005);
    this.databaseManager = DatabaseManager.getInstance();
    this.healthCheckService = new HealthCheckService();
    this.metricsService = new MetricsService();
    this.analyticsService = new AnalyticsService();
    this.eventConsumerService = new EventConsumerService();
    
    this.setupMiddleware();
    this.setupRoutes();
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
    }));

    // CORS configuration
    this.app.use(cors({
      origin: EnvironmentUtils.getArray('CORS_ORIGIN', ['http://localhost:5173']),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
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

    // Request ID and metrics
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        require('crypto').randomUUID();
      res.setHeader('X-Request-ID', req.headers['x-request-id']);
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.metricsService.recordRequest(req.method, req.path, res.statusCode, duration);
      });
      
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
      max: 100, // requests per window
      message: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Analytics endpoints need higher limits but slower responses
    const analyticsLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // requests per window
      message: {
        error: {
          code: 'ANALYTICS_RATE_LIMIT_EXCEEDED',
          message: 'Too many analytics requests, please try again later'
        }
      },
    });

    this.app.use('/', generalLimiter);
    this.app.use('/api/v1/analytics', analyticsLimiter);
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.healthCheckService.getOverallHealth();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        this.logger.error('Health check failed:', error);
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

    // Service info endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'analytics-service',
        version: this.config.version,
        environment: this.config.environment,
        timestamp: new Date().toISOString(),
        description: 'Analytics and Business Intelligence Service for DaorsAgro Platform'
      });
    });

    // Setup main routes with authentication
    setupRoutes(this.app, {
      analyticsService: this.analyticsService,
      metricsService: this.metricsService,
      logger: this.logger,
      config: this.config
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
   * Initialize database connections
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.databaseManager.initializeConnections();
      this.logger.info('Database connections initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database connections:', error);
      throw error;
    }
  }

  /**
   * Initialize event consumers
   */
  private async initializeEventConsumers(): Promise<void> {
    try {
      await this.eventConsumerService.start();
      this.logger.info('Event consumers started successfully');
    } catch (error) {
      this.logger.error('Failed to start event consumers:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Initialize database connections
      await this.initializeDatabase();

      // Initialize event consumers
      await this.initializeEventConsumers();

      // Start HTTP server
      const port = this.config.port;
      this.app.listen(port, () => {
        this.logger.info(`Analytics Service running on port ${port}`);
        this.logger.info(`Environment: ${this.config.environment}`);
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      this.logger.error('Failed to start Analytics Service:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`${signal} received, shutting down gracefully`);
      
      try {
        // Stop event consumers
        await this.eventConsumerService.stop();
        
        // Close database connections
        await this.databaseManager.closeAllConnections();
        
        this.logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon
  }
}

// Start the service
const analyticsService = new AnalyticsServiceApp();
analyticsService.start().catch((error) => {
  console.error('Failed to start Analytics Service:', error);
  process.exit(1);
});

export default analyticsService;