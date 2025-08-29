import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import mqtt from 'mqtt';
import { MongoClient } from 'mongodb';
import { Kafka } from 'kafkajs';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import deviceRoutes from './routes/device.routes';
import sensorRoutes from './routes/sensor.routes';
import dataRoutes from './routes/data.routes';
import { MqttHandler } from './services/mqtt.service';
import { WebSocketHandler } from './services/websocket.service';

const app = express();
const PORT = process.env.PORT || 3008;

// Create HTTP server for WebSocket
const server = createServer(app);
const wss = new WebSocketServer({ server });

// MongoDB
const mongoClient = new MongoClient(process.env.MONGODB_URL || 'mongodb://localhost:27017/daorsagro');

// Kafka
const kafka = new Kafka({
  clientId: 'iot-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();

// MQTT Client
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883', {
  clientId: 'daorsagro-iot-service',
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200 // Higher limit for IoT data
}));

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