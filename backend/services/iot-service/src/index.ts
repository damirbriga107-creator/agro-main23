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

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'iot-service',
    timestamp: new Date().toISOString(),
    connections: {
      mongodb: mongoClient.topology?.isConnected() || false,
      mqtt: mqttClient.connected,
      kafka: 'connected', // Simplified check
    },
  });
});

// Routes
app.use('/api/v1/iot', authMiddleware);
app.use('/api/v1/iot/devices', deviceRoutes);
app.use('/api/v1/iot/sensors', sensorRoutes);
app.use('/api/v1/iot/data', dataRoutes);

app.use(errorHandler);

// Initialize services
let mqttHandler: MqttHandler;
let websocketHandler: WebSocketHandler;

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  try {
    mqttClient.end();
    wss.close();
    await producer.disconnect();
    await mongoClient.close();
    server.close(() => {
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    await mongoClient.connect();
    await producer.connect();
    
    // Initialize MQTT handler
    mqttHandler = new MqttHandler(mqttClient, mongoClient, producer);
    await mqttHandler.initialize();
    
    // Initialize WebSocket handler
    websocketHandler = new WebSocketHandler(wss, mongoClient);
    websocketHandler.initialize();
    
    server.listen(PORT, () => {
      logger.info(`IoT Service running on port ${PORT}`);
      logger.info('MQTT client connected:', mqttClient.connected);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { mongoClient, producer, mqttClient, wss };