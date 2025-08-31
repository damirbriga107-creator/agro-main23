import { Router, Request, Response } from 'express';
import { logger } from '@daorsagro/utils';

const router = Router();

// Simple metrics store (in production, use Prometheus client or similar)
class MetricsStore {
  private metrics: Map<string, any> = new Map();
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();

  increment(name: string, labels?: Record<string, string>, value: number = 1): void {
    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  set(name: string, labels: Record<string, string> | undefined, value: number): void {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);
  }

  observe(name: string, labels: Record<string, string> | undefined, value: number): void {
    const key = this.getMetricKey(name, labels);
    const current = this.histograms.get(key) || [];
    current.push(value);
    
    // Keep only last 1000 observations
    if (current.length > 1000) {
      current.shift();
    }
    
    this.histograms.set(key, current);
  }

  getPrometheusFormat(): string {
    let output = '';

    // Counters
    output += '# Notification service metrics\n';
    output += '# TYPE notifications_sent_total counter\n';
    this.counters.forEach((value, key) => {
      output += `${key} ${value}\n`;
    });

    // Gauges
    output += '\n# TYPE notification_queue_size gauge\n';
    this.gauges.forEach((value, key) => {
      output += `${key} ${value}\n`;
    });

    // Histograms (simplified)
    output += '\n# TYPE notification_duration_seconds histogram\n';
    this.histograms.forEach((values, key) => {
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const count = values.length;
        output += `${key}_sum ${sum}\n`;
        output += `${key}_count ${count}\n`;
      }
    });

    return output;
  }

  getJsonFormat(): any {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            sum: values.reduce((a, b) => a + b, 0),
            avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
            min: values.length > 0 ? Math.min(...values) : 0,
            max: values.length > 0 ? Math.max(...values) : 0
          }
        ])
      )
    };
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `${name}{${labelStr}}`;
  }
}

const metricsStore = new MetricsStore();

// Initialize default metrics
function initializeMetrics() {
  // Notification metrics
  metricsStore.increment('notifications_sent_total', { channel: 'email', status: 'success' }, 0);
  metricsStore.increment('notifications_sent_total', { channel: 'email', status: 'failed' }, 0);
  metricsStore.increment('notifications_sent_total', { channel: 'sms', status: 'success' }, 0);
  metricsStore.increment('notifications_sent_total', { channel: 'sms', status: 'failed' }, 0);
  metricsStore.increment('notifications_sent_total', { channel: 'push', status: 'success' }, 0);
  metricsStore.increment('notifications_sent_total', { channel: 'push', status: 'failed' }, 0);

  // System metrics
  metricsStore.set('notification_service_up', undefined, 1);
  metricsStore.set('notification_queue_size', { type: 'email' }, 0);
  metricsStore.set('notification_queue_size', { type: 'sms' }, 0);
  metricsStore.set('notification_queue_size', { type: 'push' }, 0);
}

// Initialize metrics on startup
initializeMetrics();

// Prometheus metrics endpoint
router.get('/', (req: Request, res: Response) => {
  try {
    // Update system metrics
    updateSystemMetrics();

    const format = req.query.format || 'prometheus';
    
    if (format === 'json') {
      res.json({
        timestamp: new Date().toISOString(),
        metrics: metricsStore.getJsonFormat()
      });
    } else {
      // Prometheus format (default)
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metricsStore.getPrometheusFormat());
    }
  } catch (error) {
    logger.error('Failed to generate metrics:', error);
    res.status(500).text('Error generating metrics');
  }
});

// Detailed metrics endpoint
router.get('/detailed', (req: Request, res: Response) => {
  try {
    updateSystemMetrics();

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      notifications: {
        total: getTotalNotifications(),
        byChannel: getNotificationsByChannel(),
        byStatus: getNotificationsByStatus(),
        byType: getNotificationsByType(),
        recentActivity: getRecentActivity()
      },
      performance: {
        averageResponseTime: getAverageResponseTime(),
        successRate: getSuccessRate(),
        throughput: getThroughput()
      },
      system: getSystemMetrics(),
      errors: getErrorMetrics()
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to generate detailed metrics:', error);
    res.status(500).json({
      error: 'Failed to generate detailed metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Custom metrics endpoint for specific services
router.get('/notifications', (req: Request, res: Response) => {
  try {
    const { channel, type, period = '1h' } = req.query;

    const metrics = {
      timestamp: new Date().toISOString(),
      period,
      filters: { channel, type },
      data: getNotificationMetrics(channel as string, type as string, period as string)
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to generate notification metrics:', error);
    res.status(500).json({
      error: 'Failed to generate notification metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Performance metrics
router.get('/performance', (req: Request, res: Response) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      responseTime: {
        average: getAverageResponseTime(),
        p50: getPercentile(50),
        p90: getPercentile(90),
        p95: getPercentile(95),
        p99: getPercentile(99)
      },
      throughput: {
        requestsPerSecond: getThroughput(),
        notificationsPerSecond: getNotificationThroughput()
      },
      errors: {
        rate: getErrorRate(),
        count: getErrorCount()
      },
      system: getSystemMetrics()
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to generate performance metrics:', error);
    res.status(500).json({
      error: 'Failed to generate performance metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Helper functions to track metrics
export function trackNotificationSent(channel: string, status: 'success' | 'failed', duration?: number): void {
  metricsStore.increment('notifications_sent_total', { channel, status });
  
  if (duration !== undefined) {
    metricsStore.observe('notification_duration_seconds', { channel }, duration);
  }
}

export function trackApiRequest(endpoint: string, method: string, status: number, duration: number): void {
  metricsStore.increment('http_requests_total', { 
    endpoint: endpoint.replace(/\/\d+/g, '/:id'), // Normalize paths with IDs
    method, 
    status: status.toString() 
  });
  
  metricsStore.observe('http_request_duration_seconds', { endpoint, method }, duration);
}

export function setQueueSize(type: string, size: number): void {
  metricsStore.set('notification_queue_size', { type }, size);
}

export function trackError(type: string, operation: string): void {
  metricsStore.increment('notification_errors_total', { type, operation });
}

// Helper functions for calculating metrics
function updateSystemMetrics(): void {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  metricsStore.set('process_memory_usage_bytes', { type: 'heap' }, memUsage.heapUsed);
  metricsStore.set('process_memory_usage_bytes', { type: 'external' }, memUsage.external);
  metricsStore.set('process_cpu_usage_seconds', { type: 'user' }, cpuUsage.user / 1000000);
  metricsStore.set('process_cpu_usage_seconds', { type: 'system' }, cpuUsage.system / 1000000);
  metricsStore.set('process_uptime_seconds', undefined, process.uptime());
}

function getTotalNotifications(): number {
  // Sum all notification counters
  let total = 0;
  metricsStore['counters'].forEach((value, key) => {
    if (key.includes('notifications_sent_total')) {
      total += value;
    }
  });
  return total;
}

function getNotificationsByChannel(): Record<string, number> {
  const channels: Record<string, number> = {};
  
  metricsStore['counters'].forEach((value, key) => {
    if (key.includes('notifications_sent_total')) {
      const match = key.match(/channel="([^"]+)"/);
      if (match) {
        const channel = match[1];
        channels[channel] = (channels[channel] || 0) + value;
      }
    }
  });
  
  return channels;
}

function getNotificationsByStatus(): Record<string, number> {
  const statuses: Record<string, number> = {};
  
  metricsStore['counters'].forEach((value, key) => {
    if (key.includes('notifications_sent_total')) {
      const match = key.match(/status="([^"]+)"/);
      if (match) {
        const status = match[1];
        statuses[status] = (statuses[status] || 0) + value;
      }
    }
  });
  
  return statuses;
}

function getNotificationsByType(): Record<string, number> {
  // This would be tracked if we added type labels to metrics
  return {
    financial: 0,
    weather: 0,
    subsidy: 0,
    system: 0
  };
}

function getRecentActivity(): any[] {
  // In production, this would return recent notification activity
  return [];
}

function getAverageResponseTime(): number {
  const durations = metricsStore['histograms'].get('notification_duration_seconds') || [];
  if (durations.length === 0) return 0;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

function getPercentile(percentile: number): number {
  const durations = metricsStore['histograms'].get('notification_duration_seconds') || [];
  if (durations.length === 0) return 0;
  
  const sorted = [...durations].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

function getSuccessRate(): number {
  let successCount = 0;
  let totalCount = 0;
  
  metricsStore['counters'].forEach((value, key) => {
    if (key.includes('notifications_sent_total')) {
      totalCount += value;
      if (key.includes('status="success"')) {
        successCount += value;
      }
    }
  });
  
  return totalCount > 0 ? (successCount / totalCount) * 100 : 0;
}

function getThroughput(): number {
  // Requests per second over last minute (simplified)
  return 0; // Would calculate from request timestamps
}

function getNotificationThroughput(): number {
  // Notifications per second over last minute (simplified)
  return 0; // Would calculate from notification timestamps
}

function getErrorRate(): number {
  let errorCount = 0;
  let totalCount = 0;
  
  metricsStore['counters'].forEach((value, key) => {
    if (key.includes('notifications_sent_total')) {
      totalCount += value;
      if (key.includes('status="failed"')) {
        errorCount += value;
      }
    }
  });
  
  return totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
}

function getErrorCount(): number {
  let count = 0;
  metricsStore['counters'].forEach((value, key) => {
    if (key.includes('notification_errors_total')) {
      count += value;
    }
  });
  return count;
}

function getSystemMetrics(): any {
  const memUsage = process.memoryUsage();
  return {
    memory: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    },
    uptime: process.uptime(),
    version: process.version,
    platform: process.platform
  };
}

function getErrorMetrics(): any {
  return {
    total: getErrorCount(),
    rate: getErrorRate(),
    byType: {} // Would categorize errors by type
  };
}

function getNotificationMetrics(channel?: string, type?: string, period?: string): any {
  // Filter metrics based on provided parameters
  return {
    sent: 0,
    failed: 0,
    averageResponseTime: 0,
    successRate: 0
  };
}

export { metricsStore };
export default router;