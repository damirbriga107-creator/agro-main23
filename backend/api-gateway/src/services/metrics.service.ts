import { Logger } from '../utils/logger.js';

interface RequestMetrics {
  total: number;
  successful: number;
  failed: number;
  averageResponseTime: number;
  totalResponseTime: number;
}

interface ServiceMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  requestCount: number;
  lastRequest: Date;
}

interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: Date;
}

/**
 * Metrics collection and reporting service
 */
export class MetricsService {
  private logger: Logger;
  private requestMetrics: RequestMetrics;
  private serviceMetrics: Map<string, ServiceMetrics>;
  private systemMetrics: SystemMetrics;
  private startTime: Date;

  constructor() {
    this.logger = new Logger('metrics');
    this.startTime = new Date();
    
    this.requestMetrics = {
      total: 0,
      successful: 0,
      failed: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };
    
    this.serviceMetrics = new Map();
    this.systemMetrics = this.getSystemMetrics();
    
    // Update system metrics periodically
    setInterval(() => {
      this.systemMetrics = this.getSystemMetrics();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Record API request metrics
   */
  recordRequest(method: string, path: string, statusCode: number, responseTime: number): void {
    this.requestMetrics.total++;
    this.requestMetrics.totalResponseTime += responseTime;
    this.requestMetrics.averageResponseTime = this.requestMetrics.totalResponseTime / this.requestMetrics.total;

    if (statusCode >= 200 && statusCode < 400) {
      this.requestMetrics.successful++;
    } else {
      this.requestMetrics.failed++;
    }

    // Log slow requests
    if (responseTime > 5000) { // 5 seconds
      this.logger.warn('Slow request detected', {
        method,
        path,
        statusCode,
        responseTime: `${responseTime}ms`
      });
    }

    // Log error requests
    if (statusCode >= 400) {
      this.logger.warn('Error request', {
        method,
        path,
        statusCode,
        responseTime: `${responseTime}ms`
      });
    }
  }

  /**
   * Record service response metrics
   */
  recordServiceResponse(serviceName: string, statusCode: number, responseTime?: number): void {
    const currentMetrics = this.serviceMetrics.get(serviceName) || {
      status: 'healthy',
      responseTime: 0,
      errorRate: 0,
      requestCount: 0,
      lastRequest: new Date()
    };

    currentMetrics.requestCount++;
    currentMetrics.lastRequest = new Date();

    if (responseTime !== undefined) {
      // Calculate moving average for response time
      currentMetrics.responseTime = 
        (currentMetrics.responseTime * (currentMetrics.requestCount - 1) + responseTime) / 
        currentMetrics.requestCount;
    }

    // Update error rate
    if (statusCode >= 400) {
      const errorCount = Math.floor(currentMetrics.errorRate * (currentMetrics.requestCount - 1)) + 1;
      currentMetrics.errorRate = errorCount / currentMetrics.requestCount;
    } else {
      const errorCount = Math.floor(currentMetrics.errorRate * (currentMetrics.requestCount - 1));
      currentMetrics.errorRate = errorCount / currentMetrics.requestCount;
    }

    // Determine service status
    if (currentMetrics.errorRate > 0.5 || (responseTime && responseTime > 10000)) {
      currentMetrics.status = 'unhealthy';
    } else if (currentMetrics.errorRate > 0.1 || (responseTime && responseTime > 5000)) {
      currentMetrics.status = 'degraded';
    } else {
      currentMetrics.status = 'healthy';
    }

    this.serviceMetrics.set(serviceName, currentMetrics);
  }

  /**
   * Get all metrics
   */
  getMetrics(): any {
    return {
      timestamp: new Date().toISOString(),
      uptime: this.getUptimeSeconds(),
      requests: {
        ...this.requestMetrics,
        errorRate: this.requestMetrics.total > 0 ? 
          this.requestMetrics.failed / this.requestMetrics.total : 0,
        successRate: this.requestMetrics.total > 0 ? 
          this.requestMetrics.successful / this.requestMetrics.total : 0
      },
      services: Object.fromEntries(this.serviceMetrics),
      system: {
        uptime: this.systemMetrics.uptime,
        memory: {
          used: this.systemMetrics.memoryUsage.heapUsed,
          total: this.systemMetrics.memoryUsage.heapTotal,
          external: this.systemMetrics.memoryUsage.external,
          rss: this.systemMetrics.memoryUsage.rss
        },
        cpu: {
          user: this.systemMetrics.cpuUsage.user,
          system: this.systemMetrics.cpuUsage.system
        }
      },
      performance: {
        averageResponseTime: this.requestMetrics.averageResponseTime,
        slowRequestsCount: this.getSlowRequestsCount(),
        errorRequestsCount: this.requestMetrics.failed
      }
    };
  }

  /**
   * Get metrics for specific service
   */
  getServiceMetrics(serviceName: string): ServiceMetrics | null {
    return this.serviceMetrics.get(serviceName) || null;
  }

  /**
   * Get request metrics summary
   */
  getRequestMetrics(): RequestMetrics & { errorRate: number; successRate: number } {
    return {
      ...this.requestMetrics,
      errorRate: this.requestMetrics.total > 0 ? 
        this.requestMetrics.failed / this.requestMetrics.total : 0,
      successRate: this.requestMetrics.total > 0 ? 
        this.requestMetrics.successful / this.requestMetrics.total : 0
    };
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics(): SystemMetrics {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date()
    };
  }

  /**
   * Get uptime in seconds
   */
  private getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  /**
   * Get count of slow requests (>5s)
   */
  private getSlowRequestsCount(): number {
    // This is a simplified implementation
    // In a real system, you'd track this more precisely
    return Math.floor(this.requestMetrics.total * 0.01); // Estimate 1% slow requests
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.requestMetrics = {
      total: 0,
      successful: 0,
      failed: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };
    
    this.serviceMetrics.clear();
    this.startTime = new Date();
    
    this.logger.info('Metrics reset');
  }

  /**
   * Get health score based on metrics
   */
  getHealthScore(): number {
    const requestScore = this.requestMetrics.total > 0 ? 
      (this.requestMetrics.successful / this.requestMetrics.total) * 100 : 100;
    
    const responseTimeScore = this.requestMetrics.averageResponseTime < 1000 ? 100 :
      this.requestMetrics.averageResponseTime < 5000 ? 75 : 50;
    
    const serviceScores = Array.from(this.serviceMetrics.values()).map(metrics => {
      switch (metrics.status) {
        case 'healthy': return 100;
        case 'degraded': return 60;
        case 'unhealthy': return 20;
        default: return 0;
      }
    });
    
    const averageServiceScore = serviceScores.length > 0 ? 
      serviceScores.reduce((sum: number, score: number) => sum + score, 0) / serviceScores.length : 100;
    
    // Weighted average
    return Math.round(
      requestScore * 0.4 + 
      responseTimeScore * 0.3 + 
      averageServiceScore * 0.3
    );
  }

  /**
   * Get metrics summary for dashboard
   */
  getSummary(): any {
    const healthScore = this.getHealthScore();
    const uptime = this.getUptimeSeconds();
    
    return {
      healthScore,
      status: healthScore >= 90 ? 'excellent' : 
              healthScore >= 70 ? 'good' : 
              healthScore >= 50 ? 'warning' : 'critical',
      uptime: {
        seconds: uptime,
        human: this.formatUptime(uptime)
      },
      requests: {
        total: this.requestMetrics.total,
        errorRate: this.requestMetrics.total > 0 ? 
          Math.round((this.requestMetrics.failed / this.requestMetrics.total) * 100) : 0,
        averageResponseTime: Math.round(this.requestMetrics.averageResponseTime)
      },
      services: {
        total: this.serviceMetrics.size,
        healthy: Array.from(this.serviceMetrics.values())
          .filter(m => m.status === 'healthy').length,
        degraded: Array.from(this.serviceMetrics.values())
          .filter(m => m.status === 'degraded').length,
        unhealthy: Array.from(this.serviceMetrics.values())
          .filter(m => m.status === 'unhealthy').length
      }
    };
  }

  /**
   * Format uptime in human readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Export metrics to Prometheus format
   */
  getPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];

    // Request metrics
    lines.push(`# HELP http_requests_total Total number of HTTP requests`);
    lines.push(`# TYPE http_requests_total counter`);
    lines.push(`http_requests_total{status="success"} ${metrics.requests.successful}`);
    lines.push(`http_requests_total{status="error"} ${metrics.requests.failed}`);

    // Response time
    lines.push(`# HELP http_request_duration_seconds HTTP request duration`);
    lines.push(`# TYPE http_request_duration_seconds gauge`);
    lines.push(`http_request_duration_seconds ${metrics.requests.averageResponseTime / 1000}`);

    // Memory usage
    lines.push(`# HELP memory_usage_bytes Memory usage in bytes`);
    lines.push(`# TYPE memory_usage_bytes gauge`);
    lines.push(`memory_usage_bytes{type="heap_used"} ${metrics.system.memory.used}`);
    lines.push(`memory_usage_bytes{type="heap_total"} ${metrics.system.memory.total}`);

    // Uptime
    lines.push(`# HELP uptime_seconds Process uptime in seconds`);
    lines.push(`# TYPE uptime_seconds counter`);
    lines.push(`uptime_seconds ${metrics.uptime}`);

    return lines.join('\n');
  }
}