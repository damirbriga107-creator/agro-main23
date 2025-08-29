import { Logger } from '../utils/logger';
import { EnvironmentUtils } from '@daorsagro/config';

interface ServiceEndpoint {
  name: string;
  url: string;
  healthy: boolean;
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
  consecutiveErrors: number;
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  nextAttempt: Date;
  lastFailure: Date;
}

/**
 * Service Discovery and Circuit Breaker implementation
 */
export class ServiceDiscoveryService {
  private logger: Logger;
  private services: Map<string, ServiceEndpoint> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  // Circuit breaker configuration
  private readonly FAILURE_THRESHOLD = 5;
  private readonly TIMEOUT_DURATION = 60000; // 1 minute
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.logger = new Logger('service-discovery');
    this.initializeServices();
  }

  /**
   * Initialize known services
   */
  private initializeServices(): void {
    const serviceConfigs = [
      { name: 'auth-service', url: EnvironmentUtils.get('AUTH_SERVICE_URL', 'http://localhost:3001') },
      { name: 'financial-service', url: EnvironmentUtils.get('FINANCIAL_SERVICE_URL', 'http://localhost:3002') },
      { name: 'subsidy-service', url: EnvironmentUtils.get('SUBSIDY_SERVICE_URL', 'http://localhost:3003') },
      { name: 'insurance-service', url: EnvironmentUtils.get('INSURANCE_SERVICE_URL', 'http://localhost:3004') },
      { name: 'analytics-service', url: EnvironmentUtils.get('ANALYTICS_SERVICE_URL', 'http://localhost:3005') },
      { name: 'document-service', url: EnvironmentUtils.get('DOCUMENT_SERVICE_URL', 'http://localhost:3006') },
      { name: 'notification-service', url: EnvironmentUtils.get('NOTIFICATION_SERVICE_URL', 'http://localhost:3007') },
      { name: 'iot-service', url: EnvironmentUtils.get('IOT_SERVICE_URL', 'http://localhost:3008') }
    ];

    serviceConfigs.forEach(config => {
      this.services.set(config.name, {
        name: config.name,
        url: config.url,
        healthy: true,
        lastCheck: new Date(),
        responseTime: 0,
        errorCount: 0,
        consecutiveErrors: 0
      });

      this.circuitBreakers.set(config.name, {
        state: 'CLOSED',
        failureCount: 0,
        nextAttempt: new Date(),
        lastFailure: new Date()
      });
    });
  }

  /**
   * Start health monitoring
   */
  start(): void {
    this.logger.info('Starting service discovery and health monitoring');
    
    // Initial health check
    this.performHealthChecks();
    
    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    this.logger.info('Stopping service discovery');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check if service is available
   */
  isServiceAvailable(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) return false;

    // If circuit is open, check if we should try again
    if (circuitBreaker.state === 'OPEN') {
      if (new Date() > circuitBreaker.nextAttempt) {
        // Transition to half-open state
        circuitBreaker.state = 'HALF_OPEN';
        this.logger.info(`Circuit breaker for ${serviceName} transitioning to HALF_OPEN`);
      } else {
        return false;
      }
    }

    const service = this.services.get(serviceName);
    return service ? service.healthy : false;
  }

  /**
   * Record service call result
   */
  recordServiceCall(serviceName: string, success: boolean, responseTime?: number): void {
    const service = this.services.get(serviceName);
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    
    if (!service || !circuitBreaker) return;

    if (success) {
      // Reset failure count on success
      service.consecutiveErrors = 0;
      circuitBreaker.failureCount = 0;
      
      // If we were in half-open state, close the circuit
      if (circuitBreaker.state === 'HALF_OPEN') {
        circuitBreaker.state = 'CLOSED';
        this.logger.info(`Circuit breaker for ${serviceName} closed after successful call`);
      }
      
      if (responseTime !== undefined) {
        service.responseTime = responseTime;
      }
      
      service.healthy = true;
    } else {
      // Record failure
      service.consecutiveErrors++;
      service.errorCount++;
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailure = new Date();
      
      // Check if we should open the circuit
      if (circuitBreaker.failureCount >= this.FAILURE_THRESHOLD) {
        circuitBreaker.state = 'OPEN';
        circuitBreaker.nextAttempt = new Date(Date.now() + this.TIMEOUT_DURATION);
        this.logger.warn(`Circuit breaker for ${serviceName} opened due to failures`, {
          failureCount: circuitBreaker.failureCount,
          nextAttempt: circuitBreaker.nextAttempt
        });
      }
      
      service.healthy = false;
    }

    service.lastCheck = new Date();
  }

  /**
   * Get service endpoint URL
   */
  getServiceUrl(serviceName: string): string | null {
    const service = this.services.get(serviceName);
    return service ? service.url : null;
  }

  /**
   * Get all services status
   */
  getServicesStatus(): any {
    const result: any = {};
    
    for (const [name, service] of this.services) {
      const circuitBreaker = this.circuitBreakers.get(name)!;
      
      result[name] = {
        healthy: service.healthy,
        url: service.url,
        lastCheck: service.lastCheck,
        responseTime: service.responseTime,
        errorCount: service.errorCount,
        consecutiveErrors: service.consecutiveErrors,
        circuitBreaker: {
          state: circuitBreaker.state,
          failureCount: circuitBreaker.failureCount,
          nextAttempt: circuitBreaker.nextAttempt,
          lastFailure: circuitBreaker.lastFailure
        }
      };
    }
    
    return result;
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.services.keys()).map(serviceName => 
      this.checkServiceHealth(serviceName)
    );

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Check health of a specific service
   */
  private async checkServiceHealth(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) return;

    // Skip health check if circuit is open
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker?.state === 'OPEN' && new Date() < circuitBreaker.nextAttempt) {
      return;
    }

    const startTime = Date.now();
    
    try {
      const response = await fetch(`${service.url}/health`, {
        method: 'GET',
        timeout: 5000, // 5 second timeout
        headers: {
          'User-Agent': 'API-Gateway-Health-Check',
          'X-Request-ID': require('crypto').randomUUID()
        }
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;

      this.recordServiceCall(serviceName, isHealthy, responseTime);

      if (isHealthy) {
        this.logger.debug(`Health check successful for ${serviceName}`, {
          responseTime: `${responseTime}ms`,
          status: response.status
        });
      } else {
        this.logger.warn(`Health check failed for ${serviceName}`, {
          responseTime: `${responseTime}ms`,
          status: response.status
        });
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordServiceCall(serviceName, false, responseTime);
      
      this.logger.error(`Health check error for ${serviceName}:`, error, {
        responseTime: `${responseTime}ms`
      });
    }
  }

  /**
   * Get healthy services count
   */
  getHealthyServicesCount(): { healthy: number; total: number } {
    const total = this.services.size;
    const healthy = Array.from(this.services.values()).filter(service => service.healthy).length;
    
    return { healthy, total };
  }

  /**
   * Get service statistics
   */
  getServiceStats(serviceName: string): any {
    const service = this.services.get(serviceName);
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    
    if (!service || !circuitBreaker) {
      return null;
    }

    return {
      name: service.name,
      url: service.url,
      healthy: service.healthy,
      lastCheck: service.lastCheck,
      responseTime: service.responseTime,
      errorCount: service.errorCount,
      consecutiveErrors: service.consecutiveErrors,
      circuitBreakerState: circuitBreaker.state,
      failureCount: circuitBreaker.failureCount,
      uptime: this.calculateUptime(service),
      availability: this.calculateAvailability(service)
    };
  }

  /**
   * Calculate service uptime percentage
   */
  private calculateUptime(service: ServiceEndpoint): number {
    // This is a simplified calculation
    // In a real implementation, you'd track uptime over time
    const totalChecks = service.errorCount + Math.max(1, 100); // Assume at least 100 successful checks
    const successfulChecks = totalChecks - service.errorCount;
    return Math.round((successfulChecks / totalChecks) * 10000) / 100; // 2 decimal places
  }

  /**
   * Calculate service availability percentage
   */
  private calculateAvailability(service: ServiceEndpoint): number {
    // Simplified availability calculation
    if (service.consecutiveErrors === 0) return 100;
    if (service.consecutiveErrors >= 5) return 0;
    return Math.round((1 - (service.consecutiveErrors / 10)) * 10000) / 100;
  }
}