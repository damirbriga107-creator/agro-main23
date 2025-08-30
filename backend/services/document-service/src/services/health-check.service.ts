import { MongoClient } from 'mongodb';
import { logger } from '@daorsagro/utils';

export class HealthCheckService {
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    services: Record<string, any>;
    uptime: number;
    memory: any;
  }> {
    const services: Record<string, any> = {};
    let overallStatus: 'healthy' | 'unhealthy' = 'healthy';

    try {
      // Check MongoDB connection
      services.mongodb = await this.checkMongoDB();
      if (services.mongodb.status !== 'healthy') {
        overallStatus = 'unhealthy';
      }

      // Check storage service
      services.storage = await this.checkStorage();
      if (services.storage.status !== 'healthy') {
        overallStatus = 'unhealthy';
      }

      // Check Kafka connection
      services.kafka = await this.checkKafka();
      if (services.kafka.status !== 'healthy') {
        // Kafka is optional, so don't fail the entire health check
        logger.warn('Kafka health check failed, but continuing');
      }

      // System metrics
      const memoryUsage = process.memoryUsage();

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services,
        uptime: process.uptime(),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024)
        }
      };
    } catch (error) {
      logger.error('Health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkMongoDB(): Promise<any> {
    try {
      const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
      const client = new MongoClient(mongoUrl);
      
      await client.connect();
      const adminDb = client.db().admin();
      const status = await adminDb.ping();
      await client.close();

      return {
        status: 'healthy',
        responseTime: Date.now(),
        details: 'MongoDB connection successful'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'MongoDB connection failed',
        details: 'Failed to connect to MongoDB'
      };
    }
  }

  private async checkStorage(): Promise<any> {
    try {
      const storageType = process.env.STORAGE_TYPE || 'local';
      
      switch (storageType) {
        case 'local':
          // Check if upload directory is accessible
          const fs = require('fs/promises');
          const uploadPath = process.env.UPLOAD_PATH || './uploads';
          await fs.access(uploadPath);
          return {
            status: 'healthy',
            type: 'local',
            path: uploadPath,
            details: 'Local storage accessible'
          };
          
        case 's3':
          // TODO: Check S3 connectivity
          return {
            status: 'healthy',
            type: 's3',
            details: 'S3 storage configured'
          };
          
        default:
          return {
            status: 'healthy',
            type: storageType,
            details: `${storageType} storage configured`
          };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Storage check failed',
        details: 'Failed to verify storage accessibility'
      };
    }
  }

  private async checkKafka(): Promise<any> {
    try {
      // This is a basic check - in production you might want to create a test producer/consumer
      const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
      
      return {
        status: 'healthy',
        brokers,
        details: 'Kafka configuration present'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Kafka check failed',
        details: 'Failed to verify Kafka connectivity'
      };
    }
  }

  async getMetrics(): Promise<any> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      return {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      };
    } catch (error) {
      logger.error('Failed to get metrics', error);
      throw error;
    }
  }
}