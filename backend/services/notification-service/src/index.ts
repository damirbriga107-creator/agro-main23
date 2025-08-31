import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from '@daorsagro/config';
import { logger } from '@daorsagro/utils';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushService } from './services/push.service';
import { KafkaService } from './services/kafka.service';
import { errorHandler } from './middleware/error-handler.middleware';
import { rateLimiter } from './middleware/rate-limiter.middleware';
import { validateApiKey } from './middleware/auth.middleware';
import notificationRoutes from './routes/notification.routes';
import webhookRoutes from './routes/webhook.routes';
import healthRoutes from './routes/health.routes';
import metricsRoutes from './routes/metrics.routes';

const app = express();
const port = config.notification.port || 3007;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimiter);

// API key validation for external requests
app.use('/api/v1/notifications', validateApiKey);

// Routes
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/health', healthRoutes);
app.use('/metrics', metricsRoutes);

// Error handling
app.use(errorHandler);

// Initialize services
let notificationService: NotificationService;
let emailService: EmailService;
let smsService: SmsService;
let pushService: PushService;
let kafkaService: KafkaService;

async function initializeServices() {
  try {
    // Initialize email service
    emailService = new EmailService();
    await emailService.initialize();

    // Initialize SMS service
    smsService = new SmsService();
    await smsService.initialize();

    // Initialize push notification service
    pushService = new PushService();
    await pushService.initialize();

    // Initialize Kafka service for event consumption
    kafkaService = new KafkaService();
    await kafkaService.initialize();

    // Initialize main notification service
    notificationService = new NotificationService(
      emailService,
      smsService,
      pushService
    );

    logger.info('All notification services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize notification services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal, shutting down gracefully...');
  
  try {
    if (kafkaService) {
      await kafkaService.disconnect();
    }
    
    if (emailService) {
      await emailService.disconnect();
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal, shutting down gracefully...');
  
  try {
    if (kafkaService) {
      await kafkaService.disconnect();
    }
    
    if (emailService) {
      await emailService.disconnect();
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    app.listen(port, () => {
      logger.info(`Notification service running on port ${port}`);
      logger.info(`Health check: http://localhost:${port}/health`);
      logger.info(`Metrics: http://localhost:${port}/metrics`);
    });
  } catch (error) {
    logger.error('Failed to start notification service:', error);
    process.exit(1);
  }
}

startServer();

export { app, notificationService, emailService, smsService, pushService };