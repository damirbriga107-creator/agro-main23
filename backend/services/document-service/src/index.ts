import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from '@daorsagro/config';
import { logger, errorHandler } from '@daorsagro/utils';
import routes from './routes';
import { authMiddleware } from './middleware/auth.middleware';
import { validationMiddleware } from './middleware/validation.middleware';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware';
import { DocumentService } from './services/document.service';
import { KafkaService } from './services/kafka.service';
import { HealthCheckService } from './services/health-check.service';

class DocumentServiceApp {
  private app: express.Application;
  private port: number;
  private documentService: DocumentService;
  private kafkaService: KafkaService;
  private healthCheckService: HealthCheckService;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.DOCUMENT_SERVICE_PORT || '3006');
    this.documentService = new DocumentService();
    this.kafkaService = new KafkaService();
    this.healthCheckService = new HealthCheckService();
    
    this.configureMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private configureMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.headers['x-request-id']
      });
      next();
    });

    // Authentication middleware (except for health checks)
    this.app.use('/api/v1/documents', authMiddleware);
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.healthCheckService.getHealthStatus();
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
      } catch (error) {
        logger.error('Health check failed', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        });
      }
    });

    // API routes
    this.app.use('/api/v1', routes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandlerMiddleware);
  }

  public async start(): Promise<void> {
    try {
      // Initialize services
      await this.documentService.initialize();
      await this.kafkaService.connect();

      // Start server
      this.app.listen(this.port, () => {
        logger.info(`Document Service started on port ${this.port}`, {
          service: 'document-service',
          port: this.port,
          environment: process.env.NODE_ENV || 'development'
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down gracefully');
        await this.kafkaService.disconnect();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down gracefully');
        await this.kafkaService.disconnect();
        process.exit(0);
      });

    } catch (error) {
      logger.error('Failed to start Document Service', error);
      process.exit(1);
    }
  }
}

// Start the application
const app = new DocumentServiceApp();
app.start().catch((error) => {
  logger.error('Application startup failed', error);
  process.exit(1);
});

export default DocumentServiceApp;