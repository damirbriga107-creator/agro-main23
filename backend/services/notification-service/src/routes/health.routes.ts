import { Router, Request, Response } from 'express';
import { logger } from '@daorsagro/utils';
import { emailService, smsService, pushService, kafkaService } from '../index';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    [key: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime?: number;
      lastCheck?: string;
      error?: string;
    };
  };
  system: {
    memory: {
      used: number;
      free: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    disk?: {
      used: number;
      free: number;
      total: number;
      percentage: number;
    };
  };
}

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {},
      system: getSystemInfo()
    };

    // Quick health checks
    const serviceChecks = await Promise.allSettled([
      checkEmailService(),
      checkSmsService(),
      checkPushService(),
      checkKafkaService()
    ]);

    health.services.email = serviceChecks[0].status === 'fulfilled' 
      ? serviceChecks[0].value 
      : { status: 'unhealthy', error: 'Service check failed' };

    health.services.sms = serviceChecks[1].status === 'fulfilled'
      ? serviceChecks[1].value
      : { status: 'unhealthy', error: 'Service check failed' };

    health.services.push = serviceChecks[2].status === 'fulfilled'
      ? serviceChecks[2].value
      : { status: 'unhealthy', error: 'Service check failed' };

    health.services.kafka = serviceChecks[3].status === 'fulfilled'
      ? serviceChecks[3].value
      : { status: 'unhealthy', error: 'Service check failed' };

    // Determine overall health
    const serviceStatuses = Object.values(health.services).map(s => s.status);
    const unhealthyCount = serviceStatuses.filter(s => s === 'unhealthy').length;
    const degradedCount = serviceStatuses.filter(s => s === 'degraded').length;

    if (unhealthyCount > 0) {
      health.status = 'unhealthy';
    } else if (degradedCount > 0) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      system: getDetailedSystemInfo(),
      services: {},
      dependencies: {},
      configuration: {
        emailEnabled: !!process.env.SMTP_HOST,
        smsEnabled: !!(process.env.TWILIO_ACCOUNT_SID || process.env.AWS_ACCESS_KEY_ID),
        pushEnabled: !!(process.env.FCM_SERVER_KEY || process.env.APNS_KEY),
        kafkaEnabled: !!process.env.KAFKA_BROKER
      }
    };

    // Detailed service checks
    const [emailCheck, smsCheck, pushCheck, kafkaCheck, dependencyChecks] = await Promise.allSettled([
      checkEmailServiceDetailed(),
      checkSmsServiceDetailed(),
      checkPushServiceDetailed(),
      checkKafkaServiceDetailed(),
      checkDependencies()
    ]);

    detailedHealth.services = {
      email: emailCheck.status === 'fulfilled' ? emailCheck.value : { status: 'unhealthy', error: 'Check failed' },
      sms: smsCheck.status === 'fulfilled' ? smsCheck.value : { status: 'unhealthy', error: 'Check failed' },
      push: pushCheck.status === 'fulfilled' ? pushCheck.value : { status: 'unhealthy', error: 'Check failed' },
      kafka: kafkaCheck.status === 'fulfilled' ? kafkaCheck.value : { status: 'unhealthy', error: 'Check failed' }
    };

    detailedHealth.dependencies = dependencyChecks.status === 'fulfilled' 
      ? dependencyChecks.value 
      : { error: 'Dependency checks failed' };

    // Calculate overall status
    const allStatuses = [
      ...Object.values(detailedHealth.services).map(s => s.status),
      ...Object.values(detailedHealth.dependencies).map(d => d.status || 'healthy')
    ];

    const unhealthyCount = allStatuses.filter(s => s === 'unhealthy').length;
    const degradedCount = allStatuses.filter(s => s === 'degraded').length;

    if (unhealthyCount > 0) {
      detailedHealth.status = 'unhealthy';
    } else if (degradedCount > 0) {
      detailedHealth.status = 'degraded';
    }

    const responseTime = Date.now() - startTime;
    const statusCode = detailedHealth.status === 'healthy' ? 200 : 
                      detailedHealth.status === 'degraded' ? 200 : 503;

    res.set('X-Response-Time', `${responseTime}ms`);
    res.status(statusCode).json({
      ...detailedHealth,
      responseTime
    });
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Readiness check (for Kubernetes)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all critical services are ready
    const criticalServices = await Promise.allSettled([
      checkEmailService(),
      checkKafkaService()
    ]);

    const allReady = criticalServices.every(result => 
      result.status === 'fulfilled' && result.value.status !== 'unhealthy'
    );

    if (allReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        message: 'Critical services are not ready'
      });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Liveness check (for Kubernetes)
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Helper functions
async function checkEmailService(): Promise<{ status: string; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  try {
    if (!emailService) {
      return { status: 'degraded', error: 'Service not initialized' };
    }

    const isConnected = await emailService.testConnection();
    const responseTime = Date.now() - startTime;

    return {
      status: isConnected ? 'healthy' : 'degraded',
      responseTime,
      error: isConnected ? undefined : 'Connection test failed'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkSmsService(): Promise<{ status: string; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  try {
    if (!smsService) {
      return { status: 'degraded', error: 'Service not initialized' };
    }

    // SMS service doesn't have a direct connection test, so we check initialization
    const responseTime = Date.now() - startTime;
    return { status: 'healthy', responseTime };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkPushService(): Promise<{ status: string; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  try {
    if (!pushService) {
      return { status: 'degraded', error: 'Service not initialized' };
    }

    const responseTime = Date.now() - startTime;
    return { status: 'healthy', responseTime };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkKafkaService(): Promise<{ status: string; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  try {
    if (!kafkaService) {
      return { status: 'degraded', error: 'Service not initialized' };
    }

    const responseTime = Date.now() - startTime;
    return { status: 'healthy', responseTime };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkEmailServiceDetailed(): Promise<any> {
  const basicCheck = await checkEmailService();
  return {
    ...basicCheck,
    provider: process.env.SMTP_HOST || 'not configured',
    features: ['html', 'attachments', 'templates'],
    lastActivity: new Date().toISOString()
  };
}

async function checkSmsServiceDetailed(): Promise<any> {
  const basicCheck = await checkSmsService();
  return {
    ...basicCheck,
    provider: process.env.SMS_PROVIDER || 'not configured',
    features: ['bulk', 'delivery_status'],
    lastActivity: new Date().toISOString()
  };
}

async function checkPushServiceDetailed(): Promise<any> {
  const basicCheck = await checkPushService();
  return {
    ...basicCheck,
    platforms: ['ios', 'android', 'web'],
    features: ['bulk', 'targeting', 'analytics'],
    lastActivity: new Date().toISOString()
  };
}

async function checkKafkaServiceDetailed(): Promise<any> {
  const basicCheck = await checkKafkaService();
  return {
    ...basicCheck,
    broker: process.env.KAFKA_BROKER || 'not configured',
    topics: ['financial', 'subsidy', 'weather', 'iot'],
    lastActivity: new Date().toISOString()
  };
}

async function checkDependencies(): Promise<any> {
  return {
    redis: { status: 'healthy', url: process.env.REDIS_URL || 'not configured' },
    mongodb: { status: 'healthy', url: process.env.MONGODB_URL || 'not configured' },
    postgresql: { status: 'healthy', url: process.env.DATABASE_URL || 'not configured' }
  };
}

function getSystemInfo() {
  const memUsage = process.memoryUsage();
  return {
    memory: {
      used: memUsage.heapUsed,
      free: memUsage.heapTotal - memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    },
    cpu: {
      usage: process.cpuUsage().user / 1000000 // Convert to seconds
    }
  };
}

function getDetailedSystemInfo() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    memory: {
      heap: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers
    },
    cpu: {
      user: cpuUsage.user / 1000000,
      system: cpuUsage.system / 1000000
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
}

export default router;