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
  MongoConnection, 
  RedisConnection, 
  KafkaConnection,
  HealthCheckService 
} from '@daorsagro/utils';
import { ErrorHandlerMiddleware } from './middleware/error-handler.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';
import { ValidationMiddleware } from './middleware/validation.middleware';
import { setupRoutes } from './routes';
import { InsuranceService } from './services/insurance.service';

/**
 * Insurance Service Application
 */
class InsuranceServiceApp {
  private app: express.Application;
  private logger: Logger;
  private config: any;
  private databaseManager: DatabaseManager;
  private healthCheckService: HealthCheckService;
  private insuranceService: InsuranceService;

  constructor() {
    this.app = express();
    this.logger = new Logger('insurance-service');
    this.config = ServiceConfigFactory.create('insurance-service', 3004);
    this.databaseManager = DatabaseManager.getInstance();
    this.healthCheckService = new HealthCheckService();
    this.insuranceService = new InsuranceService();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({
      origin: EnvironmentUtils.getArray('CORS_ORIGIN', ['http://localhost:5173']),
      credentials: true,
    }));
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(morgan('combined', {
      stream: { write: (message) => this.logger.info(message.trim()) }
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } }
    });
    this.app.use('/', limiter);

    // Request ID
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || require('crypto').randomUUID();
      res.setHeader('X-Request-ID', req.headers['x-request-id']);
      next();
    });
  }

  private setupRoutes(): void {
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.healthCheckService.getOverallHealth();
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
      }
    });

    this.app.get('/', (req, res) => {
      res.json({
        service: 'insurance-service',
        version: this.config.version,
        environment: this.config.environment,
        timestamp: new Date().toISOString()
      });
    });

    setupRoutes(this.app, {
      insuranceService: this.insuranceService,
      logger: this.logger,
      config: this.config
    });
  }

  private setupErrorHandling(): void {
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`,
          timestamp: new Date().toISOString()
        }
      });
    });
    this.app.use(ErrorHandlerMiddleware.handle);
  }

  public async start(): Promise<void> {
    try {
      await this.databaseManager.initializeConnections();
      
      const port = this.config.port;
      this.app.listen(port, () => {
        this.logger.info(`Insurance Service running on port ${port}`);
      });

      this.setupGracefulShutdown();
    } catch (error) {
      this.logger.error('Failed to start Insurance Service:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`${signal} received, shutting down gracefully`);
      try {
        await this.databaseManager.closeAllConnections();
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

const insuranceService = new InsuranceServiceApp();
insuranceService.start().catch((error) => {
  console.error('Failed to start Insurance Service:', error);
  process.exit(1);
});

export default insuranceService;