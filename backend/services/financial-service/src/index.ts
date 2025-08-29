import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { Kafka } from 'kafkajs';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { validationMiddleware } from './middleware/validation.middleware';
import transactionRoutes from './routes/transaction.routes';
import budgetRoutes from './routes/budget.routes';
import reportRoutes from './routes/report.routes';
import categoryRoutes from './routes/category.routes';

const app = express();
const PORT = process.env.PORT || 3002;

// Database
const prisma = new PrismaClient();

// Kafka
const kafka = new Kafka({
  clientId: 'financial-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'financial-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected',
  });
});

// Routes with authentication
app.use('/api/v1/financial', authMiddleware);
app.use('/api/v1/financial/transactions', transactionRoutes);
app.use('/api/v1/financial/budgets', budgetRoutes);
app.use('/api/v1/financial/reports', reportRoutes);
app.use('/api/v1/financial/categories', categoryRoutes);

// Error handling
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  try {
    await producer.disconnect();
    await prisma.$disconnect();
    process.exit(0);
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
    await producer.connect();
    logger.info('Kafka producer connected');

    app.listen(PORT, () => {
      logger.info(`Financial Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { prisma, producer };