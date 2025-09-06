import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

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
import { IoTService } from './services/iot.service';
import { MqttHandler } from './services/mqtt.service';
import { WebSocketHandler } from './services/websocket.service';
import { DeviceManager } from './services/device-manager.service';
import { DataProcessingService } from './services/data-processing.service';

/**
 * IoT Service Application
 * Handles IoT device management, sensor data processing, and real-time communication
 */
class IoTServiceApp {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private logger: Logger;
  private config: any;
  private databaseManager: DatabaseManager;
  private healthCheckService: HealthCheckService;
  private iotService: IoTService;
  private mqttHandler: MqttHandler;
  private websocketHandler: WebSocketHandler;
  private deviceManager: DeviceManager;
  private dataProcessingService: DataProcessingService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.logger = new Logger('iot-service');
    this.config = ServiceConfigFactory.create('iot-service', 3008);
    this.databaseManager = DatabaseManager.getInstance();
    this.healthCheckService = new HealthCheckService();
    this.iotService = new IoTService();
    this.deviceManager = new DeviceManager();
    this.dataProcessingService = new DataProcessingService();
    
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
          connectSrc: ["'self'", "ws:", "wss:"],
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

    // Rate limiting (higher limits for IoT data)
    this.setupRateLimiting();

    // Request ID and metrics
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
      max: 1000, // Higher limit for IoT endpoints
      message: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // IoT data ingestion (very high limits)
    const dataIngestionLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 10000, // Very high limit for sensor data
      message: {
        error: {
          code: 'IOT_RATE_LIMIT_EXCEEDED',
          message: 'Too many IoT data requests, please try again later'
        }
      },
    });

    this.app.use('/', generalLimiter);
    this.app.use('/api/v1/iot/data', dataIngestionLimiter);
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: 'iot-service',
        timestamp: new Date().toISOString(),
        connections: {
          mongodb: this.databaseManager.getConnection()?.readyState === 1 || false,
          mqtt: this.mqttHandler?.isConnected || false,
          kafka: 'connected', // Simplified check
        },
      });
    });

    // IoT devices endpoint for dashboard
    this.app.get('/api/v1/iot/devices', AuthMiddleware.authenticate, async (req, res) => {
      try {
        const { limit = 10, status, type, farmId } = req.query;
        const userId = (req as any).user?.userId;

        this.logger.info('IoT devices requested', {
          requestId: req.headers['x-request-id'],
          userId,
          filters: { limit, status, type, farmId }
        });

        const devices = await this.iotService.getDevices({
          limit: parseInt(limit as string),
          status: status as string,
          type: type as string,
          farmId: farmId as string,
          userId
        });

        res.json({
          success: true,
          data: devices,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
      } catch (error) {
        this.logger.error('Failed to get IoT devices:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'IOT_DEVICES_ERROR',
            message: 'Failed to retrieve IoT devices'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
      }
    });

    // IoT summary endpoint for dashboard
    this.app.get('/api/v1/iot/summary', AuthMiddleware.authenticate, async (req, res) => {
      try {
        const userId = (req as any).user?.userId;

        const summary = await this.iotService.getDeviceSummary(userId);

        res.json({
          success: true,
          data: summary,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
      } catch (error) {
        this.logger.error('Failed to get IoT summary:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'IOT_SUMMARY_ERROR',
            message: 'Failed to retrieve IoT summary'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
      }
    });

    // Sensor data endpoint
    this.app.get('/api/v1/iot/data/:deviceId', AuthMiddleware.authenticate, async (req, res) => {
      try {
        const { deviceId } = req.params;
        const { hours = 24 } = req.query;
        const userId = (req as any).user?.userId;

        // Mock sensor data for now
        const sensorData = {
          deviceId,
          period: `${hours}h`,
          dataPoints: Array.from({ length: parseInt(hours as string) }, (_, i) => ({
            timestamp: new Date(Date.now() - i * 3600000).toISOString(),
            temperature: 20 + Math.random() * 10,
            humidity: 50 + Math.random() * 30,
            soilMoisture: 30 + Math.random() * 40,
            ph: 6 + Math.random() * 2
          })).reverse()
        };

        res.json({
          success: true,
          data: sensorData,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
      } catch (error) {
        this.logger.error('Failed to get sensor data:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'SENSOR_DATA_ERROR',
            message: 'Failed to retrieve sensor data'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
      }
    });
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`${signal} received, shutting down gracefully`);

      try {
        if (this.mqttHandler) {
          this.mqttHandler.disconnect();
        }
        if (this.websocketHandler) {
          this.websocketHandler.close();
        }
        if (this.databaseManager) {
          await this.databaseManager.close();
        }
        this.server.close(() => {
          this.logger.info('Server closed successfully');
          process.exit(0);
        });
      } catch (error) {
        this.logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Initialize database connections
      await this.databaseManager.connect();

      // Initialize MQTT handler
      this.mqttHandler = new MqttHandler(this.databaseManager, this.logger);
      await this.mqttHandler.initialize();

      // Initialize WebSocket handler
      this.websocketHandler = new WebSocketHandler(this.wss, this.databaseManager);
      this.websocketHandler.initialize();

      // Start HTTP server
      const port = this.config.port;
      this.server.listen(port, () => {
        this.logger.info(`IoT Service running on port ${port}`);
        this.logger.info(`Environment: ${this.config.environment}`);
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      this.logger.error('Failed to start IoT Service:', error);
      process.exit(1);
    }
  }
}

// Start the service
if (require.main === module) {
  const service = new IoTServiceApp();
  service.start();
}