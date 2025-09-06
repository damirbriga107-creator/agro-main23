import { HealthCheck, HealthStatus } from '@daorsagro/types';
import { EnvironmentUtils } from '@daorsagro/config';
import { Logger } from '../utils/logger.js';

/**
 * Health check service for monitoring system status
 */
export class HealthCheckService {
  private logger: Logger;
  private checkInterval: NodeJS.Timeout | null = null;
  private serviceStatuses: Map<string, HealthStatus> = new Map();

  constructor() {
    this.logger = new Logger('health-check');
  }

  /**
   * Start health check monitoring
   */
  async start(): Promise<void> {
    this.logger.info('Starting health check service');
    
    // Initial health check
    await this.performHealthChecks();
    
    // Schedule periodic health checks
    const intervalMs = EnvironmentUtils.getNumber('HEALTH_CHECK_INTERVAL', 30000); // 30 seconds
    this.checkInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.logger.error('Health check failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop health check monitoring
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping health check service');
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get current health status
   */
  async getHealth(): Promise<HealthCheck> {
    const checks = {
      database: this.serviceStatuses.get('database') || await this.checkDatabase(),
      redis: this.serviceStatuses.get('redis') || await this.checkRedis(),
      externalApis: this.serviceStatuses.get('externalApis') || await this.checkExternalAPIs()
    };

    // Determine overall status
    const statuses = Object.values(checks).map(check => check.status);
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (statuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: EnvironmentUtils.get('npm_package_version', '1.0.0'),
      checks
    };
  }

  /**
   * Perform all health checks
   */
  private async performHealthChecks(): Promise<void> {
    const checks = [
      { name: 'database', check: () => this.checkDatabase() },
      { name: 'redis', check: () => this.checkRedis() },
      { name: 'externalApis', check: () => this.checkExternalAPIs() }
    ];

    await Promise.all(
      checks.map(async ({ name, check }) => {
        try {
          const result = await check();
          this.serviceStatuses.set(name, result);
        } catch (error) {
          this.logger.error(`Health check failed for ${name}:`, error);
          this.serviceStatuses.set(name, {
            status: 'unhealthy',
            message: `Health check failed: ${(error as any)?.message}`,
            timestamp: new Date().toISOString()
          });
        }
      })
    );
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Since this is the API Gateway, we'll check if database services are responding
      const authServiceUrl = EnvironmentUtils.get('AUTH_SERVICE_URL', 'http://localhost:3001');
      const response = await this.makeHealthRequest(`${authServiceUrl}/health`);
      
      return {
        status: response.ok ? 'healthy' : 'degraded',
        message: response.ok ? 'Database connection healthy' : 'Database connection degraded',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database health check failed: ${(error as any)?.message}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Try to create a Redis client and ping
      const redis = require('redis');
      const client = redis.createClient({
        url: EnvironmentUtils.get('REDIS_URL', 'redis://localhost:6379')
      });
      
      await client.connect();
      await client.ping();
      await client.disconnect();
      
      return {
        status: 'healthy',
        message: 'Redis connection healthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Redis health check failed: ${(error as any)?.message}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check external APIs
   */
  private async checkExternalAPIs(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const services = [
        { name: 'auth-service', url: EnvironmentUtils.get('AUTH_SERVICE_URL', 'http://localhost:3001') },
        { name: 'financial-service', url: EnvironmentUtils.get('FINANCIAL_SERVICE_URL', 'http://localhost:3002') },
        { name: 'subsidy-service', url: EnvironmentUtils.get('SUBSIDY_SERVICE_URL', 'http://localhost:3003') },
        { name: 'insurance-service', url: EnvironmentUtils.get('INSURANCE_SERVICE_URL', 'http://localhost:3004') }
      ];

      const results = await Promise.allSettled(
        services.map(service => 
          this.makeHealthRequest(`${service.url}/health`, 5000) // 5 second timeout
        )
      );

      const healthyServices = results.filter(result => 
        result.status === 'fulfilled' && result.value.ok
      ).length;

      const totalServices = services.length;
      const healthRatio = healthyServices / totalServices;

      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      let message = `${healthyServices}/${totalServices} services healthy`;

      if (healthRatio < 0.5) {
        status = 'unhealthy';
        message = `Critical: Only ${healthyServices}/${totalServices} services responding`;
      } else if (healthRatio < 1) {
        status = 'degraded';
        message = `Warning: ${healthyServices}/${totalServices} services healthy`;
      }

      return {
        status,
        message,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `External API health check failed: ${(error as any)?.message}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Make HTTP request for health check
   */
  private async makeHealthRequest(url: string, timeout: number = 10000): Promise<{ ok: boolean; status: number }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DaorsAgro-HealthCheck/1.0'
        }
      });

      clearTimeout(timeoutId);
      
      return {
        ok: response.ok,
        status: response.status
      };
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        throw new Error('Health check timeout');
      }
      throw error;
    }
  }

  /**
   * Get detailed service status
   */
  getServiceStatus(serviceName: string): HealthStatus | undefined {
    return this.serviceStatuses.get(serviceName);
  }

  /**
   * Set custom service status (for testing)
   */
  setServiceStatus(serviceName: string, status: HealthStatus): void {
    this.serviceStatuses.set(serviceName, status);
  }

  /**
   * Check if overall system is healthy
   */
  async isHealthy(): Promise<boolean> {
    const health = await this.getHealth();
    return health.status === 'healthy';
  }

  /**
   * Get uptime information
   */
  getUptime(): { uptime: number; uptimeHuman: string } {
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    
    return {
      uptime: uptimeSeconds,
      uptimeHuman: `${hours}h ${minutes}m ${seconds}s`
    };
  }

  /**
   * Get memory usage information
   */
  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Get CPU usage information
   */
  getCPUUsage(): NodeJS.CpuUsage {
    return process.cpuUsage();
  }
}