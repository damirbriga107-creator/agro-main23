import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { MongoClient } from 'mongodb';
import { Kafka } from 'kafkajs';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import subsidyRoutes from './routes/subsidy.routes';
import programRoutes from './routes/program.routes';

const app = express();
const PORT = process.env.PORT || 3003;

// MongoDB
const mongoClient = new MongoClient(process.env.MONGODB_URL || 'mongodb://localhost:27017/daorsagro');

// Kafka
const kafka = new Kafka({
  clientId: 'subsidy-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'subsidy-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/v1/subsidies', authMiddleware);
app.use('/api/v1/subsidies/applications', subsidyRoutes);
app.use('/api/v1/subsidies/programs', programRoutes);

app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await mongoClient.connect();
    await producer.connect();
    logger.info('Subsidy Service connected to MongoDB and Kafka');

    app.listen(PORT, () => {
      logger.info(`Subsidy Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { mongoClient, producer };