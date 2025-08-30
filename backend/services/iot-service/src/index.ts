import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import mqtt from 'mqtt';
import { Kafka } from 'kafkajs';
import { MongoClient } from 'mongodb';

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
import deviceRoutes from './routes/device.routes';
import sensorRoutes from './routes/sensor.routes';
import dataRoutes from './routes/data.routes';
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
          mongodb: this.databaseManager.isConnected('mongodb'),
          kafka: this.databaseManager.isConnected('kafka'),
          redis: this.databaseManager.isConnected('redis')
        },
      });
    });

    // Routes with authentication
    this.app.use('/api/v1/iot', AuthMiddleware.authenticate);
    this.app.use('/api/v1/iot/devices', deviceRoutes);
    this.app.use('/api/v1/iot/sensors', sensorRoutes);
    this.app.use('/api/v1/iot/data', dataRoutes);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.app.use(ErrorHandlerMiddleware.handle);
  }

  /**
   * Initialize database connections
   */
  private async initializeDatabases(): Promise<void> {
    try {
      // Initialize MongoDB connection
      const mongoConnection = new MongoConnection({
        host: EnvironmentUtils.get('MONGODB_HOST', 'localhost'),
        port: EnvironmentUtils.getNumber('MONGODB_PORT', 27017),
        database: EnvironmentUtils.get('MONGODB_DATABASE', 'daorsagro'),
        username: EnvironmentUtils.get('MONGODB_USERNAME', 'mongo'),
        password: EnvironmentUtils.get('MONGODB_PASSWORD', 'mongo123')
      });
      
      await this.databaseManager.addConnection('mongodb', mongoConnection);
      this.logger.info('MongoDB connection initialized');

      // Initialize Redis connection
      const redisConnection = new RedisConnection({
        host: EnvironmentUtils.get('REDIS_HOST', 'localhost'),
        port: EnvironmentUtils.getNumber('REDIS_PORT', 6379),
        password: EnvironmentUtils.get('REDIS_PASSWORD')
      });
      
      await this.databaseManager.addConnection('redis', redisConnection);
      this.logger.info('Redis connection initialized');

      // Initialize Kafka connection
      const kafkaConnection = new KafkaConnection({
        brokers: EnvironmentUtils.getArray('KAFKA_BROKERS', ['localhost:9092']),
        clientId: 'iot-service'
      });
      
      await this.databaseManager.addConnection('kafka', kafkaConnection);
      this.logger.info('Kafka connection initialized');

    } catch (error) {
      this.logger.error('Failed to initialize databases:', error);
      throw error;
    }
  }

  /**
   * Initialize IoT-specific services
   */
  private async initializeIoTServices(): Promise<void> {
    try {
      // Initialize MQTT handler
      this.mqttHandler = new MqttHandler(
        this.databaseManager.getConnection('mongodb'),
        this.databaseManager.getConnection('kafka')
      );
      await this.mqttHandler.initialize();
      this.logger.info('MQTT handler initialized');

      // Initialize WebSocket handler
      this.websocketHandler = new WebSocketHandler(
        this.wss,
        this.databaseManager.getConnection('mongodb')
      );
      this.websocketHandler.initialize();
      this.logger.info('WebSocket handler initialized');

    } catch (error) {
      this.logger.error('Failed to initialize IoT services:', error);
      throw error;
    }
  }

  /**
   * Start the IoT service
   */
  public async start(): Promise<void> {
    try {
      // Initialize databases
      await this.initializeDatabases();
      
      // Initialize IoT services
      await this.initializeIoTServices();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      // Start server
      this.server.listen(this.config.port, () => {
        this.logger.info(`IoT Service running on port ${this.config.port}`);
        this.logger.info('All IoT connections established');
      });
      
    } catch (error) {
      this.logger.error('Failed to start IoT service:', error);
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
        if (this.mqttHandler) {
          await this.mqttHandler.disconnect();
        }
        
        if (this.websocketHandler) {
          this.websocketHandler.close();
        }
        
        await this.databaseManager.closeAll();
        
        this.server.close(() => {
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
}

// Start the IoT service
const iotService = new IoTServiceApp();
iotService.start();

export default iotService;