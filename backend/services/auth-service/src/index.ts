import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { ServiceConfigFactory, EnvironmentUtils } from './utils';
import { Logger } from './utils/logger';
import { PrismaService } from './services/prisma.service';
import { RedisService } from './services/redis.service';
import { EmailService } from './services/email.service';
import { ErrorHandlerMiddleware } from './middleware/error-handler.middleware';
import { ValidationMiddleware } from './middleware/validation.middleware';
import { setupRoutes } from './routes';

/**
 * Authentication Service Application
 */
class AuthService {
  private app: express.Application;
  private logger: Logger;
  private config: any;
  private prisma: PrismaService;
  private redis: RedisService;
  private emailService: EmailService;

  constructor() {
    this.app = express();
    this.logger = new Logger('auth-service');
    this.config = ServiceConfigFactory.create('auth-service', 3001);
    this.prisma = new PrismaService();
    this.redis = new RedisService();
    this.emailService = new EmailService();
    
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
    });

    this.app.use('/', generalLimiter);
    this.app.use('/auth/login', authLimiter);
    this.app.use('/auth/register', authLimiter);
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        // Check database connection
        await this.prisma.client.$queryRaw`SELECT 1`;
        
        // Check Redis connection
        await this.redis.ping();

        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: this.config.version,
          checks: {
            database: 'healthy',
            redis: 'healthy'
          }
        });
      } catch (error) {
        this.logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // Service info endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'auth-service',
        version: this.config.version,
        environment: this.config.environment,
        timestamp: new Date().toISOString()
      });
    });

    // Setup main routes
    setupRoutes(this.app, {
      prisma: this.prisma,
      redis: this.redis,
      emailService: this.emailService,
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
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Validate required environment variables
      EnvironmentUtils.validateRequired([
        'DATABASE_URL',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'REDIS_URL'
      ]);

      // Initialize services
      await this.prisma.connect();
      await this.redis.connect();
      await this.emailService.initialize();

      // Start the server
      const port = this.config.port;
      this.app.listen(port, () => {
        this.logger.info(`Auth Service started on port ${port}`);
        this.logger.info(`Environment: ${this.config.environment}`);
        this.logger.info(`Health check: http://localhost:${port}/health`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      this.logger.error('Failed to start Auth Service:', error);
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
        await this.prisma.disconnect();
        await this.redis.disconnect();
        this.logger.info('Auth Service shut down completed');
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
      this.logger.error('Unhandled rejection', { promise: promise.toString(), reason });
      process.exit(1);
    });
  }
}

// Start the application
if (require.main === module) {
  const authService = new AuthService();
  authService.start();
}

export default AuthService;